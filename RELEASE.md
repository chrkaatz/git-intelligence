# Release Notes - Git Intelligence

## v0.3.0

**Release Date:** February 17, 2026  
**Tag:** `v0.3.0`

---

### 🔍 Overview

Git Intelligence v0.3.0 introduces **comprehensive batch analysis** capabilities with the "Analyze All" feature, a **dedicated Settings page** for better configuration management, and **enhanced evolution analytics** with trendline calculations. This release focuses on improving the workflow for analyzing large projects and providing deeper long-term insights.

### ✨ Highlights

- **Batch Analysis: "Analyze All"**
  - Trigger all analysis types (Stats, Developer, Health, Evolution, Bus Factor, SNA, Risk) in a single action.
  - New **Background Job Queue** system to handle long-running analyses without blocking the UI.
  - Real-time progress monitoring showing percentage completion and current step.
  - Available for both individual repositories and entire projects (cross-repo analysis).
  - Automatic cache refreshing when using Analyze All to ensure the latest data.

- **Dedicated Settings Page**
  - Migrated settings from a modal dialog to a full-width, dedicated page.
  - Streamlined layout for managing Ollama configuration and AI analysis settings.
  - Improved accessibility and focus for application configuration.

- **Enhanced Repository Evolution**
  - **Trendline Analysis**: Added linear regression trendlines to commit frequency charts.
  - **Monthly Data Aggregation**: Improved visualization of long-term trends for mature repositories.
  - Refined chart tooltips and axis formatting for better readability.

- **Code Coverage Overlay**
  - **Hotspot Integration**: Integrated LCOV coverage data directly into Risk Analytics.
  - **Critical Area Identification**: Automatically identify "High Risk / Low Coverage" files.
  - **Automated Discovery**: Built-in parser for `lcov.info` files supporting common test runners.
  - **Portfolio Metrics**: Aggregated coverage statistics for project-wide health assessment.

- **Infrastructure & UX**
  - New `jobQueue` module for managing concurrent analysis tasks.
  - Real-time status updates in `ProjectsList` for ongoing jobs.
  - Downgraded client ESLint dependency to fix environment-specific build issues.
  - Cleaned up obsolete integration specifications.

---

## v0.2.0

**Release Date:** December 11, 2025  
**Tag:** `v0.2.0`

---

### 🔍 Overview

Git Intelligence v0.2.0 introduces **AI-powered analysis capabilities** through local Ollama integration, **repository synchronization features**, and **enhanced analytics accuracy** with intelligent file exclusion. This release significantly expands the analytical capabilities of the platform while maintaining privacy through local AI processing.

### ✨ Highlights

- **AI-Powered Analysis with Ollama Integration**
  - Complete Ollama settings management UI in Settings dialog
  - Connection testing functionality with real-time feedback
  - AI insights generation for all analytics views:
    - Developer Analytics insights
    - Codebase Health recommendations
    - Repository Evolution analysis
    - Bus Factor & Ownership insights
    - Social Network Analysis observations
    - Risk Analytics assessments
  - Configurable Ollama connection (host, port, model, timeout)
  - Settings persistence in database with localStorage caching
  - Graceful error handling for connection failures and timeouts
  - AI insights cached separately from analytics data for performance
  - Optional AI analysis toggle per analytics view
  - Comprehensive test coverage for Ollama service and settings management

- **Repository Synchronization**
  - New `POST /repositories/:id/fetch` endpoint for fetching latest changes
  - Automatic `git fetch --all --prune` and `git pull` for local repositories
  - Intelligent change detection via commit hash comparison
  - Automatic cache invalidation when repository changes are detected
  - UI components for fetching individual repositories or all repositories in a project
  - Enhanced ProjectsSidebar with "Fetch All" functionality for project-wide updates
  - Detailed feedback notifications showing fetch results and change status
  - Proper handling of repositories without upstream branches

