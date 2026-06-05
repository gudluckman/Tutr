import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

const PublicLayout = lazy(() => import('../components/layout/PublicLayout').then((module) => ({ default: module.PublicLayout })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const DashboardLayout = lazy(() => import('../pages/dashboard/DashboardLayout').then((module) => ({ default: module.DashboardLayout })));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const EnquiriesPage = lazy(() => import('../pages/dashboard/EnquiriesPage').then((module) => ({ default: module.EnquiriesPage })));
const EarningsPage = lazy(() => import('../pages/dashboard/EarningsPage').then((module) => ({ default: module.EarningsPage })));
const LessonsPage = lazy(() => import('../pages/dashboard/LessonsPage').then((module) => ({ default: module.LessonsPage })));
const ProfileSettingsPage = lazy(() => import('../pages/dashboard/ProfileSettingsPage').then((module) => ({ default: module.ProfileSettingsPage })));
const StudentsPage = lazy(() => import('../pages/dashboard/StudentsPage').then((module) => ({ default: module.StudentsPage })));
const HomePage = lazy(() => import('../pages/public/HomePage').then((module) => ({ default: module.HomePage })));
const TutorProfilePage = lazy(() => import('../pages/public/TutorProfilePage').then((module) => ({ default: module.TutorProfilePage })));
const TutorSearchPage = lazy(() => import('../pages/public/TutorSearchPage').then((module) => ({ default: module.TutorSearchPage })));

function withSuspense(element: ReactNode) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: withSuspense(<PublicLayout />),
    children: [
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/tutors', element: withSuspense(<TutorSearchPage />) },
      { path: '/tutors/:slug', element: withSuspense(<TutorProfilePage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: withSuspense(<DashboardLayout />),
        children: [
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/dashboard/students', element: withSuspense(<StudentsPage />) },
          { path: '/dashboard/lessons', element: withSuspense(<LessonsPage />) },
          { path: '/dashboard/earnings', element: withSuspense(<EarningsPage />) },
          { path: '/dashboard/enquiries', element: withSuspense(<EnquiriesPage />) },
          { path: '/dashboard/profile', element: withSuspense(<ProfileSettingsPage />) },
        ],
      },
    ],
  },
]);
