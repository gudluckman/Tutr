import { useMutation } from '@tanstack/react-query';
import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../api/authApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';

export function LoginPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate('/dashboard'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({ email: String(data.get('email')), password: String(data.get('password')) });
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Icon name="graduation" className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">Login to your Tutr account</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <ErrorAlert error={mutation.error} fallback="Login failed. Please check your details and try again." />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
              <input className="input" name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
              <input className="input" name="password" type="password" placeholder="Password" required />
            </label>
            <button className="button w-full py-2.5" disabled={mutation.isPending}>Login</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Tutr? <Link className="text-primary hover:underline" to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
