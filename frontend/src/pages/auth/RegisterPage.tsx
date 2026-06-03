import { useMutation } from '@tanstack/react-query';
import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/authApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';

export function RegisterPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate('/dashboard/profile'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      displayName: String(data.get('displayName')),
      email: String(data.get('email')),
      password: String(data.get('password')),
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Icon name="graduation" className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">Create your account</h1>
          <p className="text-muted-foreground">Start tutoring with Tutr</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <ErrorAlert error={mutation.error} fallback="Registration failed. Please check your details and try again." />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Display name</span>
              <input className="input" name="displayName" placeholder="Your full name" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
              <input className="input" name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
              <input className="input" name="password" type="password" minLength={8} placeholder="At least 8 characters" required />
            </label>
            <button className="button w-full py-2.5" disabled={mutation.isPending}>Register</button>
          </form>
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-center text-sm text-muted-foreground">
              After registering, you can complete your tutor profile and make it public.
            </p>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered? <Link className="text-primary hover:underline" to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
