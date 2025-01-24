import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { FormData } from 'formdata-node';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// JustCall API proxy endpoints
app.post('/api/justcall/init', async (req, res) => {
  try {
    console.log('Initializing JustCall session...');
    
    const apiKey = process.env.JUSTCALL_API_KEY;
    if (!apiKey) {
      throw new Error('JustCall API key is not configured');
    }

    const response = await fetch('https://api.justcall.io/v1/calls/init', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...req.body,
        webhook_url: process.env.WEBHOOK_URL
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize JustCall session');
    }

    const data = await response.json();
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

    const response = await fetch(`https://api.justcall.io/v1/calls/${req.params.sessionId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to end JustCall session');
    }

    const data = await response.json();
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

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to transcribe audio');
    }

    const data = await response.json();
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
  console.log(`Server running on port ${port}`);
});