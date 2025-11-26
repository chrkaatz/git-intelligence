import { useState, useEffect } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Plus,
  Trash2,
  FolderGit2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Heart,
  TrendingUp,
  ChevronLeft,
  Shield,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface ProjectsSidebarProps {
  onCollapse?: () => void;
  showCollapseButton?: boolean;
  isCollapsed?: boolean;
  onExpand?: () => void;
}

export function ProjectsSidebar({
  onCollapse,
  showCollapseButton = false,
  isCollapsed = false,
  onExpand,
}: ProjectsSidebarProps) {
  const { projects, repositories, handleDeleteRepository } = useApp();
  const navigate = useNavigate();
  const router = useRouterState();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Get current repo ID from URL
  const currentRepoId = (() => {
    try {
      const location = router.location;
      // Try to get from route params if available
      const routeParams = (location as { params?: { repoId?: string } }).params || {};
      if (routeParams.repoId) {
        return routeParams.repoId;
      }
      // Fallback: try to extract from pathname
      const pathMatch = location.pathname.match(
        /\/(dashboard|developer-analytics|codebase-health|repository-evolution|bus-factor-and-ownership|social-network-analysis|risk-analytics|technical-debt-indicators)\/([^/]+)$/
      );
      if (pathMatch && pathMatch[2]) {
        return pathMatch[2];
      }
    } catch {
      // Ignore errors
    }
    return '';
  })();

  // Auto-expand projects with repositories
  useEffect(() => {
    const projectsWithRepos = new Set(repositories.map((r) => r.projectId));
    // Use setTimeout to avoid calling setState synchronously in effect
    const timeoutId = setTimeout(() => {
      setExpandedProjects(projectsWithRepos);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [repositories]);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleSelectRepository = (repo: { id: string; path: string }) => {
    // Save the repository ID as last selected
    if (typeof window !== 'undefined' && repo.id) {
      localStorage.setItem('lastSelectedRepository', repo.id);
    }

    // Try to navigate to current route with repo ID, or default to dashboard
    const currentPath = router.location.pathname;
    if (currentPath.startsWith('/developer-analytics')) {
      navigate({
        to: '/developer-analytics/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/codebase-health')) {
      navigate({
        to: '/codebase-health/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/repository-evolution')) {
      navigate({
        to: '/repository-evolution/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/bus-factor-and-ownership')) {
      navigate({
        to: '/bus-factor-and-ownership/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/social-network-analysis')) {
      navigate({
        to: '/social-network-analysis/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/risk-analytics')) {
      navigate({
        to: '/risk-analytics/$repoId',
        params: { repoId: repo.id },
      });
    } else if (currentPath.startsWith('/technical-debt-indicators')) {
      navigate({
        to: '/technical-debt-indicators/$repoId',
        params: { repoId: repo.id },
      });
    } else {
      navigate({
        to: '/dashboard/$repoId',
        params: { repoId: repo.id },
      });
    }
  };

  const projectRepoMap = new Map<string, typeof repositories>();
  repositories.forEach((repo) => {
    const repos = projectRepoMap.get(repo.projectId) || [];
    repos.push(repo);
    projectRepoMap.set(repo.projectId, repos);
  });

  // Collapsed view - show avatars/icons
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full items-center py-2 gap-2 w-full overflow-hidden">
        <button
          type="button"
          onClick={onExpand}
          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title="Expand projects"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col gap-2 w-full items-center overflow-y-auto overflow-x-visible min-h-0 p-2">
          {projects.map((project) => {
            const projectRepos = projectRepoMap.get(project.id) || [];
            const hasSelectedRepo = projectRepos.some((repo) => repo.id === currentRepoId);

            return (
              <div key={project.id} className="flex flex-col items-center gap-1 shrink-0">
                {/* Project avatar */}
                <button
                  type="button"
                  onClick={onExpand}
                  className={classNames(
                    'p-1.5 rounded-lg transition-all relative shrink-0',
                    hasSelectedRepo
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                  title={project.name}
                >
                  <FolderOpen className="w-4 h-4" />
                  {projectRepos.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold leading-none">
                      {projectRepos.length > 9 ? '9+' : projectRepos.length}
                    </span>
                  )}
                </button>

                {/* Repository avatars - show first 3 repos */}
                {projectRepos.slice(0, 3).map((repo) => {
                  const isSelected = repo.id === currentRepoId;
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        handleSelectRepository(repo);
                        onExpand?.();
                      }}
                      className={classNames(
                        'p-1 rounded transition-all shrink-0',
                        isSelected
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-500'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700'
                      )}
                      title={repo.name}
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
                {projectRepos.length > 3 && (
                  <div className="text-[9px] text-gray-400 dark:text-gray-500 font-medium leading-tight">
                    +{projectRepos.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link
          to="/projects"
          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title="Add Project"
        >
          <Plus className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
        <div className="flex items-center gap-2">
          {showCollapseButton && onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Collapse projects"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Link
            to="/projects"
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="Add Project"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto">
        {projects.map((project) => {
          const projectRepos = projectRepoMap.get(project.id) || [];
          const isExpanded = expandedProjects.has(project.id);

          return (
            <div key={project.id} className="mb-2">
              {/* Project Header */}
              <div
                className="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-white/5"
                onClick={() => toggleProject(project.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {project.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({projectRepos.length})
                  </span>
                </div>
                {projectRepos.length > 1 && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: '/cross-repo-analytics/$projectId',
                          params: { projectId: project.id },
                        });
                      }}
                      className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded transition-all"
                      title="View Cross-Repo Developer Analytics"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: '/cross-repo-codebase-health/$projectId',
                          params: { projectId: project.id },
                        });
                      }}
                      className="p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-orange-500 rounded transition-all"
                      title="View Cross-Repo Codebase Health"
                    >
                      <Heart className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: '/cross-repo-repository-evolution/$projectId',
                          params: { projectId: project.id },
                        });
                      }}
                      className="p-1 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-400 hover:text-purple-500 rounded transition-all"
                      title="View Cross-Repo Repository Evolution"
                    >
                      <TrendingUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: '/cross-repo-risk-analytics/$projectId',
                          params: { projectId: project.id },
                        });
                      }}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded transition-all"
                      title="View Cross-Repo Risk Analytics"
                    >
                      <Shield className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: '/cross-repo-technical-debt-indicators/$projectId',
                          params: { projectId: project.id },
                        });
                      }}
                      className="p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-400 hover:text-yellow-500 rounded transition-all"
                      title="View Cross-Repo Technical Debt Indicators"
                    >
                      <Wrench className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Repositories */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {projectRepos.map((repo) => {
                    const isSelected = currentRepoId === repo.id;
                    return (
                      <div
                        key={repo.id}
                        onClick={() => handleSelectRepository(repo)}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'hover:bg-gray-50 text-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FolderGit2
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                            }`}
                          />
                          <span className="text-sm font-medium truncate">{repo.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to remove this repository?')) {
                              handleDeleteRepository(repo.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                          title="Remove Repository"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No projects yet.
            <br />
            <Link to="/projects" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Click here to add one.
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
