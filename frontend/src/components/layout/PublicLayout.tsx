import { Link, Outlet } from 'react-router-dom';
import { Icon } from '../ui/Icon';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Icon name="graduation" className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-foreground">Tutr</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-6">
            <Link to="/tutors" className="hidden text-foreground transition-colors hover:text-primary sm:inline">Find tutors</Link>
            <Link to="/login" className="text-foreground transition-colors hover:text-primary">Login</Link>
            <Link to="/register" className="button px-3 text-xs sm:px-4 sm:text-sm">Start tutoring</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2026 Tutr. Helping independent tutors get found and run the week.
          </p>
        </div>
      </footer>
    </div>
  );
}
