import { useQueryClient } from '@tanstack/react-query';
import { Button, Tooltip } from '@mui/material';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getGoogleCalendarStatus } from '../../api/calendarApi';
import { getAnalyticsSummary, getEarnings } from '../../api/analyticsApi';
import { logout } from '../../api/authApi';
import { listEnquiries } from '../../api/enquiryApi';
import { listLessons } from '../../api/lessonApi';
import { listStudents } from '../../api/studentApi';
import { getTutorProfile } from '../../api/tutorApi';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { RevenuePeriod } from '../../types/analytics';

const navItems: Array<[string, string, IconName]> = [
  ['/dashboard', 'Overview', 'dashboard'],
  ['/dashboard/students', 'Students', 'users'],
  ['/dashboard/lessons', 'Lessons', 'calendar'],
  ['/dashboard/earnings', 'Earnings', 'dollar'],
  ['/dashboard/enquiries', 'Enquiries', 'mail'],
  ['/dashboard/profile', 'Profile', 'user'],
];
// Beta Feedback
const feedbackEmail = import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined;
const githubIssuesUrl = import.meta.env.VITE_GITHUB_ISSUES_URL ?? 'https://github.com/gudluckman/Tutr/issues/new/choose';
const feedbackHref = feedbackEmail
  ? `mailto:${feedbackEmail}?subject=${encodeURIComponent('Tutr beta feedback')}`
  : githubIssuesUrl;
const feedbackTooltip = 'If you spot an issue with this app, help report it to the owner.';

export function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const prefetchDashboardRoute = (to: string) => {
    switch (to) {
      case '/dashboard': {
        const period = storedRevenuePeriod();
        queryClient.prefetchQuery({ queryKey: ['analytics', period], queryFn: () => getAnalyticsSummary(period) });
        break;
      }
      case '/dashboard/students':
        queryClient.prefetchQuery({ queryKey: ['students'], queryFn: listStudents });
        break;
      case '/dashboard/lessons':
        queryClient.prefetchQuery({ queryKey: ['lessons'], queryFn: listLessons });
        queryClient.prefetchQuery({ queryKey: ['students'], queryFn: listStudents });
        queryClient.prefetchQuery({ queryKey: ['google-calendar-status'], queryFn: getGoogleCalendarStatus });
        break;
      case '/dashboard/earnings':
        queryClient.prefetchQuery({ queryKey: ['earnings', 0, '', ''], queryFn: () => getEarnings(0) });
        break;
      case '/dashboard/enquiries':
        queryClient.prefetchQuery({ queryKey: ['enquiries'], queryFn: listEnquiries });
        break;
      case '/dashboard/profile':
        queryClient.prefetchQuery({ queryKey: ['profile'], queryFn: getTutorProfile });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar md:static md:flex md:min-h-screen md:w-64 md:flex-col md:border-r md:border-t-0">
        <Link to="/dashboard" className="hidden h-16 items-center gap-2 border-b border-sidebar-border px-6 md:flex">
          <Icon name="graduation" className="h-8 w-8 text-sidebar-primary" />
          <span className="text-xl font-semibold text-sidebar-foreground">Tutr</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-2 py-1.5 md:flex-1 md:flex-col md:p-4">
          {navItems.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onMouseEnter={() => prefetchDashboardRoute(to)}
              onFocus={() => prefetchDashboardRoute(to)}
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
          <Tooltip title={feedbackTooltip} placement="right" arrow>
            <a
              href={feedbackHref}
              target={feedbackEmail ? undefined : '_blank'}
              rel={feedbackEmail ? undefined : 'noreferrer'}
              className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
            >
              <Icon name="alert" className="h-5 w-5 shrink-0" />
              Beta feedback
            </a>
          </Tooltip>
          <Button
            fullWidth
            variant="text"
            color="inherit"
            startIcon={<Icon name="logout" className="h-5 w-5" />}
            sx={{ justifyContent: 'flex-start', color: 'var(--sidebar-foreground)' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Logout
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto pb-16 md:pb-0">
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Icon name="graduation" className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold">Tutr</span>
          </Link>
          <div className="flex items-center gap-2">
            <Tooltip title={feedbackTooltip} arrow>
              <Button component="a" href={feedbackHref} target={feedbackEmail ? undefined : '_blank'} rel={feedbackEmail ? undefined : 'noreferrer'} variant="text" size="small">
                Feedback
              </Button>
            </Tooltip>
            <Button variant="outlined" size="small" onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

function storedRevenuePeriod(): RevenuePeriod {
  const revenuePeriods: RevenuePeriod[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];
  const stored = localStorage.getItem('tutr.overviewRevenuePeriod') as RevenuePeriod | null;
  return stored && revenuePeriods.includes(stored) ? stored : 'WEEKLY';
}
