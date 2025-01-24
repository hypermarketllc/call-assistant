import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';

const app = express();
const port = process.env.PORT || 3002;

// Create WebSocket server
const wss = new WebSocketServer({ port: 3003 });

// Store connected clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast event to all connected clients
function broadcastEvent(event) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://acc-projects.com'
    : 'http://localhost:3000'
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Verify JustCall webhook signature
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === calculatedSignature;
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-justcall-signature'];
    const webhookSecret = process.env.JUSTCALL_WEBHOOK_SECRET;

    // Verify webhook signature
    if (!signature || !webhookSecret || !verifySignature(req.body, signature, webhookSecret)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Received webhook event:', {
      type: event.event_type,
      callId: event.call_id,
      timestamp: new Date().toISOString()
    });

    // Process different event types
    switch (event.event_type) {
      case 'call.initiated':
        console.log(`Call initiated: ${event.call_id}`);
        break;

      case 'call.answered':
        console.log(`Call answered: ${event.call_id}`);
        break;

      case 'call.completed':
        console.log(`Call completed: ${event.call_id}, Duration: ${event.duration}s`);
        if (event.recording_url) {
          console.log(`Recording available at: ${event.recording_url}`);
        }
        break;

      case 'call.missed':
        console.log(`Missed call: ${event.call_id}`);
        if (event.voicemail_url) {
          console.log(`Voicemail available at: ${event.voicemail_url}`);
        }
        break;

      case 'call.ai_report':
        if (event.ai_report) {
          console.log('AI Report received:', {
            summary: event.ai_report.summary,
            sentiment: event.ai_report.sentiment,
            actionItems: event.ai_report.action_items,
            topics: event.ai_report.topics
          });
        }
        break;
    }

    // Broadcast event to connected clients
    broadcastEvent(event);

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
  console.log(`WebSocket server running on port 3003`);
});