export type RiskLevel = 'low' | 'medium' | 'high';

export const getRiskColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case 'high':
      return '#ef4444'; // red
    case 'medium':
      return '#f59e0b'; // yellow
    case 'low':
      return '#10b981'; // green
    default:
      return '#6b7280'; // gray
  }
};

export const getRiskLabel = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Unknown';
  }
};
