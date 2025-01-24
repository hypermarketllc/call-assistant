// Simple config interface for grading service
export interface GradingConfig {
  // No configuration needed for local storage
}

export const defaultGradingConfig: GradingConfig = {};

export const validateGradingConfig = (_config: GradingConfig): string | null => {
  return null; // No validation needed for local storage
};