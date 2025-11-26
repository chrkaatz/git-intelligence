import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddRepoModal } from '../AddRepoModal';
import * as api from '../../api';

describe('AddRepoModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const renderModal = (props?: Partial<React.ComponentProps<typeof AddRepoModal>>) =>
    render(
      <AddRepoModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        projectId="project-1"
        {...props}
      />
    );

  it('renders upload mode by default', () => {
    renderModal();

    expect(screen.getByText('Add Repository to Project')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload ZIP' }).getAttribute('type')).toBe('button');
    expect(screen.getByRole('button', { name: 'Use Local Folder' }).getAttribute('type')).toBe(
      'button'
    );
    expect(screen.getByText('Repository Archive (.zip)')).toBeTruthy();
  });

  it('switches to local folder mode', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Use Local Folder' }));

    expect(screen.getByText('Repository Folder Path *')).toBeTruthy();
    expect(screen.queryByText('Repository Archive (.zip)')).toBeNull();
  });

  it('calls uploadRepository when submitting in upload mode', async () => {
    const uploadSpy = vi.spyOn(api, 'uploadRepository').mockResolvedValue({
      id: 'repo-1',
      projectId: 'project-1',
      path: '/tmp/repo',
      name: 'repo',
    });

    renderModal();

    const file = new File(['dummy'], 'repo.zip', { type: 'application/zip' });
    const input = screen.getByLabelText(/upload a file/i) as HTMLInputElement;

    // Trigger the hidden file input via change event
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Repository' }));

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledTimes(1);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls addRepository when submitting in local folder mode', async () => {
    const addSpy = vi.spyOn(api, 'addRepository').mockResolvedValue({
      id: 'repo-1',
      projectId: 'project-1',
      path: '/tmp/repo',
      name: 'repo',
    });

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Use Local Folder' }));

    const pathInput = screen.getByLabelText('Repository Folder Path *');
    fireEvent.change(pathInput, { target: { value: '/tmp/repo' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Repository' }));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith('project-1', '/tmp/repo', undefined, false);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when required inputs are missing', () => {
    renderModal();

    // Upload mode: disabled when no file is selected
    expect(screen.getByRole('button', { name: 'Upload Repository' })).toHaveProperty(
      'disabled',
      true
    );

    // Local mode: disabled when no path is provided
    fireEvent.click(screen.getByRole('button', { name: 'Use Local Folder' }));
    expect(screen.getByRole('button', { name: 'Add Repository' })).toHaveProperty('disabled', true);
  });

  it('does not render when closed', () => {
    render(
      <AddRepoModal isOpen={false} onClose={onClose} onSuccess={onSuccess} projectId="project-1" />
    );

    expect(screen.queryByText('Add Repository to Project')).toBeNull();
  });
});
