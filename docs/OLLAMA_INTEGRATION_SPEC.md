# Ollama Integration Feature Specification

## Overview

This document outlines the specification for integrating a local Ollama instance into Git Intelligence to enable AI-powered analysis scenarios. This feature will allow users to configure and use their local Ollama installation for enhanced repository insights.

## Goals

- Enable users to toggle AI-powered analysis features on/off
- Allow configuration of Ollama connection settings (host, port, model)
- Provide AI-enhanced insights for repository analytics
- Maintain privacy by using local AI models (no data sent to external services)

## Architecture

### Frontend

- **Settings UI**: Extend existing `SettingsDialog` component with Ollama configuration section
- **State Management**: Store settings in localStorage (similar to `useLastSelectedRepository` hook pattern)
- **API Integration**: Add API functions to get/set Ollama settings and test connection

### Backend

- **Settings Storage**: Store Ollama configuration in database schema (extend `DatabaseSchema`)
- **Ollama Client**: Create service module to interact with Ollama API
- **API Endpoints**: Add routes for settings management and Ollama operations
- **Analysis Integration**: Create AI analysis modules that leverage Ollama for enhanced insights

## Tasks

### Phase 1: Backend Infrastructure

- [x] **Task 1.1**: Extend database schema to include Ollama settings
  - Add `ollamaSettings` field to `DatabaseSchema` interface in `server/src/db/types.ts`
  - Create `OllamaSettings` interface with fields: `enabled`, `host`, `port`, `model`
  - Update `defaultData` in `server/src/db/database.ts` to include default Ollama settings
  - Create migration function `migrateToSchemaV5` to add Ollama settings to existing databases

- [x] **Task 1.2**: Create Ollama service module
  - Create `server/src/services/ollama.ts` with functions:
    - `testConnection(settings: OllamaSettings): Promise<boolean>` - Test Ollama connection
    - `generateCompletion(prompt: string, settings: OllamaSettings): Promise<string>` - Generate AI response
    - `generateAnalysis(context: any, analysisType: string, settings: OllamaSettings): Promise<string>` - Generate analysis
  - Use `fetch` or `axios` to interact with Ollama API (default: `http://localhost:11434`)
  - Handle errors gracefully (connection failures, model not found, etc.)

- [x] **Task 1.3**: Create settings API endpoints
  - Create `server/src/routes/settings.ts` router
  - Add `GET /settings/ollama` - Get current Ollama settings
  - Add `PUT /settings/ollama` - Update Ollama settings (with validation)
  - Add `POST /settings/ollama/test` - Test Ollama connection
  - Register router in `server/src/index.ts`

- [x] **Task 1.4**: Add settings database operations
  - Create `server/src/db/settings.ts` with functions:
    - `getOllamaSettings(): Promise<OllamaSettings>`
    - `updateOllamaSettings(settings: Partial<OllamaSettings>): Promise<OllamaSettings>`
  - Use existing database instance from `database.ts`

### Phase 2: Frontend Infrastructure

- [x] **Task 2.1**: Create Ollama settings hook
  - Create `client/src/hooks/useOllamaSettings.ts`
  - Implement localStorage persistence (similar to `useLastSelectedRepository`)
  - Provide functions: `getSettings()`, `updateSettings()`, `resetSettings()`
  - Sync with backend API on mount and when settings change

- [x] **Task 2.2**: Add API functions for Ollama settings
  - Add to `client/src/api.ts`:
    - `getOllamaSettings(): Promise<OllamaSettings>`
    - `updateOllamaSettings(settings: Partial<OllamaSettings>): Promise<OllamaSettings>`
    - `testOllamaConnection(settings: OllamaSettings): Promise<{ success: boolean; message?: string }>`
  - Define `OllamaSettings` interface matching backend

