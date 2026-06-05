import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getAnalyticsSummary } from '../../api/analyticsApi';
import { RevenueBars } from '../../components/charts/RevenueBars';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { RevenuePeriod } from '../../types/analytics';

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const revenuePeriodStorageKey = 'tutr.overviewRevenuePeriod';
const revenuePeriods: RevenuePeriod[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];

export function DashboardPage() {
  const [period, setPeriod] = useState<RevenuePeriod>(() => storedRevenuePeriod());
  const summary = useQuery({ queryKey: ['analytics', period], queryFn: () => getAnalyticsSummary(period) });
  const data = summary.data;

  useEffect(() => {
    localStorage.setItem(revenuePeriodStorageKey, period);
  }, [period]);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: { xs: 3, sm: 4 }, fontWeight: 600 }}>Overview</Typography>
      <ErrorAlert className="mb-6" error={summary.error} fallback="Could not load your dashboard. Please refresh the page." />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 3, mb: 4 }}>
        <Stat icon="dollar" label={`${currentPeriodLabel(period)} expected income`} value={money.format(data?.periodExpectedRevenue ?? 0)} />
        <Stat icon="check" label={`${currentPeriodLabel(period)} paid`} value={money.format(data?.periodPaidRevenue ?? 0)} />
        <Stat icon="alert" label={`${currentPeriodLabel(period)} outstanding`} value={money.format(data?.periodOutstandingRevenue ?? 0)} tone="warning" />
        <Stat icon="check" label="Completed lessons" value={String(data?.completedLessons ?? 0)} />
      </Box>

      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Income over time</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Expected lesson income by {periodNoun(period)}, split into paid and outstanding amounts.
            </Typography>
          </Box>
          <ToggleButtonGroup
            exclusive
            value={period}
            size="small"
            onChange={(_, value: RevenuePeriod | null) => value && setPeriod(value)}
            aria-label="Revenue period"
            sx={{
              alignSelf: { xs: 'flex-start', sm: 'center' },
              border: 1,
              borderColor: '#dddddd',
              borderRadius: 1.5,
              bgcolor: '#f5f5f5',
              p: 0.5,
              gap: 0.25,
              '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                color: 'text.secondary',
                fontSize: 14,
                fontWeight: 400,
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  fontWeight: 500,
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'background.paper',
                },
              },
            }}
          >
            {revenuePeriods.map((option) => (
              <ToggleButton key={option} value={option}>{periodOptionLabel(option)}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <RevenueBars data={data?.revenue ?? []} period={period} />
        </Box>
      </Paper>
    </Box>
  );
}

function storedRevenuePeriod(): RevenuePeriod {
  const stored = localStorage.getItem(revenuePeriodStorageKey) as RevenuePeriod | null;
  return stored && revenuePeriods.includes(stored) ? stored : 'WEEKLY';
}

function currentPeriodLabel(period: RevenuePeriod) {
  return ({ DAILY: "Today's", WEEKLY: "This week's", MONTHLY: "This month's", YEARLY: "This year's" } as const)[period];
}

function periodOptionLabel(period: RevenuePeriod) {
  return ({ DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' } as const)[period];
}

function periodNoun(period: RevenuePeriod) {
  return ({ DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' } as const)[period];
}

function Stat({ icon, label, value, tone = 'primary' }: { icon: IconName; label: string; value: string; tone?: 'primary' | 'warning' }) {
  const warning = tone === 'warning';
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', mb: 2, width: 48, height: 48, borderRadius: 2, bgcolor: warning ? '#fef3c7' : 'success.50', color: warning ? '#a16207' : 'primary.main' }}>
        <Icon name={icon} className="h-6 w-6" />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Paper>
  );
}
