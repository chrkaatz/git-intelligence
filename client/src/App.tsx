import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import { SummaryCards } from './components/SummaryCards';
import { ActivityChart } from './components/ActivityChart';
import { AuthorList } from './components/AuthorList';
import { ExtensionChart } from './components/ExtensionChart';
import { LocChart } from './components/LocChart';
import { DeveloperAnalytics } from './components/DeveloperAnalytics';
import { ProjectsList } from './components/ProjectsList';
import { UploadProjectModal } from './components/UploadProjectModal';
import {
  getStats,
  getDeveloperAnalytics,
  getProjects,
  getRepositories,
  addProject,
  removeProject,
  removeRepository,
  type GitStats,
  type Project,
  type Repository,
  type DeveloperAnalytics as DeveloperAnalyticsType,
} from './api';
import { Loader2, AlertCircle, Plus, Trash2, FolderGit2, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';

function App() {
  const [stats, setStats] = useState<GitStats | null>(null);
  const [developerAnalytics, setDeveloperAnalytics] =
    useState<DeveloperAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepoPath, setCurrentRepoPath] = useState<string>('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingRepository, setIsAddingRepository] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectList, repoList] = await Promise.all([
        getProjects(),
        getRepositories(),
      ]);
      setProjects(projectList);
      setRepositories(repoList);

      // Auto-expand projects with repositories
      const projectsWithRepos = new Set(repoList.map(r => r.projectId));
      setExpandedProjects(projectsWithRepos);

      // Select first repository if available
      if (repoList.length > 0 && !currentRepoPath) {
        setCurrentRepoPath(repoList[0].path);
      }
    } catch (err) {
      setError('Failed to load data');
    }
  };

  useEffect(() => {
    if (!currentRepoPath) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStats(currentRepoPath);
        setStats(data);
      } catch (err) {
        setError('Failed to load repository statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentRepoPath]);

  useEffect(() => {
    if (!currentRepoPath || currentView !== 'developer-analytics') {
      setDeveloperAnalytics(null);
      return;
    }

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setError(null);
      try {
        const data = await getDeveloperAnalytics(currentRepoPath);
        setDeveloperAnalytics(data);
      } catch (err) {
        setError('Failed to load developer analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentRepoPath, currentView]);

  const handleUploadSuccess = async () => {
    await loadData();
    // Set the new repository as current (it will be the last one added)
    const updatedRepos = await getRepositories();
    if (updatedRepos.length > 0) {
      setCurrentRepoPath(updatedRepos[updatedRepos.length - 1].path);
    }
  };

  const handleAddProject = async (name: string, description?: string) => {
    try {
      await addProject(name, description);
      await loadData();
      setIsAddingProject(false);
    } catch (err) {
      alert('Failed to add project');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this project and all its repositories?')) return;
    try {
      await removeProject(id);
      await loadData();
      if (repositories.find(r => r.projectId === id && r.path === currentRepoPath)) {
        const remainingRepos = repositories.filter(r => r.projectId !== id);
        if (remainingRepos.length > 0) {
          setCurrentRepoPath(remainingRepos[0].path);
        } else {
          setCurrentRepoPath('');
          setStats(null);
        }
      }
    } catch (err) {
      alert('Failed to remove project');
    }
  };

  const handleDeleteRepository = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this repository?')) return;
    try {
      const repo = repositories.find(r => r.id === id);
      await removeRepository(id);
      await loadData();
      if (repo && repo.path === currentRepoPath) {
        const updatedRepos = await getRepositories();
        if (updatedRepos.length > 0) {
          setCurrentRepoPath(updatedRepos[0].path);
        } else {
          setCurrentRepoPath('');
          setStats(null);
        }
      }
    } catch (err) {
      alert('Failed to remove repository');
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const projectRepoMap = new Map<string, Repository[]>();
  repositories.forEach(repo => {
    const repos = projectRepoMap.get(repo.projectId) || [];
    repos.push(repo);
    projectRepoMap.set(repo.projectId, repos);
  });

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Projects
        </h2>
        <button
          onClick={() => setIsAddingProject(true)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="Add Project">
          <Plus className="w-5 h-5" />
        </button>
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
                onClick={() => toggleProject(project.id)}>
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id, e);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                  title="Remove Project">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Repositories */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {projectRepos.map((repo) => {
                    const isSelected = currentRepoPath === repo.path;
                    return (
                      <div
                        key={repo.id}
                        onClick={() => setCurrentRepoPath(repo.path)}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'hover:bg-gray-50 text-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                        }`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FolderGit2
                            className={`w-4 h-4 shrink-0 ${
                              isSelected
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-400'
                            }`}
                          />
                          <span className="text-sm font-medium truncate">
                            {repo.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRepository(repo.id, e);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                          title="Remove Repository">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(project.id);
                      setIsAddingRepository(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Repository
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No projects yet.
            <br />
            Click + to add one.
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (currentView === 'projects') {
      return (
        <ProjectsList
          projects={projects}
          repositories={repositories}
          currentRepoPath={currentRepoPath}
          onSelectRepository={(path) => {
            setCurrentRepoPath(path);
            setCurrentView('dashboard');
          }}
          onDeleteProject={handleDeleteProject}
          onDeleteRepository={handleDeleteRepository}
          onAddProject={() => setIsAddingProject(true)}
          onAddRepository={(projectId) => {
            setSelectedProjectId(projectId);
            setIsAddingRepository(true);
          }}
        />
      );
    }

    if (currentView === 'developer-analytics') {
      return (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Developer Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {currentRepoPath
                ? `Analyzing developer contributions for ${currentRepoPath}`
                : 'Select a repository to view developer analytics'}
            </p>
          </div>

          {analyticsLoading && !developerAnalytics ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          ) : developerAnalytics ? (
            <DeveloperAnalytics authors={developerAnalytics.authors} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No repository selected. Select a repository from the list to view
              developer analytics.
            </div>
          )}
        </>
      );
    }

    // Default dashboard view
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {currentRepoPath
              ? `Analyzing ${currentRepoPath}`
              : 'Select a repository to view statistics'}
          </p>
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : stats ? (
          <>
            <SummaryCards stats={stats} />

            <LocChart data={stats.locHistory} />

            <ActivityChart activity={stats.activity} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AuthorList authors={stats.authors} />
              </div>
              <div>
                <ExtensionChart extensions={stats.extensions} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No repository selected. Select a repository from the list to view
            statistics.
          </div>
        )}
      </>
    );
  };

  return (
    <Layout
      sidebar={sidebar}
      currentView={currentView}
      onViewChange={setCurrentView}>
      <UploadProjectModal
        isOpen={isAddingRepository}
        onClose={() => {
          setIsAddingRepository(false);
          setSelectedProjectId(null);
        }}
        onSuccess={handleUploadSuccess}
        projectId={selectedProjectId || undefined}
      />
      {/* TODO: Add Project creation modal */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create New Project
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                handleAddProject(name, description || undefined);
              }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingProject(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderContent()}
    </Layout>
  );
}

export default App;
