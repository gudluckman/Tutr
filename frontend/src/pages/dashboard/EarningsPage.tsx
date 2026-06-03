import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getEarnings } from '../../api/analyticsApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon, type IconName } from '../../components/ui/Icon';

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const hours = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });

export function EarningsPage() {
  const [page, setPage] = useState(0);
  const earnings = useQuery({
    queryKey: ['earnings', page],
    queryFn: () => getEarnings(page),
    placeholderData: (previousData) => previousData,
  });
  const data = earnings.data;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review income from paid lessons week by week, including cancellation payments.</p>
      </div>

      <ErrorAlert className="mb-6" error={earnings.error} fallback="Could not load your earnings. Please refresh the page." />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <OverviewStat icon="dollar" label="Total earnings" value={money.format(data?.totalEarnings ?? 0)} />
        <OverviewStat icon="clock" label="Total hours" value={`${hours.format(data?.totalHours ?? 0)} hrs`} />
        <OverviewStat icon="dashboard" label="Average hourly rate" value={`${money.format(data?.averageHourlyRate ?? 0)}/hr`} />
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Weekly income</h2>
            <p className="text-sm text-muted-foreground">{data?.totalWeeks ?? 0} earning weeks recorded</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Page {data?.totalPages ? (data.page + 1) : 0} of {data?.totalPages ?? 0}
          </p>
        </div>

        <div className={`overflow-x-auto transition-opacity duration-200 ${earnings.isFetching ? 'opacity-70' : 'opacity-100'}`}>
          <table className="w-full min-w-[620px]">
            <thead className="border-b border-border bg-muted">
              <tr>
                <Th>Week</Th>
                <Th>Hours</Th>
                <Th align="right">Income</Th>
              </tr>
            </thead>
            <tbody>
              {data?.weeks.map((week) => (
                <tr key={week.weekStart} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">Monday, {dateLabel(week.weekStart)} - Sunday, {dateLabel(week.weekEnd)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Monday to Sunday</p>
                  </td>
                  <td className="px-6 py-4 text-foreground">{hours.format(week.hours)} hrs</td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground">{money.format(week.income)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.weeks.length === 0 && <p className="p-6 text-sm text-muted-foreground">No paid lesson earnings yet.</p>}
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <button className="button-secondary" disabled={!data || data.page === 0 || earnings.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Previous
          </button>
          <button className="button-secondary" disabled={!data || data.page + 1 >= data.totalPages || earnings.isFetching} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

function OverviewStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-6 py-3 text-sm font-medium text-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
