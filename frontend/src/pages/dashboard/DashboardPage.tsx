import { useQuery } from '@tanstack/react-query';
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
    <div className="p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground sm:mb-8 sm:text-3xl">Overview</h1>
      <ErrorAlert className="mb-6" error={summary.error} fallback="Could not load your dashboard. Please refresh the page." />
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon="dollar" label={`${currentPeriodLabel(period)} expected income`} value={money.format(data?.periodExpectedRevenue ?? 0)} />
        <Stat icon="check" label={`${currentPeriodLabel(period)} paid`} value={money.format(data?.periodPaidRevenue ?? 0)} />
        <Stat icon="alert" label={`${currentPeriodLabel(period)} outstanding`} value={money.format(data?.periodOutstandingRevenue ?? 0)} tone="warning" />
        <Stat icon="check" label="Completed lessons" value={String(data?.completedLessons ?? 0)} />
      </div>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Income over time</h2>
            <p className="mt-1 text-sm text-muted-foreground">Expected lesson income by {periodNoun(period)}, split into paid and outstanding amounts.</p>
          </div>
          <div className="grid w-full grid-cols-2 rounded-lg border border-border bg-muted p-1 sm:inline-flex sm:w-auto">
            {revenuePeriods.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${period === option ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {periodOptionLabel(option)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <RevenueBars data={data?.revenue ?? []} period={period} />
        </div>
      </section>
    </div>
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
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${tone === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-accent text-primary'}`}>
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="mb-1 text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
