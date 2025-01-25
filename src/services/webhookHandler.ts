import type { JustCallEvent } from '../types/justcall';
import crypto from 'crypto';

export class WebhookHandler {
  private eventListeners: ((event: JustCallEvent) => void)[] = [];

  constructor(
    private onEventCallback: (event: JustCallEvent) => void,
    private webhookSecret: string
  ) {
    this.eventListeners.push(onEventCallback);
  }

  public addEventListener(callback: (event: JustCallEvent) => void) {
    this.eventListeners.push(callback);
  }

  private verifySignature(signature: string, payload: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    return signature === calculatedSignature;
  }

  public handleWebhook(event: JustCallEvent, rawPayload: string, signature?: string) {
    console.log('Received webhook event:', {
      type: event.type,
      callId: event.callId,
      timestamp: event.timestamp
    });

    // Verify webhook signature if provided
    if (signature && !this.verifySignature(signature, rawPayload, this.webhookSecret)) {
      console.error('Invalid webhook signature');
      return;
    }

    // Notify all listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in webhook listener:', error);
      }
    });

    // Process the event
    switch (event.type) {
      case 'call.initiated':
        this.handleCallStart(event);
        break;
        
      case 'call.answered':
        this.handleCallAnswer(event);
        break;
        
      case 'call.completed':
        this.handleCallEnd(event);
        break;
        
      case 'call.incoming':
        this.handleIncomingCall(event);
        break;
        
      case 'call.updated':
        this.handleCallUpdate(event);
        break;
    }
  }

  private handleCallStart(event: JustCallEvent) {
    console.log(`Call initiated: ${event.callId}`);
    
    // Update UI with call status
    this.notifyListeners({
      ...event,
      type: 'call.initiated'
    });
  }

  private handleCallAnswer(event: JustCallEvent) {
    console.log(`Call answered: ${event.callId}`);
    
    // Start recording and transcription
    this.notifyListeners({
      ...event,
      type: 'call.answered'
    });
  }

  private handleCallEnd(event: JustCallEvent) {
    console.log(`Call completed: ${event.callId}, Duration: ${event.callDuration}`);
    
    // Process recording if available
    if (event.recordingUrl) {
      console.log(`Recording available at: ${event.recordingUrl}`);
    }

    // Update UI with final call status and duration
    this.notifyListeners({
      ...event,
      type: 'call.completed'
    });
  }

  private handleIncomingCall(event: JustCallEvent) {
    console.log(`Incoming call from ${event.contactNumber}`);
    
    this.notifyListeners({
      ...event,
      type: 'call.incoming'
    });
  }

  private handleCallUpdate(event: JustCallEvent) {
    console.log(`Call updated: ${event.callId}`);
    
    // Update call metrics and analysis in the UI
    this.notifyListeners({
      ...event,
      type: 'call.updated'
    });
  }

  private notifyListeners(event: JustCallEvent) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}