- [x] **Task 2.3**: Extend SettingsDialog component
  - Add new "AI Analysis (Ollama)" section to `SettingsDialog.tsx`
  - Example settings UI:

  ![Ollama Settings Example](ollama-settings.png)
  - Include toggle switch for enabling/disabling Ollama
  - Add input fields for:
    - Host (default: `localhost`)
    - Port (default: `11434`)
    - Model (text input with suggestions, e.g., `llama3`, `mistral`, `codellama`, `ministral-3:8b`, `deepseek-r1`, `mistral-small3.2`, `qwen3`)
  - Add "Test Connection" button with loading state
  - Show connection status (connected/disconnected/error)
  - Display validation errors for invalid inputs

- [x] **Task 2.4**: Create Ollama settings context (optional enhancement)
  - Create `client/src/context/OllamaContext.tsx` if settings need to be accessed globally
  - Provide settings state and update functions via React Context
  - Alternatively, use the hook directly in components that need it

### Phase 3: AI Analysis Integration

- [x] **Task 3.1**: Create AI analysis service
  - Create `server/src/services/aiAnalysis.ts`
  - Implement prompt templates for different analysis types:
    - Code quality insights
    - Commit message analysis
    - Contributor behavior patterns
    - Technical debt identification
    - Risk assessment
  - Create function `generateInsights(analysisType: string, data: any, settings: OllamaSettings): Promise<string>`

- [x] **Task 3.2**: Integrate AI analysis into existing analytics
  - Add optional AI insights to:
    - Developer Analytics (`server/src/git/developerAnalytics.ts`)
    - Codebase Health (`server/src/git/codebaseHealth.ts`)
    - Repository Evolution (`server/src/git/repositoryEvolution.ts`)
    - Bus Factor (`server/src/git/busFactor.ts`)
  - Add `includeAIInsights?: boolean` parameter to analysis functions
  - Only generate AI insights if Ollama is enabled and connection is available

- [x] **Task 3.3**: Create AI insights API endpoints
  - Add optional `?ai=true` query parameter to existing analytics endpoints
  - Or create dedicated endpoints:
    - `GET /ai-insights/developer-analytics?path=<repo-path>`
    - `GET /ai-insights/codebase-health?path=<repo-path>`
    - etc.
  - Return structured insights alongside regular analytics

- [x] **Task 3.4**: Add AI insights UI components
  - Create `client/src/components/AIInsightsPanel.tsx` component
  - Display AI-generated insights in expandable/collapsible sections
  - Show loading state while generating insights
  - Handle errors gracefully (show fallback message if AI unavailable)
  - Integrate into existing analytics views (Dashboard, Developer Analytics, etc.)

### Phase 4: Testing & Documentation

- [x] **Task 4.1**: Write backend tests
  - Test Ollama service connection handling
  - Test settings API endpoints
  - Test database migrations for Ollama settings
  - Mock Ollama API responses in tests
  - Add tests in `server/src/services/__tests__/ollama.test.ts`
  - Add tests in `server/src/routes/__tests__/settings.test.ts`

- [x] **Task 4.2**: Write frontend tests (if testing framework is added)
  - [x] Test settings hook (`client/src/hooks/__test__/useOllamaSettings.test.ts`)
  - [ ] Test SettingsDialog Ollama section (not yet implemented)
  - [x] Test API integration (covered via hook tests with mocked API calls)

- [x] **Task 4.3**: Update documentation
  - [x] Add Ollama setup instructions to README
  - [x] Document required Ollama models
  - [x] Update AGENTS.md with Ollama integration details
  - [x] Add API documentation for new endpoints

- [ ] **Task 4.4**: Error handling and user feedback
  - Add comprehensive error messages for common issues:
    - Ollama not running
    - Model not found
    - Connection timeout
    - Invalid configuration
  - Show helpful troubleshooting tips in UI
  - Log errors appropriately on backend

## Configuration Schema

```typescript
interface OllamaSettings {
  enabled: boolean; // Whether Ollama integration is enabled
  host: string; // Ollama host (default: 'localhost')
  port: number; // Ollama port (default: 11434)
  model: string; // Model name (e.g., 'llama3', 'mistral', 'codellama')
  timeout?: number; // Request timeout in ms (default: 30000)
}
```

## API Endpoints

### Settings Management

- `GET /settings/ollama` - Get current Ollama settings
- `PUT /settings/ollama` - Update Ollama settings
  - Body: `{ enabled?: boolean, host?: string, port?: number, model?: string }`
