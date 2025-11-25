import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ProjectsList } from './ProjectsList';
import { UploadProjectModal } from './UploadProjectModal';
import { useApp } from '../context/AppContext';
import { getRepositories } from '../api';

export function ProjectsView() {
  const navigate = useNavigate();
  const { projects, repositories, handleAddProject, handleDeleteProject, handleDeleteRepository, refreshData } = useApp();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingRepository, setIsAddingRepository] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleUploadSuccess = async () => {
    await refreshData();
    // Get fresh repositories after upload
    const updatedRepos = await getRepositories();
    if (updatedRepos.length > 0) {
      const repo = updatedRepos[updatedRepos.length - 1];
      navigate({ to: '/dashboard/$repoPath', params: { repoPath: encodeURIComponent(repo.path) } });
    }
  };

  const handleAddProjectSubmit = async (name: string, description?: string) => {
    try {
      await handleAddProject(name, description);
      setIsAddingProject(false);
    } catch (err) {
      alert('Failed to add project');
    }
  };

  const handleDeleteProjectClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this project and all its repositories?')) return;
    try {
      await handleDeleteProject(id);
    } catch (err) {
      alert('Failed to remove project');
    }
  };

  const handleDeleteRepositoryClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this repository?')) return;
    try {
      await handleDeleteRepository(id);
    } catch (err) {
      alert('Failed to remove repository');
    }
  };

  const handleSelectRepository = (path: string) => {
    navigate({ to: '/dashboard/$repoPath', params: { repoPath: encodeURIComponent(path) } });
  };

  // Get current repo path from URL if on dashboard/developer-analytics
  const currentRepoPath = '';

  return (
    <>
      <UploadProjectModal
        isOpen={isAddingRepository}
        onClose={() => {
          setIsAddingRepository(false);
          setSelectedProjectId(null);
        }}
        onSuccess={handleUploadSuccess}
        projectId={selectedProjectId || undefined}
      />
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
                handleAddProjectSubmit(name, description || undefined);
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

      <ProjectsList
        projects={projects}
        repositories={repositories}
        currentRepoPath={currentRepoPath}
        onSelectRepository={handleSelectRepository}
        onDeleteProject={handleDeleteProjectClick}
        onDeleteRepository={handleDeleteRepositoryClick}
        onAddProject={() => setIsAddingProject(true)}
        onAddRepository={(projectId) => {
          setSelectedProjectId(projectId);
          setIsAddingRepository(true);
        }}
      />
    </>
  );
}

