import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#303f9f',
    },
    success: {
      main: '#16a34a',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={muiTheme}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
