export type JustCallEventType =
  | 'call.initiated'
  | 'call.answered'
  | 'call.completed'
  | 'call.missed'
  | 'call.ai_report'
  | 'queue.entered'
  | 'queue.exited';

export interface JustCallAIReport {
  summary: string;
  sentiment: string;
  action_items: string[];
  topics: string[];
  compliance_score?: number;
  talk_ratio?: {
    agent: number;
    customer: number;
  };
}

export interface JustCallEvent {
  event_type: JustCallEventType;
  call_id: string;
  session_id: string;
  agent_number: string;
  customer_number: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'answered' | 'completed' | 'missed';
  duration: number;
  recording_url?: string;
  voicemail_url?: string;
  queue_name?: string;
  ai_report?: JustCallAIReport;
  timestamp: string;
  signature?: string;
}