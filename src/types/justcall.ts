export type JustCallEventType =
  | 'call.incoming'
  | 'call.initiated'
  | 'call.answered'
  | 'call.completed'
  | 'call.updated';

export interface JustCallForwardedNumber {
  number: string;
  reason: string;
  reason_code: number;
}

export interface JustCallIVR {
  digit: string;
  digit_description: string;
}

export interface JustCallMetadata {
  [key: string]: any;
}

export interface JustCallEvent {
  type: JustCallEventType;
  callId: string;
  justcallNumber?: string;
  contactName?: string;
  contactNumber?: string;
  contactEmail?: string;
  isContact?: boolean;
  agentName?: string;
  agentId?: number;
  subject?: string;
  description?: string;
  direction?: number;
  calledVia?: string;
  recordingUrl?: string;
  callStatus?: string;
  callDuration?: string;
  callDurationSec?: number;
  forwardedNumber?: JustCallForwardedNumber;
  recordingMp3?: string;
  callInfo?: string;
  ivr?: JustCallIVR;
  missedCallType?: string;
  metadata?: JustCallMetadata;
  rating?: number;
  notes?: string;
  dispositionCode?: string;
  timestamp: string;
}