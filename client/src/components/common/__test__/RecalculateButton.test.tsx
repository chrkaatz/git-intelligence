import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecalculateButton } from '../RecalculateButton';

describe('RecalculateButton', () => {
  it('renders with "Recalculate" text when not loading', () => {
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} />);

    expect(screen.getByText('Recalculate')).toBeInTheDocument();
    expect(screen.queryByText('Recalculating...')).not.toBeInTheDocument();
  });

  it('renders with "Recalculating..." text when loading', () => {
    const handleClick = vi.fn();
    render(<RecalculateButton loading={true} onClick={handleClick} />);

    expect(screen.getByText('Recalculating...')).toBeInTheDocument();
    expect(screen.queryByText('Recalculate')).not.toBeInTheDocument();
  });

  it('shows spinning icon when loading', () => {
    const handleClick = vi.fn();
    const { container } = render(<RecalculateButton loading={true} onClick={handleClick} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('animate-spin');
  });

  it('does not show spinning icon when not loading', () => {
    const handleClick = vi.fn();
    const { container } = render(<RecalculateButton loading={false} onClick={handleClick} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).not.toHaveClass('animate-spin');
  });

  it('is disabled when loading', () => {
    const handleClick = vi.fn();
    render(<RecalculateButton loading={true} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is enabled when not loading', () => {
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onClick handler when clicked and not disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<RecalculateButton loading={true} onClick={handleClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick handler when disabled prop is true', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} disabled={true} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <RecalculateButton loading={false} onClick={handleClick} className="custom-class" />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('has correct base styling classes', () => {
    const handleClick = vi.fn();
    const { container } = render(<RecalculateButton loading={false} onClick={handleClick} />);

    const button = container.querySelector('button');
    expect(button).toHaveClass('flex', 'items-center', 'gap-2', 'px-4', 'py-2');
    expect(button).toHaveClass('text-sm', 'font-medium');
    expect(button).toHaveClass('rounded-lg');
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('has dark mode classes', () => {
    const handleClick = vi.fn();
    const { container } = render(<RecalculateButton loading={false} onClick={handleClick} />);

    const button = container.querySelector('button');
    expect(button).toHaveClass('dark:bg-gray-800', 'dark:text-gray-300', 'dark:border-gray-600');
  });

  it('allows explicit disabled={false} to override loading state', () => {
    const handleClick = vi.fn();
    // When disabled is explicitly false, it takes precedence over loading
    render(<RecalculateButton loading={true} onClick={handleClick} disabled={false} />);

    const button = screen.getByRole('button');
    // Explicit disabled={false} takes precedence, so button is enabled
    expect(button).not.toBeDisabled();
  });

  it('uses loading state when disabled prop is not provided', () => {
    const handleClick = vi.fn();
    // When disabled is not provided, loading state determines disabled status
    render(<RecalculateButton loading={true} onClick={handleClick} />);

    const button = screen.getByRole('button');
    // Since loading is true and disabled is undefined, button should be disabled
    expect(button).toBeDisabled();
  });

  it('handles multiple rapid clicks correctly', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<RecalculateButton loading={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
