# Release Notes - Git Intelligence v0.0.1

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

## 📝 Changelog

### v0.0.1 (November 26, 2025)

#### Initial Release Features

- ✅ Complete dashboard with overview metrics
- ✅ Developer analytics with longitudinal patterns
- ✅ Codebase health analysis (hotspots, coupling, stability, complexity)
- ✅ Repository evolution tracking (commits, releases, growth, bursts)
- ✅ Bus factor and ownership analysis
- ✅ Social network analysis
- ✅ Risk analytics
- ✅ Cross-repository analytics
- ✅ Multi-project support
- ✅ Repository upload via ZIP archives with drag-and-drop
- ✅ Path-based repository analysis
- ✅ Analysis result caching
- ✅ Dark mode support (system preference)
- ✅ Responsive design
- ✅ Comprehensive test coverage

#### Recent Improvements

- Enhanced change bursts display with increased max height
- Added Risky Files section to Codebase Health
- Added Repository Hygiene metrics
- Enhanced UploadProjectModal with drag-and-drop support
- Improved file validation for ZIP files
- Updated to support ZIP archives up to 100MB
- Streamlined UI for cross-repo analytics

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
