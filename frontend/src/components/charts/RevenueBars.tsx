import type { RevenuePeriod, RevenuePoint } from '../../types/analytics';

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

export function RevenueBars({ data, period }: { data: RevenuePoint[]; period: RevenuePeriod }) {
  const max = Math.max(...data.map((item) => item.expectedRevenue), 1);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <ChartLegend colour="bg-primary" label="Paid" />
        <ChartLegend colour="bg-yellow-300" label="Outstanding" />
      </div>
      <div className="relative flex h-72 items-stretch gap-3 border-b border-border pt-12">
        <div className="pointer-events-none absolute inset-x-0 bottom-6 top-12 flex flex-col justify-between">
          {Array.from({ length: 4 }).map((_, index) => <span key={index} className="border-t border-dashed border-border/70" />)}
        </div>
        {data.length === 0 && <p className="self-center text-sm text-muted-foreground">No expected lesson income yet.</p>}
        {data.map((item) => (
          <div key={item.period} className="relative z-10 flex min-w-10 flex-1 flex-col items-center gap-2 hover:z-30 focus-within:z-30">
            <div className="group relative flex min-h-0 w-full flex-1 items-end" tabIndex={0} aria-label={`${periodLabel(item.period, period)} expected income ${money.format(item.expectedRevenue)}, paid ${money.format(item.paidRevenue)}, outstanding ${money.format(item.outstandingRevenue)}`}>
              <div className="pointer-events-none absolute left-1/2 top-3 z-20 min-w-52 -translate-x-1/2 translate-y-1 rounded-lg border border-border bg-card p-3 text-xs text-card-foreground opacity-0 shadow-lg transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100">
                <p className="mb-2 border-b border-border pb-2 text-sm font-semibold">{periodLabel(item.period, period)}</p>
                <TooltipRow colour="bg-neutral-300" label="Expected income" value={money.format(item.expectedRevenue)} />
                <TooltipRow colour="bg-primary" label="Paid" value={money.format(item.paidRevenue)} />
                <TooltipRow colour="bg-yellow-300" label="Outstanding" value={money.format(item.outstandingRevenue)} />
                <span className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
              </div>
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-md group-focus:-translate-y-1 group-focus:shadow-md"
                style={{ height: `${barHeight(item.expectedRevenue, max)}%` }}
              >
                {item.paidRevenue > 0 && <div className="bg-gradient-to-t from-primary to-green-400 transition-colors duration-300 group-hover:to-green-300" style={{ height: `${revenueShare(item.paidRevenue, item.expectedRevenue)}%` }} />}
                {item.outstandingRevenue > 0 && <div className="bg-yellow-300 transition-colors duration-300 group-hover:bg-yellow-200" style={{ height: `${revenueShare(item.outstandingRevenue, item.expectedRevenue)}%` }} />}
              </div>
            </div>
            <span className="text-center text-xs text-muted-foreground">{periodLabel(item.period, period)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ colour, label }: { colour: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${colour}`} />{label}</span>;
}

function TooltipRow({ colour, label, value }: { colour: string; label: string; value: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colour}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-semibold text-foreground">{value}</span>
    </div>
  );
}

function barHeight(amount: number, max: number) {
  return amount > 0 ? Math.max((amount / max) * 100, 6) : 0;
}

function revenueShare(amount: number, expectedRevenue: number) {
  return expectedRevenue > 0 ? amount / expectedRevenue * 100 : 0;
}

function periodLabel(value: string, period: RevenuePeriod) {
  if (period === 'YEARLY') return value;
  if (period === 'MONTHLY') {
    return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
