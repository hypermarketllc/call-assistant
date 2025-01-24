import { z } from 'zod';

export interface GradingConfig {
  // No configuration needed for local storage
}

const configSchema = z.object({});

export const defaultGradingConfig: GradingConfig = {};

export const validateGradingConfig = (_config: GradingConfig): string | null => {
  return null; // No validation needed for local storage
};