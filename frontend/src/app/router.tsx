import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardLayout } from '../pages/dashboard/DashboardLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { EnquiriesPage } from '../pages/dashboard/EnquiriesPage';
import { EarningsPage } from '../pages/dashboard/EarningsPage';
import { LessonsPage } from '../pages/dashboard/LessonsPage';
import { ProfileSettingsPage } from '../pages/dashboard/ProfileSettingsPage';
import { StudentsPage } from '../pages/dashboard/StudentsPage';
import { HomePage } from '../pages/public/HomePage';
import { TutorProfilePage } from '../pages/public/TutorProfilePage';
import { TutorSearchPage } from '../pages/public/TutorSearchPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/tutors', element: <TutorSearchPage /> },
      { path: '/tutors/:slug', element: <TutorProfilePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/dashboard/students', element: <StudentsPage /> },
          { path: '/dashboard/lessons', element: <LessonsPage /> },
          { path: '/dashboard/earnings', element: <EarningsPage /> },
          { path: '/dashboard/enquiries', element: <EnquiriesPage /> },
          { path: '/dashboard/profile', element: <ProfileSettingsPage /> },
        ],
      },
    ],
  },
]);
