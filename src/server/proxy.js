import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fetch } from 'undici';
import * as dotenv from 'dotenv';
import { FormData } from 'formdata-node';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PROXY_PORT || 3004;

// Rate limiting configuration
const rateLimits = {
  justcall: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  openai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50
  }
};

const requestCounts = {
  justcall: new Map(),
  openai: new Map()
};

// Rate limiting middleware
const rateLimit = (service) => (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - rateLimits[service].windowMs;
  
  // Clean up old entries
  for (const [key, timestamp] of requestCounts[service].entries()) {
    if (timestamp < windowStart) {
      requestCounts[service].delete(key);
    }
  }
  
  // Count requests in current window
  const requestsInWindow = Array.from(requestCounts[service].values())
    .filter(timestamp => timestamp > windowStart)
    .length;
  
  if (requestsInWindow >= rateLimits[service].maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((windowStart + rateLimits[service].windowMs - now) / 1000)
    });
  }
  
  requestCounts[service].set(ip, now);
  next();
};

// Graceful shutdown handler
let server;
const shutdown = () => {
  console.log('Shutting down proxy server...');
  if (server) {
    server.close(() => {
      console.log('Proxy server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? `https://${process.env.DOMAIN}` 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Logging middleware with request ID
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  console.log(`[${req.id}] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Helper function to handle JustCall API requests
async function makeJustCallRequest(endpoint, method = 'GET', body = null) {
  const apiKey = process.env.JUSTCALL_API_KEY;
  if (!apiKey) {
    throw new Error('JustCall API key is not configured');
  }

  const [key, secret] = apiKey.split(':');
  if (!key || !secret) {
    throw new Error('Invalid JustCall API key format');
  }

  const baseUrl = 'https://api.justcall.io/v1';
  const url = `${baseUrl}${endpoint}`;

  console.log('JustCall API Request:', {
    url,
    method,
    headers: {
      'Authorization': 'Basic [REDACTED]',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const responseText = await response.text();
    console.log('JustCall API Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: responseText
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JustCall response:', responseText);
      throw new Error('Invalid JSON response from JustCall API');
    }

    if (!response.ok) {
      const errorMessage = data.error || data.message || 'JustCall API request failed';
      console.error('JustCall API error:', {
        status: response.status,
        error: errorMessage,
        data
      });
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('JustCall API request failed:', error);
    throw error;
  }
}

// JustCall API proxy endpoints
app.get('/api/justcall/init', rateLimit('justcall'), async (req, res) => {
  try {
    const webhookUrl = process.env.NODE_ENV === 'production'
      ? `https://${process.env.DOMAIN}/webhook`
      : `http://localhost:${process.env.PORT}/webhook`;

    const data = await makeJustCallRequest('/calls/init', 'GET');

    res.json(data);
  } catch (error) {
    console.error(`[${req.id}] JustCall initialization error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/justcall/calls/:callId', rateLimit('justcall'), async (req, res) => {
  try {
    const data = await makeJustCallRequest(`/calls/${req.params.callId}`, 'GET');
    res.json(data);
  } catch (error) {
    console.error(`[${req.id}] JustCall get call error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/justcall/end/:sessionId', rateLimit('justcall'), async (req, res) => {
  try {
    const data = await makeJustCallRequest(`/calls/${req.params.sessionId}/end`, 'POST');
    res.json(data);
  } catch (error) {
    console.error(`[${req.id}] JustCall end session error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transcribe', rateLimit('openai'), async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }

    if (!req.body.audio) {
      throw new Error('No audio data provided');
    }

    const audioBuffer = Buffer.from(req.body.audio, 'base64');
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid JSON response from OpenAI API');
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Transcription failed';
      console.error('OpenAI API error:', {
        status: response.status,
        error: errorMessage,
        data
      });
      throw new Error(errorMessage);
    }

    res.json(data);
  } catch (error) {
    console.error(`[${req.id}] Transcription error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Server error:`, err);
  res.status(500).json({ error: err.message });
});

// Start server
server = app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});