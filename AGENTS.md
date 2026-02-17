# AGENTS.md - AI Assistant Guide for Git Intelligence

This document provides essential context and guidelines for AI assistants working on the Git Intelligence project.

## Project Overview

**Git Intelligence** is a full-stack web application that analyzes and visualizes Git repository statistics. It provides a comprehensive dashboard to track project activity, contributor performance, and codebase growth over time.

### Key Features

- **Dashboard Overview**: Key metrics (commits, contributors, file counts)
- **Activity Analysis**: Commit patterns by hour, day, month, and year
- **Contributor Insights**: Top contributors with commit counts and percentages
- **File Composition**: Language distribution via file extension charts
- **Growth Tracking**: Lines of Code (LOC) history over time
- **Multi-Project Support**: Manage projects containing multiple Git repositories
- **Repository Upload**: Upload ZIP archives of Git repositories for analysis
- **Repository Sync**: Fetch latest changes from local Git repositories with automatic cache invalidation
- **Developer Analytics**: Detailed contributor metrics including activity patterns, churn, fix/revert ratios, and longitudinal patterns
- **Codebase Health**: Hotspots, change coupling, stability, and complexity analysis
- **Repository Evolution**: Commit frequency, releases, growth curves, change bursts, and churn metrics
- **Bus Factor & Ownership**: Single maintainer risk, fragmentation, and owner churn analysis
- **Social Network Analysis**: Collaboration graphs, knowledge silos, and orphaned code detection
- **Risk Analytics**: Combined risk assessment with **Code Coverage Overlay**
- **Cross-Repository Analytics**: Aggregated analysis across all repositories in a project
- **Batch Analysis & Jobs**: Background job queue for "Analyze All" comprehensive repository/project analysis
- **AI-Powered Analysis** (Optional): Local Ollama integration for enhanced insights and natural language analysis

## Architecture

### Monorepo Structure

The project is organized as a monorepo with three main directories:

```
git-intelligence/
├── client/          # React frontend application
├── server/          # Node.js/Express backend API
└── package.json     # Root package with workspace scripts
```

### Technology Stack

#### Frontend (`client/`)

- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.17 (via `@tailwindcss/vite` plugin)
- **Charts**: Recharts 3.5.0
- **Icons**: Lucide React 0.554.0
- **HTTP Client**: Axios 1.13.2
- **UI Components**:
  - @headlessui/react 2.2.9
  - @heroicons/react 2.2.0
- **Routing**: @tanstack/react-router 1.139.3 (actively used with file-based routing)
- **State Management**:
  - React Context API (`AppContext`, `NotificationContext`)
  - React hooks (useState, useEffect) for local component state
- **Tables**: @tanstack/react-table 8.21.3
- **Utilities**:
  - clsx 2.1.1 (conditional class names)
  - tailwind-merge 3.4.0 (Tailwind class merging)
