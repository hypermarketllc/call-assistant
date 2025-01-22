import { GoogleSpreadsheet } from 'google-spreadsheet';
import type { CallGrade, GradeAnalysis } from '../types/grading';
import type { GradingConfig } from '../config/gradingConfig';

export class GradingService {
  private doc: GoogleSpreadsheet;
  private initialized: boolean = false;
  
  constructor(private config: GradingConfig) {
    this.doc = new GoogleSpreadsheet(config.spreadsheetId);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.doc.useServiceAccountAuth({
        client_email: this.config.clientEmail,
        private_key: this.config.privateKey,
      });
      await this.doc.loadInfo();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize grading service:', error);
      throw new Error('Failed to initialize grading service. Please check your credentials.');
    }
  }

  async analyzeCall(transcript: string, script: string, objections: Record<string, any>): Promise<GradeAnalysis> {
    const toneScore = this.analyzeTone(transcript);
    const scriptScore = this.calculateScriptAdherence(transcript, script);
    const presentationScore = this.analyzePresentationQuality(transcript);
    const objectionScore = this.evaluateObjectionHandling(transcript, objections);
    const speakingScore = this.analyzeSpeakingQuality(transcript);
    
    const overallScore = Math.round(
      (toneScore + scriptScore + presentationScore + objectionScore + speakingScore) / 5
    );

    const notes = this.generatePerformanceNotes({
      tone: toneScore,
      script: scriptScore,
      presentation: presentationScore,
      objection: objectionScore,
      speaking: speakingScore,
      overall: overallScore
    });

    return {
      grades: {
        tone: toneScore,
        onScript: scriptScore,
        presentation: presentationScore,
        objectionHandling: objectionScore,
        speaking: speakingScore,
        overall: overallScore
      },
      notes
    };
  }

  private analyzeTone(transcript: string): number {
    const positiveKeywords = ['great', 'happy', 'help', 'understand', 'thank', 'appreciate'];
    const negativeKeywords = ['unfortunately', 'sorry', 'cannot', 'problem', 'difficult'];
    
    let score = 7;
    
    positiveKeywords.forEach(word => {
      if (transcript.toLowerCase().includes(word)) score += 0.5;
    });
    
    negativeKeywords.forEach(word => {
      if (transcript.toLowerCase().includes(word)) score -= 0.5;
    });
    
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  private calculateScriptAdherence(transcript: string, script: string): number {
    const scriptKeyPoints = script
      .toLowerCase()
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/[\[\]]/g, '').trim());
    
    let matchedPoints = 0;
    scriptKeyPoints.forEach(point => {
      if (transcript.toLowerCase().includes(point)) {
        matchedPoints++;
      }
    });
    
    return Math.min(Math.max(Math.round((matchedPoints / scriptKeyPoints.length) * 10), 1), 10);
  }

  private analyzePresentationQuality(transcript: string): number {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'sort of'];
    const professionalPhrases = ['would you be interested', 'I can help', 'let me explain', 'thank you'];
    
    let score = 7;
    
    fillerWords.forEach(word => {
      const count = (transcript.toLowerCase().match(new RegExp(word, 'g')) || []).length;
      score -= count * 0.2;
    });
    
    professionalPhrases.forEach(phrase => {
      if (transcript.toLowerCase().includes(phrase)) score += 0.5;
    });
    
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  private evaluateObjectionHandling(transcript: string, objections: Record<string, any>): number {
    let score = 7;
    
    Object.entries(objections).forEach(([category, objectionList]: [string, any]) => {
      Object.entries(objectionList).forEach(([objection, responses]: [string, string[]]) => {
        if (transcript.toLowerCase().includes(objection.toLowerCase())) {
          responses.forEach(response => {
            if (transcript.toLowerCase().includes(response.toLowerCase())) {
              score += 1;
            }
          });
        }
      });
    });
    
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  private analyzeSpeakingQuality(transcript: string): number {
    const words = transcript.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    let score = 7;
    
    if (avgWordLength < 3 || avgWordLength > 8) score -= 1;
    
    const sentences = transcript.split(/[.!?]+/);
    const avgSentenceLength = sentences.reduce((sum, sent) => sum + sent.split(' ').length, 0) / sentences.length;
    
    if (avgSentenceLength > 5 && avgSentenceLength < 20) score += 1;
    
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  private generatePerformanceNotes(scores: {
    tone: number;
    script: number;
    presentation: number;
    objection: number;
    speaking: number;
    overall: number;
  }): string {
    const notes: string[] = [];
    
    if (scores.tone < 7) notes.push('Consider maintaining a more positive tone throughout the call.');
    if (scores.script < 7) notes.push('Try to follow the script more closely while keeping conversation natural.');
    if (scores.presentation < 7) notes.push('Work on reducing filler words and maintaining professional language.');
    if (scores.objection < 7) notes.push('Review objection handling techniques and practice standard responses.');
    if (scores.speaking < 7) notes.push('Focus on clear articulation and appropriate pacing.');
    
    if (scores.overall >= 8) {
      notes.unshift('Outstanding performance! Excellent work across all metrics.');
    } else if (scores.overall >= 6) {
      notes.unshift('Good performance with room for improvement in specific areas.');
    } else {
      notes.unshift('Additional training and practice recommended to improve overall performance.');
    }
    
    return notes.join('\n');
  }

  async recordGrade(grade: CallGrade) {
    if (!this.initialized) {
      throw new Error('Grading service not initialized');
    }

    try {
      const sheet = this.doc.sheetsByIndex[0] || await this.doc.addSheet({
        headerValues: [
          'Agent Name',
          'Timestamp',
          'Call Type',
          'Duration',
          'Tone',
          'On Script',
          'Presentation',
          'Objection Handling',
          'Speaking',
          'Overall Rating',
          'Notes',
          'Transcription'
        ]
      });

      await sheet.addRow({
        'Agent Name': grade.agentName,
        'Timestamp': grade.timestamp,
        'Call Type': grade.callType,
        'Duration': grade.duration,
        'Tone': grade.grades.tone,
        'On Script': grade.grades.onScript,
        'Presentation': grade.grades.presentation,
        'Objection Handling': grade.grades.objectionHandling,
        'Speaking': grade.grades.speaking,
        'Overall Rating': grade.grades.overall,
        'Notes': grade.notes,
        'Transcription': grade.transcription
      });
    } catch (error) {
      console.error('Failed to record grade:', error);
      throw new Error('Failed to record grade in spreadsheet');
    }
  }
}