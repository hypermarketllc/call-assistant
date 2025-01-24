import type { JustCallEvent, JustCallEventType } from '../types/justcall';
import crypto from 'crypto';

export class WebhookHandler {
  private verifySignature(signature: string, payload: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    return signature === calculatedSignature;
  }

  constructor(
    private onEventCallback: (event: JustCallEvent) => void,
    private webhookSecret: string
  ) {}

  handleWebhook(event: JustCallEvent, rawPayload: string, signature?: string) {
    // Verify webhook signature if provided
    if (signature && !this.verifySignature(signature, rawPayload, this.webhookSecret)) {
      console.error('Invalid webhook signature');
      return;
    }

    // Process the event
    switch (event.event_type) {
      case 'call.initiated':
        this.handleCallStart(event);
        break;
        
      case 'call.answered':
        this.handleCallAnswer(event);
        break;
        
      case 'call.completed':
        this.handleCallEnd(event);
        break;
        
      case 'call.missed':
        this.handleMissedCall(event);
        break;
        
      case 'call.ai_report':
        this.handleAIReport(event);
        break;
        
      case 'queue.entered':
      case 'queue.exited':
        this.handleQueueEvent(event);
        break;
    }

    // Forward the event to the callback
    this.onEventCallback(event);
  }

  private handleCallStart(event: JustCallEvent) {
    console.log(`Call initiated: ${event.call_id}`);
    
    // Update UI with call status
    this.onEventCallback({
      ...event,
      status: 'ringing'
    });
  }

  private handleCallAnswer(event: JustCallEvent) {
    console.log(`Call answered: ${event.call_id}`);
    
    // Start recording and transcription
    this.onEventCallback({
      ...event,
      status: 'answered'
    });
  }

  private handleCallEnd(event: JustCallEvent) {
    console.log(`Call completed: ${event.call_id}, Duration: ${event.duration}s`);
    
    // Process recording if available
    if (event.recording_url) {
      console.log(`Recording available at: ${event.recording_url}`);
    }

    // Update UI with final call status and duration
    this.onEventCallback({
      ...event,
      status: 'completed'
    });
  }

  private handleMissedCall(event: JustCallEvent) {
    console.log(`Missed call: ${event.call_id}`);
    
    if (event.voicemail_url) {
      console.log(`Voicemail available at: ${event.voicemail_url}`);
    }

    this.onEventCallback({
      ...event,
      status: 'missed'
    });
  }

  private handleAIReport(event: JustCallEvent) {
    if (event.ai_report) {
      console.log('AI Report received:', {
        summary: event.ai_report.summary,
        sentiment: event.ai_report.sentiment,
        actionItems: event.ai_report.action_items,
        topics: event.ai_report.topics,
        complianceScore: event.ai_report.compliance_score,
        talkRatio: event.ai_report.talk_ratio
      });

      // Update call metrics and analysis in the UI
      this.onEventCallback(event);
    }
  }

  private handleQueueEvent(event: JustCallEvent) {
    const action = event.event_type === 'queue.entered' ? 'entered' : 'exited';
    console.log(`Call ${event.call_id} ${action} queue: ${event.queue_name}`);
    
    // Update queue status in UI
    this.onEventCallback(event);
  }
}