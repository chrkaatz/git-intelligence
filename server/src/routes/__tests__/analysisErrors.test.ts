import { describe, expect, it } from 'vitest';
import { classifyAnalysisStepError } from '../analysisErrors';

describe('classifyAnalysisStepError', () => {
  it('classifies timeout errors', () => {
    const result = classifyAnalysisStepError(new Error('Statistics (repo) timed out after 180s'));
    expect(result).toContain('timed out');
    expect(result).toContain('Analysis step timed out');
  });

  it('classifies resource exhaustion errors', () => {
    const result = classifyAnalysisStepError(new Error('Map maximum size exceeded'));
    expect(result).toContain('Resource limit exceeded');
  });

  it('falls back to error message for unknown failures', () => {
    const result = classifyAnalysisStepError(new Error('Unexpected failure'));
    expect(result).toBe('Unexpected failure');
  });
});