- **Enhanced Analytics Accuracy**
  - **File Exclusion Logic**: Intelligent filtering to reduce false positives
    - Excludes package management files (package-lock.json, package.json, yarn.lock, pnpm-lock.yaml)
    - Excludes translation files (JSON, PO, POT, properties, XLIFF files in translation directories)
    - Excludes common translation file patterns (e.g., de.json, en.json, fr.json)
    - Applied to risk analytics, codebase health hotspots, and AI analysis prompts
    - More accurate identification of actual code hotspots and risk areas

- **Infrastructure & Quality**
  - Updated dependencies:
    - Vite 7.2.4 → 7.2.7
    - Prettier 3.6.2 → 3.7.4
    - Recharts 3.5.0 → 3.5.1
    - @vitest/coverage-v8 updates
    - GitHub Actions upload-artifact v4 → v5
  - Enhanced CI/CD workflows:
    - Consolidated test coverage uploads
    - Improved test coverage reporting
    - Branch restrictions for workflow execution
  - Comprehensive documentation updates:
    - OLLAMA_INTEGRATION_SPEC.md with complete feature specification
    - Updated AGENTS.md with Ollama integration details
  - Improved error handling for hash comparison (trailing newline fixes)
  - Enhanced validation for Ollama settings (host, port, model, timeout ranges)

---

## v0.1.0

**Release Date:** November 28, 2025  
**Tag:** `v0.1.0`  
**Commit:** `2fdcd61dad6a263a2a2b10fd4977b97d1d426c9a`

---

### 🔍 Overview

Git Intelligence v0.1.0 is a significant enhancement release focused on **improved user experience**, **better project management**, and **enhanced UI consistency**. This release introduces dark mode support, project/repository ordering, improved repository management, and comprehensive cache control features.

### ✨ Highlights

- **Repository Management Improvements**
  - Refactored `UploadRepoModal` into a more flexible `AddRepoModal` component
  - Support for both ZIP file uploads and local folder paths in a unified interface
  - Enhanced form handling, file validation, and error management
  - Improved integration with the API for repository operations

- **Project & Repository Organization**
  - Added project and repository ordering functionality with drag-and-drop support
  - Introduced `order` fields in Project and Repository interfaces
  - New `reorderProjects` and `reorderRepositories` API endpoints
  - Enhanced `ProjectsList` component with UI controls for reordering
  - Database schema updated to support ordering with automatic migrations

- **Developer Analytics Enhancements**
  - Added total Lines of Code (LOC) display in Developer Analytics views
  - Enhanced cross-repository analytics with improved cache management
  - New `clearCache` function for manual cache clearing
  - Optional `refresh` parameter support in `getCrossRepoDeveloperAnalytics` API
  - Improved loading states and error handling across analytics components

- **User Experience Improvements**
  - **Dark Mode Support**: Full dark mode styling across all charts and components
    - Updated ActivityChart, AuthorList, DashboardView, ExtensionChart, LocChart, and SummaryCards
    - Improved tooltip styling for better visibility in both light and dark modes
    - Consistent text color adjustments throughout the application
  - **Confirmation Dialogs**: New `ConfirmationDialog` component for consistent user confirmations
    - Integrated into ProjectsSidebar, ProjectsView, and SettingsDialog
    - Replaced native browser confirm prompts with styled dialogs
    - Enhanced notification handling for deletion actions

- **Cross-Repository Analytics Enhancements**
  - Project name display in all cross-repository analytics views
  - Improved context and clarity for analytics across multiple repositories
  - Enhanced `CrossRepoAnalyticsPortfolioView` with project name and descriptions
  - Better user experience when analyzing project-wide metrics

- **Infrastructure & Quality**
  - New `fileUtils` module for folder management
  - Automatic cleanup of uploaded folders when projects/repositories are deleted
  - Comprehensive unit tests for new components and features
  - Improved error handling and validation throughout the application

---

## v0.0.2

**Release Date:** November 26, 2025  
**Tag:** `v0.0.2`  
**Commit:** `8b54a81ed5fcbd909d11c1d48ef63ca3ccbad1c5`

---

### 🔍 Overview

Git Intelligence v0.0.2 is a refinement release focused on **technical debt analytics**, **risk analysis robustness**, and **improved UX consistency**. It introduces a new Technical Debt Indicators view, strengthens backend test coverage, and streamlines several UI components.

