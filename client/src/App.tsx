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
  removeProject,
  type GitStats,
  type Project,
  type DeveloperAnalytics as DeveloperAnalyticsType,
} from './api';
import { Loader2, AlertCircle, Plus, Trash2, FolderGit2 } from 'lucide-react';

function App() {
  const [stats, setStats] = useState<GitStats | null>(null);
  const [developerAnalytics, setDeveloperAnalytics] =
    useState<DeveloperAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await getProjects();
      setProjects(projectList);
      if (projectList.length > 0 && !currentPath) {
        setCurrentPath(projectList[0].path);
      }
    } catch (err) {
      setError('Failed to load projects');
    }
  };

  useEffect(() => {
    if (!currentPath) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStats(currentPath);
        setStats(data);
      } catch (err) {
        setError('Failed to load repository statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentPath]);

  useEffect(() => {
    if (!currentPath || currentView !== 'developer-analytics') {
      setDeveloperAnalytics(null);
      return;
    }

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      setError(null);
      try {
        const data = await getDeveloperAnalytics(currentPath);
        setDeveloperAnalytics(data);
      } catch (err) {
        setError('Failed to load developer analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentPath, currentView]);

  const handleUploadSuccess = async () => {
    await loadProjects();
    // Set the new project as current (it will be the last one added)
    const updatedProjects = await getProjects();
    if (updatedProjects.length > 0) {
      setCurrentPath(updatedProjects[updatedProjects.length - 1].path);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this project?')) return;
    try {
      await removeProject(id);
      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
      if (updatedProjects.length > 0) {
        setCurrentPath(updatedProjects[0].path);
      } else {
        setCurrentPath('');
        setStats(null);
      }
    } catch (err) {
      alert('Failed to remove project');
    }
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Projects
        </h2>
        <button
          onClick={() => setIsAddingProject(true)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="Add Repository">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => setCurrentPath(project.path)}
            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
              currentPath === project.path
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'hover:bg-gray-50 text-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
            }`}>
            <div className="flex items-center gap-3 min-w-0">
              <FolderGit2
                className={`w-5 h-5 shrink-0 ${
                  currentPath === project.path
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400'
                }`}
              />
              <span className="text-sm font-medium truncate">
                {project.name}
              </span>
            </div>
            <button
              onClick={(e) => handleDeleteProject(project.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
              title="Remove Project">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

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
          currentPath={currentPath}
          onSelectProject={(path) => {
            setCurrentPath(path);
            setCurrentView('dashboard');
          }}
          onDeleteProject={handleDeleteProject}
          onAddProject={() => setIsAddingProject(true)}
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
              {currentPath
                ? `Analyzing developer contributions for ${currentPath}`
                : 'Select a project to view developer analytics'}
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
              No project selected. Select a project from the list to view
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
            {currentPath
              ? `Analyzing ${currentPath}`
              : 'Select a project to view statistics'}
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
            No project selected. Select a project from the list to view
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
        isOpen={isAddingProject}
        onClose={() => setIsAddingProject(false)}
        onSuccess={handleUploadSuccess}
      />

      {renderContent()}
    </Layout>
  );
}

export default App;