- `POST /settings/ollama/test` - Test Ollama connection
  - Body: `{ host?: string, port?: number, model?: string }` (optional, uses current settings if not provided)

### AI Insights (Optional)

- `GET /ai-insights/developer-analytics?path=<repo-path>` - Get AI insights for developer analytics
- `GET /ai-insights/codebase-health?path=<repo-path>` - Get AI insights for codebase health
- `GET /ai-insights/repository-evolution?path=<repo-path>` - Get AI insights for repository evolution

Or integrate as query parameter:

- `GET /developer-analytics?path=<repo-path>&ai=true` - Include AI insights in response

## Use Cases & Benefits

### 1. **Intelligent Code Quality Assessment**

**Use Case**: Analyze codebase health metrics and generate natural language insights about code quality trends, potential issues, and recommendations.

**Benefit**:

- Provides actionable insights beyond raw metrics
- Identifies patterns that might not be obvious from charts alone
- Suggests specific improvements based on codebase characteristics

**Example Prompt Context**:

```
Analyze the following codebase health metrics:
- Hotspots: [list of frequently changed files]
- Change Coupling: [files that change together]
- Stability: [file age and change frequency]
- Complexity: [diff sizes and rewrites]

Provide insights on:
1. Areas of technical debt
2. Risk factors
3. Recommended refactoring priorities
```

### 2. **Commit Message Quality Analysis**

**Use Case**: Analyze commit messages across the repository to assess quality, consistency, and adherence to conventions.

**Benefit**:

- Identifies repositories with poor commit message practices
- Suggests improvements for team communication
- Highlights areas where commit messages could be more descriptive

**Example Prompt Context**:

```
Analyze commit messages from this repository:
- Sample messages: [recent commit messages]
- Patterns: [common prefixes, lengths, formats]

Provide:
1. Quality assessment
2. Consistency analysis
3. Recommendations for improvement
```

### 3. **Developer Behavior Pattern Recognition**

**Use Case**: Analyze developer analytics to identify work patterns, collaboration styles, and potential burnout risks.

**Benefit**:

- Identifies unusual activity patterns that might indicate issues
- Suggests team structure improvements
- Highlights knowledge concentration risks

**Example Prompt Context**:

```
Developer analytics for this repository:
- Activity patterns: [hour/day distributions]
- Churn metrics: [additions/deletions]
- Collaboration: [co-author patterns]
- Longitudinal trends: [activity over time]

Identify:
1. Unusual patterns or anomalies
2. Potential team health concerns
3. Collaboration opportunities
```

### 4. **Technical Debt Identification**

**Use Case**: Combine multiple metrics (hotspots, complexity, stability, bus factor) to identify and prioritize technical debt.

**Benefit**:

- Provides holistic view of technical debt
- Prioritizes debt items by impact and risk
- Suggests refactoring strategies

**Example Prompt Context**:

```
Technical debt indicators:
- High complexity files: [list]
- Low stability files: [list]
- Single maintainer files: [list]
- Frequently changed files: [list]

Provide:
1. Technical debt assessment
2. Risk prioritization
3. Refactoring recommendations
```

### 5. **Repository Evolution Insights**

**Use Case**: Analyze growth patterns, change bursts, and evolution trends to predict future needs and identify maintenance windows.

**Benefit**:

- Predicts maintenance needs
- Identifies optimal times for major refactoring
- Highlights growth trends that might require attention

**Example Prompt Context**:

```
Repository evolution metrics:
- Growth curve: [LOC and files over time]
- Change bursts: [periods of high activity]
- Release frequency: [tag analysis]
- Churn patterns: [additions/deletions over time]

Provide:
1. Evolution pattern analysis
2. Maintenance window recommendations
3. Growth trend predictions
```

### 6. **Risk Assessment & Mitigation**

**Use Case**: Combine bus factor, ownership churn, and codebase health to identify and assess risks.

**Benefit**:

- Identifies high-risk areas before they become problems
- Suggests mitigation strategies
- Prioritizes risk reduction efforts

