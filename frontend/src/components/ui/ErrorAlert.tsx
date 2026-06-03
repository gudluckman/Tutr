import { apiErrorMessage } from '../../api/client';
import { Icon } from './Icon';

export function ErrorAlert({ error, fallback, className = '' }: { error: unknown; fallback?: string; className?: string }) {
  if (!error) return null;

  return (
    <div className={`flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 ${className}`} role="alert">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{apiErrorMessage(error, fallback)}</span>
    </div>
  );
}
