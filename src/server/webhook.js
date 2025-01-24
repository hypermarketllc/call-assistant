import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;
const wsPort = process.env.WS_PORT || 3003;

// WebSocket server for real-time updates
const wss = new WebSocketServer({ port: wsPort });
const clients = new Set();

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
  const eventData = JSON.stringify(event);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(eventData);
    }
  });
}

app.use(bodyParser.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? `https://${process.env.DOMAIN}`
    : 'http://localhost:3000',
  credentials: true
}));

// Verify JustCall webhook signature
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === calculatedSignature;
}

// Webhook endpoint for JustCall events
app.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-justcall-signature'];
    const webhookSecret = process.env.JUSTCALL_WEBHOOK_SECRET;

    // Verify webhook signature
    if (!signature || !webhookSecret || !verifySignature(req.body, signature, webhookSecret)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing data in webhook payload' });
    }

    console.log('Received webhook event:', {
      type: data.type,
      callId: data.call_sid,
      timestamp: data.datetime
    });

    // Process different event types
    switch (data.type) {
      case 'call_incoming':
        // New incoming call
        console.log(`Incoming call from ${data.contact_number} to ${data.justcall_number}`);
        broadcastEvent({
          type: 'call.incoming',
          callId: data.call_sid,
          justcallNumber: data.justcall_number,
          contactName: data.contact_name,
          contactNumber: data.contact_number,
          isContact: data.is_contact === 1,
          timestamp: data.datetime
        });
        break;

      case 'call_initiated':
        // Call was initiated (outbound)
        console.log(`Call initiated to ${data.contact_number} from ${data.justcall_number}`);
        broadcastEvent({
          type: 'call.initiated',
          callId: data.call_sid,
          justcallNumber: data.justcall_number,
          contactName: data.contact_name,
          contactNumber: data.contact_number,
          isContact: data.is_contact === 1,
          agentName: data.agent_name,
          agentId: data.agent_id,
          timestamp: data.datetime
        });
        break;

      case 'call_answered':
        // Call was answered
        console.log(`Call answered by ${data.agent_name}`);
        broadcastEvent({
          type: 'call.answered',
          callId: data.call_sid,
          justcallNumber: data.justcall_number,
          contactName: data.contact_name,
          contactNumber: data.contact_number,
          isContact: data.is_contact === 1,
          agentName: data.agent_name,
          agentId: data.agent_id,
          timestamp: data.datetime
        });
        break;

      case 'call':
        // Call completed
        console.log(`Call completed: ${data.call_sid}, Duration: ${data.call_duration}`);
        broadcastEvent({
          type: 'call.completed',
          callId: data.call_sid,
          subject: data.subject,
          description: data.description,
          direction: parseInt(data.direction),
          calledVia: data.called_via,
          contactName: data.contact_name,
          contactNumber: data.contact_number,
          contactEmail: data.contact_email,
          recordingUrl: data.recording_url,
          callStatus: data.call_status,
          callDuration: data.call_duration,
          callDurationSec: data.call_duration_sec,
          isContact: data.is_contact === 1,
          forwardedNumber: data.forwarded_number,
          agentName: data.agent_name,
          agentId: data.agent_id,
          recordingMp3: data.recordingmp3,
          callInfo: data.callinfo,
          ivr: data.ivr,
          missedCallType: data.missed_call_type,
          metadata: data.metadata,
          timestamp: data.datetime
        });
        break;

      case 'call_updated':
        // Call was updated (notes, disposition codes)
        console.log(`Call updated: ${data.call_id}`);
        broadcastEvent({
          type: 'call.updated',
          callId: data.call_id,
          subject: data.subject,
          description: data.description,
          direction: parseInt(data.direction),
          calledVia: data.called_via,
          contactName: data.contact_name,
          contactNumber: data.contact_number,
          contactEmail: data.contact_email,
          recordingUrl: data.recording_url,
          callStatus: data.call_status,
          callDuration: data.call_duration,
          callDurationSec: data.call_duration_sec,
          isContact: data.is_contact === 1,
          rating: data.rating,
          notes: data.notes,
          dispositionCode: data.disposition_code,
          agentName: data.agent_name,
          agentId: data.agent_id,
          recordingMp3: data.recordingmp3,
          callInfo: data.callinfo,
          ivr: data.ivr,
          missedCallType: data.missed_call_type,
          metadata: data.metadata,
          timestamp: data.datetime
        });
        break;
    }

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

app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
  console.log(`WebSocket server running on port ${wsPort}`);
});