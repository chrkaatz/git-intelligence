import { describe, it, expect } from 'vitest';
import { getRiskColor, getRiskLabel, type RiskLevel } from '../riskUtils';

describe('riskUtils', () => {
  it('returns correct hex color for each risk level', () => {
    expect(getRiskColor('low')).toBe('#10b981'); // green
    expect(getRiskColor('medium')).toBe('#f59e0b'); // yellow
    expect(getRiskColor('high')).toBe('#ef4444'); // red
  });

  it('returns gray color for unknown risk levels (type-safety fallback)', () => {
    // Cast through unknown to avoid any while simulating bad runtime data
    expect(getRiskColor('unknown' as unknown as RiskLevel)).toBe('#6b7280');
  });

  it('returns correct label for each risk level', () => {
    expect(getRiskLabel('low')).toBe('Low Risk');
    expect(getRiskLabel('medium')).toBe('Medium Risk');
    expect(getRiskLabel('high')).toBe('High Risk');
  });

  it('returns "Unknown" label for unexpected values', () => {
    expect(getRiskLabel('unknown' as unknown as RiskLevel)).toBe('Unknown');
  });
});
