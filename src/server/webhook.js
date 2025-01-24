import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cluster from 'cluster';
import os from 'os';
import { WebhookHandler } from '../services/webhookHandler.js';

const app = express();
const port = process.env.PORT || 3002;

// Create webhook handler
const webhookHandler = new WebhookHandler(
  (event) => {
    // Handle events here
    console.log('Received event:', event);
  },
  process.env.JUSTCALL_WEBHOOK_SECRET
);

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Logging and Performance Tracking
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`Webhook Request: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
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

// Cluster Management
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  app.listen(port, () => {
    console.log(`Worker ${process.pid} started on port ${port}`);
  });
}