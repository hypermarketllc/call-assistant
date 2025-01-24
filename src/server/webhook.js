import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { WebhookHandler } from '../services/webhookHandler.js';

const app = express();
const port = process.env.PORT || 3002;

// Create webhook handler
const webhookHandler = new WebhookHandler(
  (event) => {
    // Broadcast event to connected clients
    console.log('Broadcasting event to clients:', event.event_type);
  },
  process.env.JUSTCALL_WEBHOOK_SECRET
);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Webhook endpoint
app.post('/webhook', (req, res) => {
  try {
    console.log('Received webhook:', {
      type: req.body.event_type,
      callId: req.body.call_id
    });

    const signature = req.headers['x-justcall-signature'];
    const payload = JSON.stringify(req.body);
    
    webhookHandler.handleWebhook(req.body, payload, signature);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ status: 'error', message: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
  console.log(`Webhook URL: https://acc-projects.com/webhook`);
});