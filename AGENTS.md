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
- **Multi-Project Support**: Manage and switch between multiple Git repositories
- **Repository Upload**: Upload ZIP archives of Git repositories for analysis

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
- **Routing**: @tanstack/react-router 1.139.3 (configured but not actively used in current implementation)
- **State Management**: React hooks (useState, useEffect) - no external state management library
- **Dark Mode**: System preference-based (via Tailwind's `darkMode: 'media'`)

#### Backend (`server/`)
- **Runtime**: Node.js (v18+)
- **Framework**: Express 5.1.0
- **Language**: TypeScript 5.9.3
- **Git Operations**: simple-git 3.30.0
- **File Upload**: multer 2.0.2
- **ZIP Handling**: adm-zip 0.5.16
- **CORS**: cors 2.8.5
- **Persistence**: JSON file-based storage (`projects.json`)
- **Dev Server**: nodemon 3.1.11 with ts-node 10.9.2

## Project Structure

### Frontend Structure (`client/src/`)

```
src/
├── api.ts                    # API client with TypeScript interfaces
├── App.tsx                   # Main application component
├── main.tsx                  # React entry point
├── index.css                 # Global styles
├── App.css                   # App-specific styles
└── components/
    ├── Layout.tsx            # Main layout with sidebar (Headless UI)
    ├── SummaryCards.tsx      # Summary metrics cards
    ├── ActivityChart.tsx     # Activity visualization charts
    ├── AuthorList.tsx        # Contributor list component
    ├── ExtensionChart.tsx    # File extension distribution chart
    └── LocChart.tsx          # Lines of Code history chart
```

### Backend Structure (`server/src/`)

```
src/
├── index.ts                  # Express server setup and routes
├── git.ts                    # Git analysis logic (getStats function)
└── db.ts                     # JSON-based project persistence
```

### Data Storage

- **Projects Database**: `server/projects.json` - Stores project metadata (id, path, name)
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
   - Base URL: `http://localhost:3001`
   - All API functions return typed Promises
   - Error handling in components via try/catch

4. **State Management**
   - Local component state with `useState`
   - Side effects with `useEffect`
   - No global state management (Redux, Zustand, etc.)

5. **Type Definitions**
   - Shared types/interfaces in `client/src/api.ts`:
     - `GitStats` - Complete statistics object
     - `AuthorStats` - Contributor information
     - `ActivityStats` - Activity patterns
     - `Project` - Project metadata

### Backend Patterns

1. **API Routes** (`server/src/index.ts`)
   - `GET /projects` - List all projects
   - `POST /projects` - Add project by path
   - `POST /upload` - Upload ZIP archive (multipart/form-data)
   - `DELETE /projects/:id` - Remove project
   - `GET /stats?path=<repo-path>` - Get repository statistics

2. **Git Analysis** (`server/src/git.ts`)
   - Uses `simple-git` for Git operations
   - Analyzes commit history, authors, activity patterns
   - Calculates LOC history from `git log --numstat`
   - File extension analysis from `git ls-files`
   - Returns normalized data structures

3. **Data Persistence** (`server/src/db.ts`)
   - JSON file-based storage
   - UUID-based project IDs
   - Automatic database file creation
   - Prevents duplicate projects by path

4. **File Upload Flow**
   - Multer saves to `uploads/` directory
   - ZIP extracted to `uploads/<filename>_extracted/`
   - Automatic detection of nested repository structure
   - Original ZIP file cleaned up after extraction

## Data Flow

### Statistics Retrieval Flow

1. User selects project from sidebar → `setCurrentPath(project.path)`
2. `useEffect` triggers when `currentPath` changes
3. `getStats(currentPath)` called from `api.ts`
4. Axios GET request to `/stats?path=<path>`
5. Backend `getStats()` function:
   - Validates Git repository
   - Executes Git commands via `simple-git`
   - Processes commit logs and file lists
   - Returns structured statistics
6. Frontend receives data and updates state
7. Components re-render with new statistics

### Project Management Flow

1. **Adding Project (Upload)**:
   - User selects ZIP file
   - FormData sent to `/upload` endpoint
   - Backend extracts ZIP, finds Git repo root
   - Project added to `projects.json`
   - Frontend refreshes project list

2. **Removing Project**:
   - User clicks delete button
   - DELETE request to `/projects/:id`
   - Backend removes from `projects.json`
   - Frontend updates state and UI

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

## Important Notes and Gotchas

### Git Repository Requirements
- Backend expects valid Git repositories (must have `.git` directory)
- Uploaded ZIPs are extracted and Git repo root is auto-detected
- Path-based project identification (duplicates prevented)

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
- Frontend API base URL hardcoded to `http://localhost:3001` in `client/src/api.ts`
- No environment variable configuration currently

### Dark Mode
- Uses system preference (`prefers-color-scheme`)
- Tailwind `dark:` classes used throughout components
- No manual toggle (system preference only)

### Layout Component
- Uses Headless UI Dialog for mobile sidebar
- Desktop sidebar is fixed (72 width units)
- Projects sidebar is separate (96 width units on xl screens)
- Navigation items in Layout are currently placeholder (not functional)

### Type Safety
- Strong TypeScript usage throughout
- Shared types between frontend and backend via separate definitions
- API responses typed via interfaces in `api.ts`

## Common Tasks for AI Assistants

### Adding a New Chart/Visualization
1. Create component in `client/src/components/`
2. Import Recharts components as needed
3. Follow existing chart patterns (see `ActivityChart.tsx`, `LocChart.tsx`)
4. Add to `App.tsx` render logic
5. Ensure responsive design with Tailwind classes

### Adding a New API Endpoint
1. Add route handler in `server/src/index.ts`
2. Implement business logic (may need new function in `git.ts` or `db.ts`)
3. Add corresponding function in `client/src/api.ts`
4. Define TypeScript interfaces for request/response
5. Update component to use new API function

### Modifying Git Analysis
1. Edit `server/src/git.ts`
2. Use `simple-git` methods for Git operations
3. Return data in format matching `GitStats` interface
4. Update frontend types in `api.ts` if structure changes

### Styling Changes
1. Use Tailwind utility classes
2. Follow existing color scheme (blue, gray, indigo)
3. Ensure dark mode support with `dark:` variants
4. Test responsive breakpoints

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

- No test suite currently configured
- Manual testing via development servers
- Consider adding tests for:
  - Git analysis logic (`git.ts`)
  - API endpoints (`index.ts`)
  - React components (component tests)

## Future Enhancement Opportunities

- Environment variable configuration for ports/URLs
- Database migration from JSON to proper database
- Authentication/authorization
- Real-time updates (WebSockets)
- Export functionality (PDF, CSV)
- More detailed commit analysis
- Branch visualization
- File change history
- Contributor network graphs
- Performance optimizations for large repositories

---

**Last Updated**: Based on current codebase state
**Maintainer Notes**: This is a working application with active development. Always check current implementation before making assumptions.

