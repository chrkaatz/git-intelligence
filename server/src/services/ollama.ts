import type { OllamaSettings } from '../db/types.js';

/**
 * Test connection to Ollama instance
 * @param settings - Ollama configuration settings
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testConnection(settings: OllamaSettings): Promise<boolean> {
  try {
    const url = `http://${settings.host}:${settings.port}/api/tags`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.timeout || 30000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    // Verify the response is valid JSON (Ollama API returns list of models)
    const data = await response.json();
    return Array.isArray(data.models) || typeof data === 'object';
  } catch (error) {
    if (error instanceof Error) {
      console.error('Ollama connection test failed:', error.message);
    }
    return false;
  }
}

/**
 * Generate a completion using Ollama
 * @param prompt - The prompt to send to the model
 * @param settings - Ollama configuration settings
 * @returns Promise resolving to the generated text response
 * @throws Error if the request fails or model is not available
 */
export async function generateCompletion(
  prompt: string,
  settings: OllamaSettings
): Promise<string> {
  if (!settings.enabled) {
    throw new Error('Ollama is not enabled');
  }

  try {
    const url = `http://${settings.host}:${settings.port}/api/generate`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.timeout || 30000);

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        prompt: prompt,
        stream: false,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Ollama API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If error response is not JSON, use the text
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('Invalid response from Ollama: missing response field');
    }

    return data.response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${settings.timeout || 30000}ms`);
      }
      throw error;
    }
    throw new Error('Unknown error occurred while generating completion');
  }
}

/**
 * Generate AI analysis for a specific analysis type
 * @param context - The analysis context/data to analyze
 * @param analysisType - Type of analysis (e.g., 'codebase-health', 'developer-analytics')
 * @param settings - Ollama configuration settings
 * @returns Promise resolving to the generated analysis text
 * @throws Error if the request fails or model is not available
 */
export async function generateAnalysis(
  context: any,
  analysisType: string,
  settings: OllamaSettings
): Promise<string> {
  if (!settings.enabled) {
    throw new Error('Ollama is not enabled');
  }

  // Create a prompt based on the analysis type
  const prompt = buildAnalysisPrompt(context, analysisType);

  return generateCompletion(prompt, settings);
}

/**
 * Build a prompt for analysis based on type and context
 * @param context - The analysis context/data
 * @param analysisType - Type of analysis
 * @returns Formatted prompt string
 */
function buildAnalysisPrompt(context: any, analysisType: string): string {
  const basePrompt = `You are an expert software engineering analyst. Analyze the following Git repository data and provide actionable insights. Be concise, specific, and focus on practical recommendations.

Analysis Type: ${analysisType}

Data:
${JSON.stringify(context, null, 2)}

Please provide:
1. Key insights and patterns identified
2. Potential issues or risks
3. Actionable recommendations

Format your response as clear, structured text with bullet points where appropriate.`;

  // Add type-specific instructions
  switch (analysisType) {
    case 'codebase-health':
      return `${basePrompt}

Focus on:
- Code quality trends
- Technical debt indicators
- Areas requiring refactoring
- Risk factors`;

    case 'developer-analytics':
      return `${basePrompt}

Focus on:
- Developer activity patterns
- Collaboration effectiveness
- Work distribution
- Potential team health concerns`;

    case 'repository-evolution':
      return `${basePrompt}

Focus on:
- Growth patterns and trends
- Maintenance needs
- Optimal refactoring windows
- Future capacity planning`;

    case 'bus-factor':
      return `${basePrompt}

Focus on:
- Knowledge concentration risks
- Single points of failure
- Mitigation strategies
- Team structure recommendations`;

    case 'social-network':
      return `${basePrompt}

Focus on:
- Collaboration patterns
- Knowledge silos
- Communication gaps
- Team structure insights`;

    default:
      return basePrompt;
  }
}

/**
 * Check if a specific model is available in Ollama
 * @param model - Model name to check
 * @param settings - Ollama configuration settings
 * @returns Promise resolving to true if model is available, false otherwise
 */
export async function isModelAvailable(model: string, settings: OllamaSettings): Promise<boolean> {
  try {
    const url = `http://${settings.host}:${settings.port}/api/tags`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.timeout || 30000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const models = data.models || [];

    return models.some((m: any) => m.name === model || m.name.startsWith(`${model}:`));
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking model availability:', error.message);
    }
    return false;
  }
}
