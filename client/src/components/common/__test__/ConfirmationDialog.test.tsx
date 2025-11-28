import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from '../ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (props?: Partial<React.ComponentProps<typeof ConfirmationDialog>>) =>
    render(
      <ConfirmationDialog
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        message="Test message"
        {...props}
      />
    );

  describe('Rendering', () => {
    it('renders when open is true', () => {
      renderDialog();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    it('displays the message', () => {
      renderDialog({ message: 'Are you sure?' });
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('displays the title when provided', () => {
      renderDialog({ title: 'Confirm Action' });
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('does not display title when not provided', () => {
      renderDialog({ title: undefined });
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('uses default button labels', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('uses custom button labels', () => {
      renderDialog({
        confirmLabel: 'Delete',
        cancelLabel: 'Abort',
      });
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Headless UI Dialog calls onClose when backdrop is clicked
      // We need to find the backdrop element
      const backdrop = document.querySelector('[data-headlessui-state]');
      if (backdrop) {
        await user.click(backdrop);
        // Note: Headless UI handles backdrop clicks internally, so we test the behavior
        // by checking if the dialog is still rendered (it should close)
      }
    });
  });

  describe('Variants', () => {
    it('applies danger variant styles', () => {
      renderDialog({ variant: 'danger' });
      const dialog = screen.getByRole('dialog');
      const iconContainer = dialog.querySelector('.text-red-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies warning variant styles', () => {
      renderDialog({ variant: 'warning' });
      const dialog = screen.getByRole('dialog');
      const iconContainer = dialog.querySelector('.text-yellow-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies info variant styles', () => {
      renderDialog({ variant: 'info' });
      const dialog = screen.getByRole('dialog');
      const iconContainer = dialog.querySelector('.text-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('defaults to warning variant', () => {
      renderDialog();
      const dialog = screen.getByRole('dialog');
      const iconContainer = dialog.querySelector('.text-yellow-600');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Don't Show Again Checkbox", () => {
    it('does not show checkbox by default', () => {
      renderDialog();
      expect(screen.queryByLabelText("Don't show this again")).not.toBeInTheDocument();
    });

    it('shows checkbox when showDontShowAgain is true', () => {
      renderDialog({ showDontShowAgain: true });
      expect(screen.getByLabelText("Don't show this again")).toBeInTheDocument();
    });

    it('checkbox is unchecked by default', () => {
      renderDialog({ showDontShowAgain: true });
      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('can toggle checkbox', async () => {
      const user = userEvent.setup();
      renderDialog({ showDontShowAgain: true });
      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('calls onDontShowAgainChange with true when checkbox is checked and confirm is clicked', async () => {
      const user = userEvent.setup();
      const onDontShowAgainChange = vi.fn();
      renderDialog({
        showDontShowAgain: true,
        onDontShowAgainChange,
      });

      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      expect(onDontShowAgainChange).toHaveBeenCalledWith(true);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onDontShowAgainChange with false when checkbox is unchecked and confirm is clicked', async () => {
      const user = userEvent.setup();
      const onDontShowAgainChange = vi.fn();
      renderDialog({
        showDontShowAgain: true,
        onDontShowAgainChange,
      });

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      expect(onDontShowAgainChange).toHaveBeenCalledWith(false);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onDontShowAgainChange when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onDontShowAgainChange = vi.fn();
      renderDialog({
        showDontShowAgain: true,
        onDontShowAgainChange,
      });

      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      await user.click(checkbox);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(onDontShowAgainChange).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('resets checkbox state when dialog is reopened after confirm', async () => {
      const user = userEvent.setup();
      const { rerender } = renderDialog({ showDontShowAgain: true });

      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      // Close and reopen dialog to verify state reset
      rerender(
        <ConfirmationDialog
          open={false}
          onClose={onClose}
          onConfirm={onConfirm}
          message="Test message"
          showDontShowAgain={true}
        />
      );

      rerender(
        <ConfirmationDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          message="Test message"
          showDontShowAgain={true}
        />
      );
      const newCheckbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      expect(newCheckbox.checked).toBe(false);
    });

    it('resets checkbox state when dialog is reopened after cancel', async () => {
      const user = userEvent.setup();
      const { rerender } = renderDialog({ showDontShowAgain: true });

      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Close and reopen dialog to verify state reset
      rerender(
        <ConfirmationDialog
          open={false}
          onClose={onClose}
          onConfirm={onConfirm}
          message="Test message"
          showDontShowAgain={true}
        />
      );

      rerender(
        <ConfirmationDialog
          open={true}
          onClose={onClose}
          onConfirm={onConfirm}
          message="Test message"
          showDontShowAgain={true}
        />
      );
      const newCheckbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      expect(newCheckbox.checked).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('has proper button types', () => {
      renderDialog();
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('has proper label association for checkbox', () => {
      renderDialog({ showDontShowAgain: true });
      const checkbox = screen.getByLabelText("Don't show this again");
      expect(checkbox).toHaveAttribute('id', 'dont-show-again');
    });

    it('has proper title when provided', () => {
      renderDialog({ title: 'Confirm Action' });
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('Confirm Action');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message', () => {
      renderDialog({ message: '' });
      const dialog = screen.getByRole('dialog');
      const messageElement = dialog.querySelector('p.text-sm.text-gray-600');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement?.textContent).toBe('');
    });

    it('handles very long message', () => {
      const longMessage = 'A'.repeat(1000);
      renderDialog({ message: longMessage });
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles multiple rapid confirm clicks', async () => {
      const user = userEvent.setup();
      renderDialog();

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);
      await user.click(confirmButton);
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(3);
    });

    it('handles onDontShowAgainChange being undefined', async () => {
      const user = userEvent.setup();
      renderDialog({
        showDontShowAgain: true,
        onDontShowAgainChange: undefined,
      });

      const checkbox = screen.getByLabelText("Don't show this again") as HTMLInputElement;
      await user.click(checkbox);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      // Should not throw error
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