- **Dark Mode**: System preference-based (via Tailwind's `darkMode: 'media'`)

#### Backend (`server/`)

- **Runtime**: Node.js (v18+)
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Git Operations**: simple-git 3.30.0
- **File Upload**: multer 2.0.2
- **ZIP Handling**: adm-zip 0.5.16
- **CORS**: cors 2.8.5
- **Persistence**: LowDB 7.0.1 (JSON file-based database with schema versioning)
- **Database File**: `server/db.json` (replaces `projects.json`)
- **Dev Server**: nodemon 3.1.11 with ts-node 10.9.2
- **Testing**: Vitest 2.1.8 with coverage support
- **UUID**: uuid 13.0.0 for generating IDs
- **AI Integration**: Ollama service integration (optional, for AI-powered analysis)

## Project Structure

### Frontend Structure (`client/src/`)

```
src/
├── api.ts                    # API client with TypeScript interfaces
├── main.tsx                  # React entry point with TanStack Router
├── index.css                 # Global styles
├── routeTree.gen.ts          # Auto-generated route tree (TanStack Router)
├── context/
│   ├── AppContext.tsx        # Global app state (projects, repositories)
│   ├── NotificationContext.tsx # Notification system
│   └── OllamaContext.tsx     # Ollama settings context provider
├── hooks/
│   ├── useOllamaSettings.ts  # Hook for managing Ollama settings (localStorage + API sync)
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx            # Root route with layout
│   ├── index.tsx             # Home/landing page
│   ├── projects.tsx          # Projects management view
│   ├── dashboard.tsx         # Dashboard route (no repo selected)
│   ├── dashboard.$repoPath.tsx # Dashboard for specific repository
│   ├── developer-analytics.tsx # Developer analytics route
│   ├── developer-analytics.$repoPath.tsx # Repo-specific developer analytics
│   ├── codebase-health.tsx   # Codebase health route
│   ├── codebase-health.$repoPath.tsx # Repo-specific codebase health
│   ├── repository-evolution.tsx # Repository evolution route
│   ├── repository-evolution.$repoPath.tsx # Repo-specific evolution
│   ├── bus-factor-and-ownership.tsx # Bus factor route
│   ├── bus-factor-and-ownership.$repoPath.tsx # Repo-specific bus factor
│   ├── social-network-analysis.tsx # Social network analysis route
│   ├── social-network-analysis.$repoPath.tsx # Repo-specific SNA
│   ├── cross-repo-analytics.$projectId.tsx # Cross-repo developer analytics
│   ├── cross-repo-codebase-health.$projectId.tsx # Cross-repo health
│   ├── cross-repo-repository-evolution.$projectId.tsx # Cross-repo evolution
│   ├── cross-repo-bus-factor-and-ownership.$projectId.tsx # Cross-repo bus factor
│   ├── cross-repo-social-network-analysis.$projectId.tsx # Cross-repo SNA
│   └── settings.tsx          # Dedicated settings page
└── components/
    ├── Layout.tsx            # Main layout with sidebar (Headless UI)
    ├── ProjectsSidebar.tsx   # Sidebar for project/repository selection
    ├── ProjectsList.tsx      # List of projects
    ├── ProjectsView.tsx     # Projects management view
    ├── UploadProjectModal.tsx # Modal for uploading repositories
    ├── DashboardView.tsx    # Main dashboard view
    ├── SummaryCards.tsx     # Summary metrics cards
    ├── ActivityChart.tsx    # Activity visualization charts
    ├── AuthorList.tsx       # Contributor list component
    ├── ExtensionChart.tsx   # File extension distribution chart
    ├── LocChart.tsx         # Lines of Code history chart
    ├── DeveloperAnalytics.tsx # Developer analytics component
    ├── DeveloperAnalyticsView.tsx # Developer analytics view wrapper
    ├── LongitudinalPatterns.tsx # Longitudinal patterns visualization
    ├── CodebaseHealth.tsx   # Codebase health component
    ├── CodebaseHealthView.tsx # Codebase health view wrapper
    ├── RepositoryEvolution.tsx # Repository evolution component
    ├── RepositoryEvolutionView.tsx # Repository evolution view wrapper
    ├── BusFactorAndOwnership.tsx # Bus factor component
    ├── BusFactorAndOwnershipView.tsx # Bus factor view wrapper
    ├── SocialNetworkAnalysis.tsx # Social network analysis component
    ├── SocialNetworkAnalysisView.tsx # Social network analysis view wrapper
    ├── CrossRepoDeveloperAnalytics.tsx # Cross-repo developer analytics
    ├── CrossRepoDeveloperAnalyticsView.tsx # Cross-repo developer analytics view
    ├── CrossRepoCodebaseHealth.tsx # Cross-repo codebase health
    ├── CrossRepoCodebaseHealthView.tsx # Cross-repo codebase health view
    ├── CrossRepoRepositoryEvolution.tsx # Cross-repo evolution
    ├── CrossRepoRepositoryEvolutionView.tsx # Cross-repo evolution view
    ├── CrossRepoBusFactorAndOwnership.tsx # Cross-repo bus factor
    ├── CrossRepoBusFactorAndOwnershipView.tsx # Cross-repo bus factor view
    ├── CrossRepoSocialNetworkAnalysis.tsx # Cross-repo SNA
    └── CrossRepoSocialNetworkAnalysisView.tsx # Cross-repo SNA view
```

### Backend Structure (`server/src/`)

```
src/
├── index.ts                  # Express server setup and routes
├── db.ts                     # Re-exports from db/ module (backward compatibility)
├── git/                      # Git analysis modules
│   ├── index.ts             # Re-exports all git analysis functions
│   ├── types.ts             # TypeScript interfaces for all analytics
│   ├── stats.ts             # Basic repository statistics
│   ├── developerAnalytics.ts # Developer analytics (churn, patterns, etc.)
│   ├── codebaseHealth.ts    # Codebase health metrics
│   ├── coverage.ts          # Code coverage parsing (LCOV)
│   ├── repositoryEvolution.ts # Repository evolution analysis
│   ├── busFactor.ts         # Bus factor and ownership analysis
├── services/                 # External service integrations
│   ├── ollama.ts            # Ollama API client (connection, completion, analysis)
│   └── aiAnalysis.ts        # AI-powered analysis generation
├── routes/                   # API route handlers
│   ├── settings.ts          # Settings management (Ollama configuration)
│   ├── socialNetwork.ts     # Social network analysis
│   ├── utils.ts             # Shared utility functions
│   └── __tests__/          # Test files for git analysis
│       ├── stats.test.ts
│       ├── developerAnalytics.test.ts
│       ├── codebaseHealth.test.ts
│       ├── repositoryEvolution.test.ts
│       ├── busFactor.test.ts
│       └── utils.test.ts
└── db/                       # Database modules
    ├── database.ts          # LowDB initialization and migrations
    ├── types.ts             # Database schema types
    ├── projects.ts          # Project CRUD operations
    ├── repositories.ts      # Repository CRUD operations
    ├── cache.ts             # Analysis result caching
    └── __tests__/          # Test files for database
        ├── database.test.ts
        ├── projects.test.ts
        ├── repositories.test.ts
        └── cache.test.ts
```

### Data Storage

- **Database**: `server/db.json` - LowDB JSON database with schema versioning
  - **Schema Version**: Currently v2 (supports automatic migration from v1)
  - **Structure**:
    - `projects`: Array of project objects (id, name, description, timestamps)
    - `repositories`: Array of repository objects (id, projectId, path, name, timestamps)
    - `analysisCache`: Cached analysis results keyed by repository path
    - `codebaseHealthCache`: Cached codebase health results keyed by repository path
    - `schemaVersion`: Current schema version number
  - **Migration**: Automatic migration from old `projects.json` format (repositories as projects)
- **Upload Directory**: `server/uploads/` - Temporary storage for uploaded ZIP files and extracted repositories

## Key Patterns and Conventions

### Frontend Patterns

1. **Component Structure**
   - Functional components with TypeScript
   - Props interfaces defined inline or imported from `api.ts`
   - React.FC type annotation for components
   - Icons from `lucide-react` library

2. **Styling Approach**
   - Tailwind CSS utility classes
   - Dark mode support via `dark:` prefix
   - Responsive design with `md:`, `lg:`, `xl:` breakpoints
   - Consistent color scheme: blue (primary), gray (neutral), indigo (brand)

3. **API Communication**
   - Centralized API client in `api.ts` using Axios
   - Base URL: `VITE_API_BASE_URL` environment variable (defaults to `http://localhost:3001`)
   - All API functions return typed Promises
   - Error handling in components via try/catch

4. **State Management**
   - **Global State**: React Context API
     - `AppContext`: Manages projects and repositories list, loading states, and CRUD operations
     - `NotificationContext`: Manages toast notifications (info, success, error, loading)
   - **Local State**: Component-level state with `useState` and `useEffect`
   - **Routing State**: TanStack Router manages route parameters and navigation state
   - **Ollama Settings**: Managed via `useOllamaSettings` hook with localStorage caching and backend sync
     - Settings persisted in localStorage for immediate access
     - Automatic sync with backend on mount and when settings change
     - Optimistic updates with error rollback

5. **Type Definitions**
   - Shared types/interfaces in `client/src/api.ts`:
     - `GitStats` - Basic repository statistics
     - `AuthorStats` - Basic contributor information
     - `DeveloperAuthorStats` - Extended contributor metrics
     - `DeveloperAnalytics` - Developer analytics with longitudinal patterns
     - `CrossRepoDeveloperAnalytics` - Cross-repository developer analytics
     - `CodebaseHealth` - Codebase health metrics (hotspots, coupling, stability, complexity)
     - `CrossRepoCodebaseHealth` - Cross-repository codebase health
     - `RepositoryEvolution` - Repository evolution metrics
     - `CrossRepoRepositoryEvolution` - Cross-repository evolution
     - `BusFactorAndOwnership` - Bus factor and ownership analysis
     - `CrossRepoBusFactorAndOwnership` - Cross-repository bus factor
     - `SocialNetworkAnalysis` - Social network analysis
     - `CrossRepoSocialNetworkAnalysis` - Cross-repository social network analysis
     - `ActivityStats` - Activity patterns
     - `Project` - Project metadata
     - `Repository` - Repository metadata
     - `OllamaSettings` - Ollama configuration (enabled, host, port, model, timeout)
     - `OllamaTestResult` - Connection test result (success, message)

### Backend Patterns

1. **API Routes** (`server/src/index.ts`)
   - **Projects**:
     - `GET /projects` - List all projects
     - `GET /projects/:id` - Get project by ID
     - `POST /projects` - Create new project (requires name, optional description)
     - `PUT /projects/:id` - Update project (name, description)
     - `DELETE /projects/:id` - Delete project
   - **Repositories**:
     - `GET /repositories` - List repositories (optional `?projectId=<id>` filter)
     - `GET /repositories/:id` - Get repository by ID
     - `POST /repositories` - Add repository (requires projectId, path, optional name, replace flag)
     - `POST /repositories/:id/fetch` - Fetch latest changes from remote (local repos only)
     - `DELETE /repositories/:id` - Remove repository
   - **Upload**:
     - `POST /upload` - Upload ZIP archive (multipart/form-data, requires projectId)
   - **Analytics** (all support `?refresh=true` to bypass cache):
     - `GET /stats?path=<repo-path>` - Basic repository statistics
     - `GET /developer-analytics?path=<repo-path>` - Developer analytics
     - `GET /cross-repo-developer-analytics?projectId=<id>` - Cross-repo developer analytics
     - `GET /codebase-health?path=<repo-path>` - Codebase health metrics
     - `GET /cross-repo-codebase-health?projectId=<id>` - Cross-repo codebase health
     - `GET /repository-evolution?path=<repo-path>` - Repository evolution
     - `GET /cross-repo-repository-evolution?projectId=<id>` - Cross-repo evolution
     - `GET /bus-factor-and-ownership?path=<repo-path>` - Bus factor analysis
     - `GET /cross-repo-bus-factor-and-ownership?projectId=<id>` - Cross-repo bus factor
     - `GET /social-network-analysis?path=<repo-path>` - Social network analysis
     - `GET /cross-repo-social-network-analysis?projectId=<id>` - Cross-repo SNA
   - **Jobs**:
     - `POST /repositories/:id/analyze-all` - Start full analysis for a repository
     - `POST /projects/:id/analyze-all` - Start full analysis for all repositories in a project
     - `GET /repositories/analyze-all/active` - List all active analysis jobs
     - `GET /repositories/analyze-all/status?jobId=<id>` - Get status of a specific job
   - **Cache**:
     - `POST /cache/clear` - Clear analysis cache (optional `path` in body)
   - **Settings** (Ollama Integration):
     - `GET /settings/ollama` - Get current Ollama settings
     - `PUT /settings/ollama` - Update Ollama settings (requires body with `enabled?`, `host?`, `port?`, `model?`, `timeout?`)
     - `POST /settings/ollama/test` - Test Ollama connection (optional body with test settings)

2. **Git Analysis** (`server/src/git/`)
   - Modular structure with separate files for each analysis type
   - Uses `simple-git` for Git operations
   - **stats.ts**: Basic statistics (commits, authors, activity, extensions, LOC)
   - **developerAnalytics.ts**: Extended developer metrics (churn, fix/revert ratios, signed commits, longitudinal patterns)
   - **codebaseHealth.ts**: Hotspots, change coupling, stability, complexity
   - **repositoryEvolution.ts**: Commit frequency, releases, growth curves, change bursts, churn metrics
   - **busFactor.ts**: Single maintainer risk, fragmentation, owner churn
   - **socialNetwork.ts**: Collaboration graphs, knowledge silos, orphaned code
   - **utils.ts**: Shared utilities for Git operations and data processing
   - All analysis functions support caching via `useCache` parameter
   - Returns normalized data structures matching TypeScript interfaces

3. **Ollama Service** (`server/src/services/`)
   - **ollama.ts**: Ollama API client
     - `testConnection(settings)`: Test connection to Ollama instance
     - `generateCompletion(prompt, settings)`: Generate AI text completion
     - `generateAnalysis(context, analysisType, settings)`: Generate analysis for specific analytics type
     - `isModelAvailable(model, settings)`: Check if model is installed in Ollama
     - Uses native `fetch` API with AbortController for timeouts
     - Handles errors gracefully (connection failures, model not found, timeouts)
   - **aiAnalysis.ts**: AI-powered analysis generation
     - Integrates Ollama service with Git analytics
     - Generates natural language insights for codebase health, developer analytics, etc.
     - Context-aware prompts based on analysis type

4. **Data Persistence** (`server/src/db/`)
   - **LowDB** (JSON file-based database) with schema versioning
   - **database.ts**: Database initialization, migrations, schema management
   - **projects.ts**: Project CRUD operations (UUID-based IDs)
   - **repositories.ts**: Repository CRUD operations (linked to projects)
   - **cache.ts**: Analysis result caching (stats and codebase health)
   - **settings.ts**: Ollama settings management (get/update settings with validation)
     - `getOllamaSettings()`: Returns current settings or defaults
     - `updateOllamaSettings(updates)`: Updates settings with validation (port range, timeout range, non-empty host/model)
     - Default settings: `{ enabled: false, host: 'localhost', port: 11434, model: 'llama3', timeout: 120000 }`
   - **types.ts**: Database schema type definitions (includes `OllamaSettings` interface)
   - Automatic migration from old `projects.json` format
   - Prevents duplicate repositories by path within a project
   - Cache management with TTL support (currently no expiration, manual clear only)
   - Ollama settings stored in database with defaults: `{ enabled: false, host: 'localhost', port: 11434, model: 'llama3', timeout: 120000 }`

5. **File Upload Flow**
   - Multer saves to `uploads/` directory (100MB limit)
   - ZIP extracted to `uploads/<filename>_extracted/`
   - Automatic detection of nested repository structure
   - Validates Git repository (must have `.git` directory)
   - Requires `projectId` in form data (repositories belong to projects)
   - Optional `name` parameter for custom repository name
   - Optional `replace` flag to replace existing repository with same path
   - Original ZIP file cleaned up after extraction
   - Extracted files remain in `uploads/` directory (not cleaned up automatically)

### Routing Patterns

1. **TanStack Router File-Based Routing**
   - Routes defined as files in `client/src/routes/`
   - Route parameters use `$` prefix (e.g., `$repoPath`, `$projectId`)
   - Root route (`__root.tsx`) provides layout and context providers
   - Route tree auto-generated in `routeTree.gen.ts` (do not edit manually)
   - Navigation via `Link` component or `useNavigate()` hook

2. **Route Structure**
   - **Index routes**: `/` (home/landing)
   - **Projects**: `/projects` (project management)
   - **Repository routes**: Use `$repoPath` parameter (URL-encoded repository path)
   - **Project routes**: Use `$projectId` parameter (UUID)
   - **Route examples**:
     - `/dashboard/$repoPath` - Dashboard for specific repository
     - `/developer-analytics/$repoPath` - Developer analytics for repository
     - `/cross-repo-analytics/$projectId` - Cross-repo analytics for project

3. **Route Components**
   - Each route file exports a `Route` object using TanStack Router's route creators
   - Route components access params via `useParams()` hook
   - Loading states handled in route components
   - Error boundaries can be added per route

### Analytics Features

The application provides comprehensive Git repository analytics:

1. **Basic Statistics** (`/stats`)
   - Total commits, authors, files
   - Activity patterns (hour, day, month, year)
   - File extension distribution
   - Lines of Code (LOC) history

2. **Developer Analytics** (`/developer-analytics`)
   - Extended contributor metrics (lines added/removed, net lines)
   - Activity time windows (hour of day, day of week)
   - Signed commits percentage
   - Fix and revert commit ratios
   - Code churn metrics
   - Longitudinal patterns:
     - Author activity over time (weekly/monthly)
     - Onboarding curve (new contributors over time)
     - Dormancy detection (inactive contributors)

3. **Codebase Health** (`/codebase-health`)
   - **Hotspots**: Most frequently changed files and directories
   - **Change Coupling**: Files that change together
   - **Stability**: File age and change frequency analysis
   - **Complexity**: Average diff sizes, largest diffs, most rewritten files

4. **Repository Evolution** (`/repository-evolution`)
   - Commit frequency over time
   - Release information (tags, dates)
   - Growth curve (LOC and files over time)
   - Change bursts (periods of high activity)
   - Churn metrics (additions, deletions, net change)

5. **Bus Factor & Ownership** (`/bus-factor-and-ownership`)
   - **Single Maintainer Risk**: Files/repos with one primary contributor
   - **Fragmentation**: Files with too many contributors
   - **Owner Churn**: Files that changed primary maintainer

6. **Social Network Analysis** (`/social-network-analysis`)
   - **Collaboration Graph**: Network of contributors and their collaborations
   - **Knowledge Silos**: Files with limited contributor access
   - **Orphaned Code**: Files with no recent activity

7. **Cross-Repository Analytics**
   - Aggregated metrics across all repositories in a project
   - Cross-repo collaboration patterns
   - Repository clusters (repos worked on by same teams)
   - Synchronization patterns (commits across repos on same dates)

## Data Flow

### Statistics Retrieval Flow

1. User navigates to route (e.g., `/dashboard/$repoPath` or `/developer-analytics/$repoPath`)
2. Route component extracts `repoPath` from route parameters
3. Component calls API function (e.g., `getStats(repoPath)`) from `api.ts`
4. Axios GET request to endpoint (e.g., `/stats?path=<path>&refresh=false`)
5. Backend analysis function:
   - Checks cache first (unless `refresh=true`)
   - If cached and valid, returns cached result
   - Otherwise, validates Git repository
   - Executes Git commands via `simple-git`
   - Processes commit logs and file lists
   - Caches result in database
   - Returns structured statistics
6. Frontend receives data and updates component state
7. Components re-render with new statistics
8. Loading states and error handling via notifications

### Project Management Flow

1. **Creating Project**:
   - User navigates to `/projects` route
   - User creates project via form (name, optional description)
   - `POST /projects` creates project in database
   - `AppContext` refreshes projects list

2. **Adding Repository (Upload)**:
   - User selects project and ZIP file
   - FormData sent to `/upload` endpoint with `projectId`
   - Backend extracts ZIP, finds Git repo root
   - Repository added to database linked to project
   - `AppContext` refreshes repositories list

3. **Adding Repository (Path)**:
   - User provides repository path
   - `POST /repositories` with `projectId` and `path`
   - Repository added to database
   - `AppContext` refreshes repositories list

4. **Fetching Repository Changes**:
   - User clicks refresh button on individual repository or "Fetch All" on project
   - `POST /repositories/:id/fetch` fetches and pulls latest changes
   - Backend performs:
     - Validates repository path exists and is a valid Git repository
     - Runs `git fetch --all --prune` to fetch from all remotes
     - Attempts `git pull` for current branch (if upstream is configured)
     - Compares commit hashes before and after to detect changes
     - Clears analysis cache if changes were detected
   - Frontend displays success/info notification with fetch results
   - For "Fetch All": Sequentially fetches all repositories in project and shows summary
   - Cache is automatically cleared for repositories with changes, ensuring fresh analytics

5. **Removing Project**:
   - User clicks delete button
   - `DELETE /projects/:id` removes project
   - All associated repositories are also removed (cascade delete)
   - `AppContext` refreshes data

6. **Removing Repository**:
   - User clicks delete button
   - `DELETE /repositories/:id` removes repository
   - `AppContext` refreshes repositories list

## Development Workflow

### Running the Application

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend concurrently
npm run dev
```

- **Backend**: Runs on `http://localhost:3001`
- **Frontend**: Runs on `http://localhost:5173` (Vite dev server)

### Running with Docker Compose

```bash
docker compose up --build
```

- **Frontend (containerized)**: `http://localhost:5173`
- **Backend API (containerized)**: `http://localhost:3001`

For SSH-based Git remotes in Docker, use the SSH override compose file:

```bash
export SSH_PRIVATE_KEY_PATH=/absolute/path/to/id_ed25519
docker compose -f docker-compose.yml -f docker-compose.ssh.yml up --build
```

- Server container includes `git` and `openssh-client`
- SSH key is mounted read-only to `/run/secrets/git_ssh_key`
- `GIT_SSH_COMMAND` is configured in `docker-compose.ssh.yml`

For path-based repository add inside Docker, use the repository mount override:

```bash
export REPOSITORIES_HOST_PATH=/absolute/path/to/your/repos
docker compose -f docker-compose.yml -f docker-compose.repositories.yml up --build
```

- Host path mounts to `/repositories` in the server container
- Add repositories by container path (example: `/repositories/my-repo`)

### Build Process

```bash
# Frontend build
cd client && npm run build

# Backend build
cd server && npm run build
```

### Development Scripts

**Root (`package.json`)**:

- `dev`: Runs both client and server concurrently
- `install:all`: Installs dependencies for root, client, and server

**Client (`client/package.json`)**:

- `dev`: Vite development server
- `build`: TypeScript compilation + Vite build
- `preview`: Preview production build
- `lint`: ESLint check

**Server (`server/package.json`)**:

- `dev`: Nodemon with ts-node (auto-reload)
- `build`: TypeScript compilation
- `start`: Run compiled JavaScript
- `test`: Run Vitest tests once
- `test:watch`: Run Vitest in watch mode
- `test:coverage`: Run tests with coverage report

## Important Notes and Gotchas

### Git Repository Requirements

- Backend expects valid Git repositories (must have `.git` directory)
- Uploaded ZIPs are extracted and Git repo root is auto-detected
- Path-based repository identification within a project (duplicates prevented per project)
- Repositories must belong to a project (cannot exist standalone)

### LOC Calculation

- LOC history is approximate, calculated from `git log --numstat`
- Uses cumulative approach: adds (added - deleted) lines per commit
- Negative LOC values are normalized to 0
- Based on commit dates, not file system timestamps

### File Extension Analysis

- Extracted from `git ls-files` (tracked files only)
- Extension is last part after final dot (e.g., `file.test.js` → `js`)
- Files without extensions categorized as `no-extension`

### Port Configuration

- Backend hardcoded to port 3001 in `server/src/index.ts`
- Frontend API base URL configurable via `VITE_API_BASE_URL` in `client/src/api.ts`
- Optional server storage paths:
  - `DB_FILE_PATH` for LowDB JSON file location
  - `UPLOAD_DIR` for upload/extraction directory location

### Dark Mode

- Uses system preference (`prefers-color-scheme`)
- Tailwind `dark:` classes used throughout components
- No manual toggle (system preference only)

### Layout Component

- Uses Headless UI Dialog for mobile sidebar
- Desktop sidebar is fixed (72 width units)
- Projects sidebar (`ProjectsSidebar`) is separate and shows projects/repositories
- Navigation handled by TanStack Router with file-based routes
- Root route (`__root.tsx`) wraps all routes with `Layout`, `AppProvider`, and `NotificationProvider`

### Type Safety

- Strong TypeScript usage throughout
- Shared types between frontend and backend via separate definitions
- API responses typed via interfaces in `api.ts`

## Common Tasks for AI Assistants

### Adding a New Chart/Visualization

1. Create component in `client/src/components/`
2. Import Recharts components as needed
3. Follow existing chart patterns (see `ActivityChart.tsx`, `LocChart.tsx`)
4. Create a view wrapper component if needed (see `*View.tsx` components)
5. Add route in `client/src/routes/` if it's a new page
6. Ensure responsive design with Tailwind classes

### Adding a New API Endpoint

1. Add route handler in `server/src/index.ts`
2. Implement business logic in appropriate module:
   - Git analysis: Add function to `server/src/git/` (create new file or extend existing)
   - Database operations: Add function to `server/src/db/` (projects.ts, repositories.ts, or cache.ts)
3. Add corresponding function in `client/src/api.ts`
4. Define TypeScript interfaces:
   - Backend: Add to `server/src/git/types.ts` or `server/src/db/types.ts`
   - Frontend: Add to `client/src/api.ts`
5. Create route component in `client/src/routes/` if needed
6. Create view component in `client/src/components/` if needed
7. Update `AppContext` if it affects global state

### Modifying Git Analysis

1. Edit appropriate file in `server/src/git/`:
   - `stats.ts` for basic statistics
   - `developerAnalytics.ts` for developer metrics
   - `codebaseHealth.ts` for health metrics
   - `repositoryEvolution.ts` for evolution analysis
   - `busFactor.ts` for bus factor analysis
   - `socialNetwork.ts` for social network analysis
2. Use `simple-git` methods for Git operations
3. Use caching utilities from `server/src/db/cache.ts` if appropriate
4. Return data in format matching TypeScript interfaces from `git/types.ts`
5. Update frontend types in `api.ts` if structure changes
6. Add tests in `server/src/git/__tests__/` if adding new functionality

### Styling Changes

1. Use Tailwind utility classes
2. Follow existing color scheme (blue, gray, indigo)
3. Ensure dark mode support with `dark:` variants
4. Test responsive breakpoints

### Updating Documentation

When implementing new features or making significant changes, always update the following:

1. `README.md`: Update feature lists and architecture diagrams if necessary.
2. `RELEASE.md`: Add a new entry or update the current version's highlights.
3. `AGENTS.md`: Update the project overview, tech stack, and structure if they have changed. Update, refine it concisely to keep it short and accurate. Remove any outdated information and ensure it reflects the current state of the codebase and architecture.

## Code Style Guidelines

- **TypeScript**: Strict typing, prefer interfaces over types for objects
- **React**: Functional components, hooks-based patterns
- **Naming**:
  - Components: PascalCase (`SummaryCards.tsx`)
  - Functions: camelCase (`getStats`, `loadProjects`)
  - Files: Match component/function name
- **Imports**: Group by source (React, libraries, local)
- **Formatting**: Follow existing indentation (2 spaces)

## Testing Considerations

- **Test Framework**: Vitest 2.1.8 with coverage support
- **Test Location**: `server/src/**/__tests__/`
- **Coverage**: Generated in `server/coverage/` directory
- **Test Commands**:
  - `npm test` - Run all tests once
  - `npm run test:watch` - Watch mode for development
  - `npm run test:coverage` - Generate coverage report
- **Test Structure**:
  - Git analysis tests: `server/src/git/__tests__/`
  - Database tests: `server/src/db/__tests__/`
  - External dependencies (simple-git, db) are mocked
  - Tests use proper 40-character git commit hashes in mocks
- **Frontend Testing**: Vitest + React Testing Library configured
  - Hook tests: `client/src/hooks/__test__/useOllamaSettings.test.ts`
  - Component tests: `client/src/components/__test__/`
  - Context tests: `client/src/context/__test__/`
- **Ollama Integration Tests**:
  - Service tests: `server/src/services/__tests__/ollama.test.ts`
  - Settings route tests: `server/src/routes/__tests__/settings.test.ts`
  - Database settings tests: `server/src/db/__tests__/settings.test.ts`
- **See**: `server/TESTING.md` for detailed testing guidelines

## Future Enhancement Opportunities

- Environment variable configuration for ports/URLs
- Database migration from LowDB to proper database (PostgreSQL, MongoDB, etc.)
- Authentication/authorization
- Real-time updates (WebSockets)
- Export functionality (PDF, CSV)
- More detailed commit analysis
- Branch visualization
- File change history
- Performance optimizations for large repositories
- Cache expiration/TTL for analysis results
- API rate limiting
- Background job processing for large analyses
- Enhanced AI analysis prompts with more context
- Streaming AI responses for better UX
- Repository cloning from remote URLs (GitHub, GitLab, etc.)

---

**Last Updated**: February 2026 - Updated to reflect:

- Batch Analysis & Background Job Queue
- Dedicated Settings Page migration
- **Code Coverage Overlay** in Risk Analytics
- Enhanced Repository Evolution with trendlines
- Documentation update requirements for AI assistants
- Ollama integration for AI-powered analysis
- Settings management API and UI
- Ollama service module with connection testing
- Frontend hooks for Ollama settings management
- Comprehensive test coverage for Ollama features

- TanStack Router implementation with file-based routing
- Project/Repository hierarchy (Projects contain Repositories)
- LowDB database with schema versioning and caching
- Comprehensive analytics features (Developer Analytics, Codebase Health, Repository Evolution, Bus Factor, Social Network Analysis)
- Cross-repository analytics capabilities
- React Context API for global state management
- Vitest testing framework
- Modular backend structure (db/ and git/ subdirectories)

**Maintainer Notes**: This is a working application with active development. Always check current implementation before making assumptions. The codebase has evolved significantly from the original simple dashboard to a comprehensive Git analytics platform.
