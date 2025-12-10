import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ProjectsList } from './ProjectsList';
import { AddRepoModal } from './AddRepoModal';
import { ConfirmationDialog } from './common/ConfirmationDialog';
import { useApp } from '../hooks/useApp';
import { useNotifications } from '../context/NotificationContext';
import { getRepositories } from '../api';

export function ProjectsView() {
  const navigate = useNavigate();
  const {
    projects,
    repositories,
    handleAddProject,
    handleDeleteProject,
    handleDeleteRepository,
    handleReorderProjects,
    handleReorderRepositories,
    refreshData,
  } = useApp();
  const { showNotification } = useNotifications();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingRepository, setIsAddingRepository] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Confirmation dialog state
  const [deleteProjectDialog, setDeleteProjectDialog] = useState<{
    open: boolean;
    projectId: string | null;
  }>({ open: false, projectId: null });
  const [deleteRepositoryDialog, setDeleteRepositoryDialog] = useState<{
    open: boolean;
    repositoryId: string | null;
  }>({ open: false, repositoryId: null });

  const handleUploadSuccess = async () => {
    await refreshData();
    // Get fresh repositories after upload
    const updatedRepos = await getRepositories();
    if (updatedRepos.length > 0) {
      const repo = updatedRepos[updatedRepos.length - 1];
      navigate({ to: '/dashboard/$repoId', params: { repoId: repo.id } });
    }
  };

  const handleAddProjectSubmit = async (name: string, description?: string) => {
    try {
      await handleAddProject(name, description);
      setIsAddingProject(false);
    } catch {
      showNotification('error', 'Failed to add project', 5000);
    }
  };

  const handleDeleteProjectClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteProjectDialog({ open: true, projectId: id });
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteProjectDialog.projectId) return;
    try {
      await handleDeleteProject(deleteProjectDialog.projectId);
      setDeleteProjectDialog({ open: false, projectId: null });
    } catch {
      showNotification('error', 'Failed to remove project', 5000);
      setDeleteProjectDialog({ open: false, projectId: null });
    }
  };

  const handleDeleteRepositoryClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteRepositoryDialog({ open: true, repositoryId: id });
  };

  const handleConfirmDeleteRepository = async () => {
    if (!deleteRepositoryDialog.repositoryId) return;
    try {
      await handleDeleteRepository(deleteRepositoryDialog.repositoryId);
      setDeleteRepositoryDialog({ open: false, repositoryId: null });
    } catch {
      showNotification('error', 'Failed to remove repository', 5000);
      setDeleteRepositoryDialog({ open: false, repositoryId: null });
    }
  };

  const handleSelectRepository = (repoId: string) => {
    // Save the repository ID as last selected
    if (typeof window !== 'undefined' && repoId) {
      localStorage.setItem('lastSelectedRepository', repoId);
    }
    navigate({ to: '/dashboard/$repoId', params: { repoId } });
  };

  // Get current repo ID from URL
  const currentRepoId = '';

  return (
    <>
      <AddRepoModal
        isOpen={isAddingRepository}
        onClose={() => {
          setIsAddingRepository(false);
          setSelectedProjectId(null);
        }}
        onSuccess={handleUploadSuccess}
        projectId={selectedProjectId || undefined}
      />

      <ConfirmationDialog
        open={deleteProjectDialog.open}
        onClose={() => setDeleteProjectDialog({ open: false, projectId: null })}
        onConfirm={handleConfirmDeleteProject}
        title="Remove Project"
        message="Are you sure you want to remove this project and all its repositories?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmationDialog
        open={deleteRepositoryDialog.open}
        onClose={() => setDeleteRepositoryDialog({ open: false, repositoryId: null })}
        onConfirm={handleConfirmDeleteRepository}
        title="Remove Repository"
        message="Are you sure you want to remove this repository?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
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
              }}
            >
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
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
        currentRepoId={currentRepoId}
        onSelectRepository={handleSelectRepository}
        onDeleteProject={handleDeleteProjectClick}
        onDeleteRepository={handleDeleteRepositoryClick}
        onAddProject={() => setIsAddingProject(true)}
        onAddRepository={(projectId) => {
          setSelectedProjectId(projectId);
          setIsAddingRepository(true);
        }}
        onReorderProjects={handleReorderProjects}
        onReorderRepositories={handleReorderRepositories}
      />
    </>
  );
}
