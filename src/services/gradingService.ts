import type { CallGrade, GradeAnalysis } from '../types/grading';
import type { GradingConfig } from '../config/gradingConfig';

export class GradingService {
  private initialized: boolean = false;
  private grades: CallGrade[] = [];
  
  constructor(private config: GradingConfig) {}

  async initialize() {
    // Load saved grades from localStorage
    try {
      const savedGrades = localStorage.getItem('callGrades');
      if (savedGrades) {
        this.grades = JSON.parse(savedGrades);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load saved grades:', error);
      // Still mark as initialized since we can work without previous grades
      this.initialized = true;
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
    let objectionCount = 0;
    
    Object.entries(objections).forEach(([category, objectionList]) => {
      Object.entries(objectionList).forEach(([objection, responses]) => {
        if (transcript.toLowerCase().includes(objection.toLowerCase())) {
          objectionCount++;
          (responses as string[]).forEach(response => {
            if (transcript.toLowerCase().includes(response.toLowerCase())) {
              score += 1;
            }
          });
        }
      });
    });
    
    if (objectionCount === 0) return 7; // Default score if no objections were handled
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
      // Store grade in memory
      this.grades.push(grade);
      
      // Save to localStorage
      localStorage.setItem('callGrades', JSON.stringify(this.grades));
      
      console.log('Grade recorded:', {
        agentName: grade.agentName,
        timestamp: grade.timestamp,
        callType: grade.callType,
        duration: grade.duration,
        grades: grade.grades,
        notes: grade.notes
      });
      
      return true;
    } catch (error) {
      console.error('Failed to record grade:', error);
      throw new Error('Failed to record grade');
    }
  }
}