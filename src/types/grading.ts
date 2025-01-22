export interface CallGrade {
  agentName: string;
  timestamp: string;
  callType: string;
  duration: string;
  grades: {
    tone: number;
    onScript: number;
    presentation: number;
    objectionHandling: number;
    speaking: number;
    overall: number;
  };
  notes: string;
  transcription: string;
}

export interface GradeAnalysis {
  grades: CallGrade['grades'];
  notes: string;
}