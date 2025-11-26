import { useState, useRef } from 'react';
import { Loader2, FolderGit2 } from 'lucide-react';
import { uploadRepository, addRepository } from '../api';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string;
}

export const AddRepoModal: React.FC<AddRepoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [repositoryName, setRepositoryName] = useState('');
  const [repositoryPath, setRepositoryPath] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'local'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }
    setSelectedFile(file);
    setError(null);
    // Auto-fill repository name from filename if not already set
    if (!repositoryName) {
      const fileName = file.name;
      const nameWithoutExt = fileName.replace(/\.zip$/i, '');
      setRepositoryName(nameWithoutExt);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setRepositoryName('');
    setRepositoryPath('');
    setReplaceExisting(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !projectId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const name = repositoryName.trim() || undefined;

      if (mode === 'upload') {
        if (!selectedFile) {
          setError('Please select a ZIP file to upload');
          return;
        }
        await uploadRepository(selectedFile, projectId, name, replaceExisting);
      } else {
        const trimmedPath = repositoryPath.trim();
        if (!trimmedPath) {
          setError('Please enter a repository folder path');
          return;
        }
        await addRepository(projectId, trimmedPath, name, replaceExisting);
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        (mode === 'upload' ? 'Failed to upload repository' : 'Failed to add repository');
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleDropZoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only trigger if clicking directly on the drop zone, not on child elements
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('label')) {
      return; // Let the label handle it naturally
    }
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on any child elements
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isSubmitting || !projectId) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 relative z-[101]"
        onClick={(e) => {
          // Stop all clicks inside modal from propagating to backdrop
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          // Stop mousedown events from propagating
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          // Prevent drag events from propagating to backdrop
          e.stopPropagation();
        }}
        onDrop={(e) => {
          // Prevent drop events from propagating to backdrop
          e.stopPropagation();
        }}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Add Repository to Project
        </h3>
        <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-sm dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Upload ZIP
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('local');
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 font-medium transition-colors ${
              mode === 'local'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Use Local Folder
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          {!projectId && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Please select a project first
              </p>
            </div>
          )}
          <div className="mb-4">
            <label
              htmlFor="repository-name"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Repository Name
            </label>
            <input
              id="repository-name"
              type="text"
              value={repositoryName}
              onChange={(e) => {
                setRepositoryName(e.target.value);
                setError(null);
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Enter repository name (optional)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              disabled={!projectId || isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use the archive filename or folder name
            </p>
          </div>
          {mode === 'local' && (
            <div className="mb-4">
              <label
                htmlFor="repository-path"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Repository Folder Path *
              </label>
              <input
                id="repository-path"
                type="text"
                value={repositoryPath}
                onChange={(e) => {
                  setRepositoryPath(e.target.value);
                  setError(null);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="e.g. /Users/you/projects/my-repo"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={!projectId || isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This should be the absolute path to a local Git repository folder on the server
                machine.
              </p>
            </div>
          )}
          {mode === 'upload' && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => {
                    setReplaceExisting(e.target.checked);
                    setError(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={isSubmitting || !projectId}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Replace existing repository with the same path
                </span>
              </label>
            </div>
          )}
          {mode === 'upload' && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Repository Archive (.zip)
              </label>
              <div
                className={`mt-1 flex cursor-pointer justify-center rounded-xl border-2 border-dashed px-6 pb-8 pt-8 transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                    : selectedFile
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:border-blue-500 dark:hover:bg-gray-900'
                }`}
                onClick={handleDropZoneClick}
                onMouseDown={(e) => e.stopPropagation()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-2 text-center">
                  <div
                    className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                      selectedFile
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                  >
                    <FolderGit2 className="h-6 w-6" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none dark:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{selectedFile ? 'Change file' : 'Upload a file'}</span>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".zip"
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className="pl-1 text-gray-500 dark:text-gray-400">
                      {!selectedFile && 'or drag and drop'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedFile ? (
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedFile.name}
                      </span>
                    ) : (
                      'ZIP archives up to 100MB'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
              }}
              disabled={
                !projectId ||
                isSubmitting ||
                (mode === 'upload' ? !selectedFile : !repositoryPath.trim())
              }
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'upload' ? 'Uploading…' : 'Adding…'}
                </>
              ) : mode === 'upload' ? (
                'Upload Repository'
              ) : (
                'Add Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
