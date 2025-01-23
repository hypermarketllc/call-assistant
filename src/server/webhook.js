import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cluster from 'cluster';
import os from 'os';

const app = express();
const port = process.env.PORT || 3002;

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

// Webhook Handler
app.post('/webhook', async (req, res) => {
  try {
    // Your webhook logic here
    const data = req.body;
    // Process the webhook data
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
