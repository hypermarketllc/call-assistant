import express from 'express';
import { WebhookHandler } from '../services/webhookHandler.js';

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Create webhook handler
const webhookHandler = new WebhookHandler(
  (event) => {
    // Handle events here
    console.log('Received event:', event);
  },
  process.env.JUSTCALL_WEBHOOK_SECRET
);

// Webhook endpoint
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-justcall-signature'];
    const payload = JSON.stringify(req.body);
    
    webhookHandler.handleWebhook(req.body, payload, signature);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
});