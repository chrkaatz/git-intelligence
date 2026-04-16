const TIMEOUT_PATTERN = /timed out after/i;
const RESOURCE_LIMIT_PATTERNS = [
  /map maximum size exceeded/i,
  /heap out of memory/i,
  /allocation failed/i,
  /ineffective mark-compacts/i,
];

export function classifyAnalysisStepError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

  if (TIMEOUT_PATTERN.test(message)) {
    return `Analysis step timed out: ${message}`;
  }

  if (RESOURCE_LIMIT_PATTERNS.some((pattern) => pattern.test(message))) {
    return `Resource limit exceeded during analysis: ${message}`;
  }

  return message;
}