### ✨ Highlights

- **Technical Debt Indicators**
  - New Technical Debt Indicators feature with dedicated backend analysis and API endpoint
  - Frontend UI components and charts to surface files and areas with elevated technical debt risk
  - Integration into the existing analytics navigation for a cohesive experience

- **Risk & Portfolio Analytics**
  - Added and refined unit tests for risk analytics functionality and shared risk utility functions
  - Introduced a Cross-Repository Portfolio Analytics view with corresponding tests to analyze risk and health across multiple repositories

- **Infrastructure & Quality**
  - Refactored `JobQueue` implementation and added comprehensive unit tests for more reliable background analysis execution
  - Expanded test coverage for technical debt indicators and risk analytics, improving overall backend reliability

- **UX & UI Improvements**
  - Refactored multiple components to use a shared `RecalculateButton` for consistent refresh interactions
  - Simplified `NotificationItem` close button rendering for a cleaner and more maintainable notification UI

---

## v0.0.1

**Release Date:** November 26, 2025  
**Tag:** `v0.0.1`  
**Commit:** `35ac54efb724970872947efc418e8f194b503bbb`

**Release Date:** November 26, 2025  
**Tag:** `v0.0.1`  
**Commit:** `35ac54efb724970872947efc418e8f194b503bbb`

---

## 🎉 Overview

Git Intelligence v0.0.1 is the initial release of a comprehensive full-stack web application for analyzing and visualizing Git repository statistics. This release provides deep insights into project activity, contributor performance, codebase health, and repository evolution through an intuitive dashboard interface.

## ✨ Key Features

### Core Analytics

- **Dashboard Overview**: Key metrics including total commits, contributors, file counts, and activity patterns
- **Activity Analysis**: Visualize commit patterns by hour, day, month, and year
- **Contributor Insights**: Track top contributors with commit counts, percentages, and activity windows
- **File Composition**: Language distribution analysis via file extension charts
- **Growth Tracking**: Monitor Lines of Code (LOC) history over time

### Advanced Analytics

#### Developer Analytics

- Extended contributor metrics (lines added/removed, net lines)
- Activity time windows (hour of day, day of week)
- Signed commits percentage
- Fix and revert commit ratios
- Code churn metrics
- Longitudinal patterns:
  - Author activity over time (weekly/monthly)
  - Onboarding curve (new contributors over time)
  - Dormancy detection (inactive contributors)

#### Codebase Health

- **Hotspots**: Identify most frequently changed files and directories
- **Change Coupling**: Detect files that change together
- **Stability**: Analyze file age and change frequency
- **Complexity**: Average diff sizes, largest diffs, most rewritten files
- **Risky Files**: Files with high change frequency and complexity
- **Repository Hygiene**: Overall codebase health metrics

#### Repository Evolution

- Commit frequency over time
- Release information (tags, dates, commit hashes)
- Growth curves (LOC and files over time)
- Change bursts (periods of high activity with refactor detection)
- Churn metrics (additions, deletions, net change)

#### Bus Factor & Ownership

- Single maintainer risk analysis
- Fragmentation detection (files with too many contributors)
- Owner churn tracking (files that changed primary maintainer)

#### Social Network Analysis

- Collaboration graphs (network of contributors)
- Knowledge silos detection
- Orphaned code identification

#### Risk Analytics

- Comprehensive risk assessment across repositories
- Risk scoring and prioritization

### Cross-Repository Analytics

- Aggregated metrics across all repositories in a project
- Cross-repo collaboration patterns
- Repository clusters (repos worked on by same teams)
- Synchronization patterns (commits across repos on same dates)

### Project Management

- **Multi-Project Support**: Organize repositories into projects
- **Repository Upload**: Upload ZIP archives of Git repositories for analysis (up to 100MB)
- **Drag-and-Drop Support**: Intuitive file upload interface
- **Path-Based Analysis**: Analyze local Git repositories by path
- **Caching**: Intelligent caching of analysis results for faster performance

## 🏗️ Technical Stack

### Frontend

