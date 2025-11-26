import { useState, useRef } from 'react';
import { Loader2, FolderGit2 } from 'lucide-react';
import { uploadRepository } from '../api';

interface UploadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string;
}

export const UploadProjectModal: React.FC<UploadProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [repositoryName, setRepositoryName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      // Auto-fill repository name from filename if not already set
      if (!repositoryName) {
        const fileName = e.target.files[0].name;
        const nameWithoutExt = fileName.replace(/\.zip$/i, '');
        setRepositoryName(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading || !projectId) return;

    setIsUploading(true);
    setError(null);
    try {
      const name = repositoryName.trim() || undefined;
      await uploadRepository(selectedFile, projectId, name, replaceExisting);
      // Reset form
      setSelectedFile(null);
      setRepositoryName('');
      setReplaceExisting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error || err?.message || 'Failed to upload repository';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setRepositoryName('');
    setReplaceExisting(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Upload Repository</h3>
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
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isUploading || !projectId}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use the archive filename
            </p>
          </div>
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
                disabled={isUploading || !projectId}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Replace existing repository with the same path
              </span>
            </label>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository Archive (.zip)
            </label>
            <div
              className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                selectedFile
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
              onClick={handleDropZoneClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-2 text-center">
                <div
                  className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    selectedFile
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
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
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
              }}
              disabled={!selectedFile || isUploading || !projectId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
