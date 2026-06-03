import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../../api/authApi';
import { Icon, type IconName } from '../../components/ui/Icon';

const navItems: Array<[string, string, IconName]> = [
  ['/dashboard', 'Overview', 'dashboard'],
  ['/dashboard/students', 'Students', 'users'],
  ['/dashboard/lessons', 'Lessons', 'calendar'],
  ['/dashboard/earnings', 'Earnings', 'dollar'],
  ['/dashboard/enquiries', 'Enquiries', 'mail'],
  ['/dashboard/profile', 'Profile', 'user'],
];

export function DashboardLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:static md:flex md:min-h-screen md:w-64 md:flex-col md:border-r md:border-t-0">
        <Link to="/" className="hidden h-16 items-center gap-2 border-b border-sidebar-border px-6 md:flex">
          <Icon name="graduation" className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-semibold text-sidebar-foreground">Tutr</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-2 py-1.5 md:flex-1 md:flex-col md:p-4">
          {navItems.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `flex min-w-16 flex-col items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] transition-colors md:min-w-0 md:flex-row md:gap-3 md:px-3 md:py-2 md:text-sm ${
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <Icon name={icon} className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-4 md:block">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50" onClick={() => { logout(); navigate('/login'); }}>
            <Icon name="logout" className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto pb-16 md:pb-0">
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <Icon name="graduation" className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold">Tutr</span>
          </Link>
          <button className="button-secondary" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