- **Framework**: React 19.2.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Routing**: TanStack Router 1.139.6 (file-based routing)
- **Styling**: Tailwind CSS 4.1.17
- **Charts**: Recharts 3.5.0
- **State Management**: React Context API
- **UI Components**: Headless UI, Heroicons, Lucide React
- **Tables**: TanStack React Table 8.21.3

### Backend

- **Runtime**: Node.js (v22+)
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Git Operations**: simple-git 3.30.0
- **Database**: LowDB 7.0.1 (JSON-based with schema versioning)
- **File Upload**: multer 2.0.2
- **ZIP Handling**: adm-zip 0.5.16
- **Testing**: Vitest 4.0.14

## 📦 Installation

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn
- Git

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd git-intelligence
   git checkout v0.0.1
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```
   This installs dependencies for the root, client, and server packages.

## 🚀 Usage

### Development

Start both the frontend and backend concurrently:

```bash
npm run dev
```

- **Backend**: Runs on `http://localhost:3001`
- **Frontend**: Runs on `http://localhost:5173`

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start backend
cd server && npm start
```

### Adding Repositories

1. **Create a Project**: Navigate to the Projects page and create a new project
2. **Upload Repository**:
   - Select a project
   - Upload a ZIP archive containing a Git repository (drag-and-drop supported)
   - The system will automatically extract and detect the repository
3. **Add by Path**:
   - Provide the absolute path to a local Git repository
   - The repository will be linked to your project

### Viewing Analytics

- Navigate to different analytics views from the sidebar
- Select a repository to view single-repository analytics
- Select a project to view cross-repository analytics
- Use the refresh option to bypass cache and get fresh data

## 🧪 Testing

The backend includes comprehensive test coverage using Vitest:

```bash
# Run all tests
cd server && npm test

# Run tests in watch mode
cd server && npm run test:watch

# Generate coverage report
cd server && npm run test:coverage
```

## 📊 API Endpoints

### Projects

- `GET /projects` - List all projects
- `GET /projects/:id` - Get project by ID
- `POST /projects` - Create project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Repositories

- `GET /repositories` - List repositories (optional `?projectId=<id>` filter)
- `GET /repositories/:id` - Get repository by ID
- `POST /repositories` - Add repository
- `DELETE /repositories/:id` - Remove repository
- `POST /upload` - Upload ZIP archive

### Analytics

- `GET /stats?path=<repo-path>` - Basic statistics
- `GET /developer-analytics?path=<repo-path>` - Developer analytics
- `GET /codebase-health?path=<repo-path>` - Codebase health
- `GET /repository-evolution?path=<repo-path>` - Repository evolution
- `GET /bus-factor-and-ownership?path=<repo-path>` - Bus factor analysis
- `GET /social-network-analysis?path=<repo-path>` - Social network analysis
- `GET /risk-analytics?path=<repo-path>` - Risk analytics
- Cross-repo variants available with `?projectId=<id>` parameter

All analytics endpoints support `?refresh=true` to bypass cache.

## 🔧 Configuration

### Ports

- Backend: `3001` (configured in `server/src/index.ts`)
- Frontend: `5173` (Vite default)

### Database

- Database file: `server/db.json`
- Automatic schema migrations from older versions
- Cache stored in database for faster subsequent analyses

### File Upload

- Maximum file size: 100MB
- Supported format: ZIP archives containing Git repositories

## ⚠️ Known Limitations

- **Local Only**: Currently works only on local machines
- **No Authentication**: No user authentication or authorization system
- **No Remote Cloning**: Cannot clone repositories directly from remote URLs (GitHub, GitLab, etc.)
- **Cache Management**: Cache must be manually cleared (no automatic expiration)
- **Port Configuration**: Ports are hardcoded (no environment variable configuration)
- **Database**: Uses JSON file-based database (LowDB) - not suitable for production at scale

## 🔮 Future Enhancements

Potential features for future releases:

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
- Frontend component testing
- API rate limiting
- Background job processing for large analyses
- Repository cloning from remote URLs (GitHub, GitLab, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with modern web technologies and designed to provide comprehensive insights into Git repository activity and health.

---

**For more information, see the [README.md](README.md) file.**
