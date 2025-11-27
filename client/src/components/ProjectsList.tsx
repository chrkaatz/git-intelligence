import type { Project, Repository } from '../api';
import {
  FolderGit2,
  Trash2,
  ExternalLink,
  MapPin,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  BarChart3,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface ProjectsListProps {
  projects: Project[];
  repositories: Repository[];
  currentRepoId: string;
  onSelectRepository: (repoId: string) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onDeleteRepository: (id: string, e: React.MouseEvent) => void;
  onAddProject: () => void;
  onAddRepository: (projectId: string) => void;
  onReorderProjects: (projectIds: string[]) => void;
  onReorderRepositories: (projectId: string, repositoryIds: string[]) => void;
}

export function ProjectsList({
  projects,
  repositories,
  currentRepoId,
  onSelectRepository,
  onDeleteProject,
  onDeleteRepository,
  onAddProject,
  onAddRepository,
  onReorderProjects,
  onReorderRepositories,
}: ProjectsListProps) {
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  );
  const projectRepoMap = useMemo(() => {
    const map = new Map<string, Repository[]>();
    repositories.forEach((repo) => {
      const repos = map.get(repo.projectId) || [];
      repos.push(repo);
      map.set(repo.projectId, repos);
    });
    // Sort repositories by order within each project
    map.forEach((repos) => {
      repos.sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    });
    return map;
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

  const handleMoveProject = (projectId: string, direction: 'up' | 'down') => {
    const currentIndex = projects.findIndex((p) => p.id === projectId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= projects.length) return;

    const newProjects = [...projects];
    [newProjects[currentIndex], newProjects[newIndex]] = [
      newProjects[newIndex],
      newProjects[currentIndex],
    ];
    onReorderProjects(newProjects.map((p) => p.id));
  };

  const handleMoveRepository = (
    projectId: string,
    repositoryId: string,
    direction: 'up' | 'down'
  ) => {
    const projectRepos = projectRepoMap.get(projectId) || [];
    const currentIndex = projectRepos.findIndex((r) => r.id === repositoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= projectRepos.length) return;

    const newRepos = [...projectRepos];
    [newRepos[currentIndex], newRepos[newIndex]] = [newRepos[newIndex], newRepos[currentIndex]];
    onReorderRepositories(
      projectId,
      newRepos.map((r) => r.id)
    );
  };

  const totalRepos = repositories.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} with {totalRepos}{' '}
            {totalRepos === 1 ? 'repository' : 'repositories'}
          </p>
        </div>
        <button
          onClick={onAddProject}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <FolderOpen className="w-5 h-5" />
          Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Get started by creating your first project
          </p>
          <button
            onClick={onAddProject}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const projectRepos = projectRepoMap.get(project.id) || [];
            const isExpanded = expandedProjects.has(project.id);
            const hasRepos = projectRepos.length > 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                {/* Project Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {project.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {projectRepos.length}{' '}
                          {projectRepos.length === 1 ? 'repository' : 'repositories'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveProject(project.id, 'up');
                          }}
                          disabled={projects.findIndex((p) => p.id === project.id) === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveProject(project.id, 'down');
                          }}
                          disabled={
                            projects.findIndex((p) => p.id === project.id) === projects.length - 1
                          }
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>
                      </div>
                      {projectRepos.length > 1 && (
                        <button
                          onClick={() =>
                            navigate({
                              to: '/cross-repo-analytics/$projectId',
                              params: { projectId: project.id },
                            })
                          }
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Cross-Repo Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onAddRepository(project.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="Add Repository"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => onDeleteProject(project.id, e)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Repositories List */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {hasRepos ? (
                      projectRepos.map((repo) => {
                        const isSelected = currentRepoId === repo.id;
                        return (
                          <div
                            key={repo.id}
                            className={`px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                onClick={() => onSelectRepository(repo.id)}
                              >
                                <FolderGit2
                                  className={`w-4 h-4 shrink-0 ${
                                    isSelected
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-400'
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`text-sm font-medium ${
                                      isSelected
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-gray-900 dark:text-white'
                                    }`}
                                  >
                                    {repo.name}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <MapPin className="w-3 h-3 mr-1 shrink-0" />
                                    <span className="truncate" title={repo.path}>
                                      {repo.path}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveRepository(project.id, repo.id, 'up');
                                    }}
                                    disabled={projectRepos.findIndex((r) => r.id === repo.id) === 0}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveRepository(project.id, repo.id, 'down');
                                    }}
                                    disabled={
                                      projectRepos.findIndex((r) => r.id === repo.id) ===
                                      projectRepos.length - 1
                                    }
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move Down"
                                  >
                                    <ChevronDownIcon className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectRepository(repo.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Open Repository"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRepository(repo.id, e);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Delete Repository"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          No repositories in this project
                        </p>
                        <button
                          onClick={() => onAddRepository(project.id)}
                          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        >
                          Add Repository
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
