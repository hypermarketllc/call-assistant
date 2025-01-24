import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fetch } from 'undici';
import * as dotenv from 'dotenv';
import { FormData } from 'formdata-node';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PROXY_PORT || 3004;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? `https://${process.env.DOMAIN}` 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// JustCall API proxy endpoints
app.post('/api/justcall/init', async (req, res) => {
  try {
    const apiKey = process.env.JUSTCALL_API_KEY;
    if (!apiKey) {
      throw new Error('JustCall API key is not configured');
    }

    const webhookUrl = process.env.NODE_ENV === 'production'
      ? `https://${process.env.DOMAIN}/webhook`
      : `http://localhost:${port}/webhook`;

    console.log('Making request to JustCall API...');
    
    const [key, secret] = apiKey.split(':');
    if (!key || !secret) {
      throw new Error('Invalid JustCall API key format');
    }

    const response = await fetch('https://api.justcall.io/v1/calls/init', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...req.body,
        webhook_url: webhookUrl
      })
    });

    console.log('JustCall API response status:', response.status);
    
    // First try to get the response as text
    const responseText = await response.text();
    console.log('JustCall API raw response:', responseText);

    let data;
    try {
      // Then parse it as JSON if possible
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JustCall response as JSON:', e);
      throw new Error('Invalid response from JustCall API');
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to initialize JustCall session');
    }

    res.json(data);
  } catch (error) {
    console.error('JustCall API error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/justcall/end/:sessionId', async (req, res) => {
  try {
    const apiKey = process.env.JUSTCALL_API_KEY;
    if (!apiKey) {
      throw new Error('JustCall API key is not configured');
    }

    const [key, secret] = apiKey.split(':');
    if (!key || !secret) {
      throw new Error('Invalid JustCall API key format');
    }

    console.log('Ending JustCall session:', req.params.sessionId);
    const response = await fetch(`https://api.justcall.io/v1/calls/${req.params.sessionId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('JustCall end session response status:', response.status);
    
    // First try to get the response as text
    const responseText = await response.text();
    console.log('JustCall API raw response:', responseText);

    let data;
    try {
      // Then parse it as JSON if possible
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JustCall response as JSON:', e);
      throw new Error('Invalid response from JustCall API');
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to end JustCall session');
    }

    res.json(data);
  } catch (error) {
    console.error('JustCall API error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
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

    console.log('Making request to OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    console.log('OpenAI API response status:', response.status);
    
    // First try to get the response as text
    const responseText = await response.text();
    console.log('OpenAI API raw response:', responseText);

    let data;
    try {
      // Then parse it as JSON if possible
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      throw new Error('Invalid response from OpenAI API');
    }

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to transcribe audio');
    }

    res.json(data);
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-justcall-signature'];
    const webhookSecret = process.env.JUSTCALL_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      throw new Error('Missing webhook signature or secret');
    }

    // Log webhook event
    console.log('Received webhook:', {
      type: req.body.event_type,
      callId: req.body.call_id,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});