**Example Prompt Context**:

```
Risk indicators:
- Bus factor: [single maintainer files]
- Owner churn: [files with changing maintainers]
- Codebase health: [hotspots, complexity]
- Social network: [knowledge silos]

Provide:
1. Risk assessment
2. Critical areas identification
3. Mitigation strategies
```

### 7. **Cross-Repository Pattern Analysis**

**Use Case**: Analyze patterns across multiple repositories in a project to identify organizational patterns, team structures, and cross-repo dependencies.

**Benefit**:

- Identifies organizational patterns
- Suggests team structure improvements
- Highlights cross-repo dependencies and risks

**Example Prompt Context**:

```
Cross-repository analytics:
- Team distribution: [who works on what]
- Repository clusters: [repos worked on by same teams]
- Synchronization patterns: [commits on same dates]
- Knowledge distribution: [expertise across repos]

Provide:
1. Organizational insights
2. Team structure recommendations
3. Dependency risk assessment
```

### 8. **Onboarding & Knowledge Transfer Insights**

**Use Case**: Analyze contributor patterns to identify onboarding effectiveness and knowledge transfer opportunities.

**Benefit**:

- Identifies successful onboarding patterns
- Highlights knowledge transfer gaps
- Suggests mentoring opportunities

**Example Prompt Context**:

```
Onboarding analysis:
- New contributor patterns: [onboarding curves]
- Knowledge distribution: [who knows what]
- Collaboration networks: [mentoring relationships]
- Dormancy patterns: [inactive contributors]

Provide:
1. Onboarding effectiveness assessment
2. Knowledge transfer recommendations
3. Mentoring opportunities
```

### 9. **Code Review Quality Insights**

**Use Case**: Analyze commit patterns, co-author relationships, and change coupling to assess code review practices.

**Benefit**:

- Identifies code review gaps
- Suggests process improvements
- Highlights areas needing more review attention

**Example Prompt Context**:

```
Code review indicators:
- Co-author patterns: [collaboration frequency]
- Change coupling: [files changed together]
- Review gaps: [areas with limited collaboration]
- Quality metrics: [fix/revert ratios]

Provide:
1. Code review practice assessment
2. Process improvement recommendations
3. High-priority review areas
```

### 10. **Predictive Maintenance Recommendations**

**Use Case**: Combine all analytics to predict future maintenance needs and suggest proactive improvements.

**Benefit**:

- Enables proactive maintenance planning
- Reduces technical debt accumulation
- Optimizes development workflow

**Example Prompt Context**:

```
Comprehensive repository analysis:
- All metrics combined: [developer, health, evolution, bus factor, SNA]

Provide:
1. Maintenance priority roadmap
2. Proactive improvement suggestions
3. Risk mitigation timeline
```

## Implementation Notes

### Ollama API Integration

- Ollama API endpoint: `http://<host>:<port>/api/generate`
- Request format:
  ```json
  {
    "model": "model-name",
    "prompt": "user prompt",
    "stream": false
  }
  ```
- Response format:
  ```json
  {
    "model": "model-name",
    "created_at": "timestamp",
    "response": "generated text",
    "done": true
  }
  ```

### Error Handling

- Connection failures: Show user-friendly message, allow retry
- Model not found: Suggest available models or installation steps
- Timeout: Increase timeout or show warning
- Invalid settings: Validate before saving, show clear error messages

### Performance Considerations

- Cache AI insights (similar to other analytics)
- Make AI analysis optional (opt-in via settings)
- Show loading states during AI generation
- Consider async/background processing for long-running analyses

### Privacy & Security

- All processing happens locally (no external API calls)
- Settings stored in local database (not shared)
- No data leaves user's machine
- User controls when AI analysis is enabled

## Future Enhancements

- Support for multiple models (switch between models per analysis type)
- Custom prompt templates (user-defined prompts for specific analyses)
- Batch analysis (analyze multiple repositories at once)
- AI-powered recommendations for specific files/commits
- Integration with other local AI providers (LM Studio, etc.)
- Model selection based on analysis type (code-focused models for code analysis, etc.)
