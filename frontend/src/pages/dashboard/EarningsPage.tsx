import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getEarnings, importEarningsCsv } from '../../api/analyticsApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { ImportEarningsResponse } from '../../types/analytics';

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const hours = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });

export function EarningsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportEarningsResponse | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const earnings = useQuery({
    queryKey: ['earnings', page],
    queryFn: () => getEarnings(page),
    placeholderData: (previousData) => previousData,
  });
  const importCsv = useMutation({
    mutationFn: (selectedFile: File) => importEarningsCsv(selectedFile),
    onSuccess: (result) => {
      setImportResult(result);
      setFile(null);
      setShowImportModal(false);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
  const data = earnings.data;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review income from paid lessons week by week, including cancellation payments.</p>
      </div>

      <ErrorAlert className="mb-6" error={earnings.error} fallback="Could not load your earnings. Please refresh the page." />
      <ErrorAlert className="mb-6" error={importCsv.error} fallback="Could not import the CSV file. Please check the format and try again." />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <OverviewStat icon="dollar" label="Total earnings" value={money.format(data?.totalEarnings ?? 0)} />
        <OverviewStat icon="clock" label="Total hours" value={`${hours.format(data?.totalHours ?? 0)} hrs`} />
        <OverviewStat icon="dashboard" label="Average hourly rate" value={`${money.format(data?.averageHourlyRate ?? 0)}/hr`} />
      </div>

      <section className="mb-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-primary">
              <Icon name="upload" className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Historical earnings</h2>
              <p className="truncate text-xs text-muted-foreground">Import weekly CSV history or download a starter template.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="icon-button bg-white text-foreground hover:text-primary"
              href={csvTemplateUrl}
              download="tutr-earnings-template.csv"
              title="Download CSV template"
              aria-label="Download CSV template"
            >
              <Icon name="download" className="h-4 w-4" />
            </a>
            <button
              className="icon-button bg-white text-foreground hover:text-primary"
              type="button"
              title="Import earnings CSV"
              aria-label="Import earnings CSV"
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
              }}
            >
              <Icon name="upload" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {importResult && (
          <div className="mt-3 rounded-md bg-white/80 p-3 text-sm">
            <p className="font-medium text-foreground">
              Imported {importResult.importedRows} new rows and updated {importResult.updatedRows} existing rows.
            </p>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-destructive">
                <p className="font-medium">Some rows were skipped:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {importResult.errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {week.importedIncome > 0
                        ? `${money.format(week.importedIncome)} imported, ${money.format(week.lessonIncome)} from Tutr lessons`
                        : 'Monday to Sunday'}
                    </p>
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

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="import-earnings-title">
          <form
            className="w-full rounded-t-lg border border-border bg-card p-5 shadow-xl sm:mx-auto sm:max-w-lg sm:rounded-lg"
            onSubmit={(event) => {
              event.preventDefault();
              if (file) importCsv.mutate(file);
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="import-earnings-title" className="text-lg font-semibold text-foreground">Import historical earnings</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use CSV headers: Start Date, End Date, Weekly Hours, Weekly Income.</p>
              </div>
              <button type="button" className="button-secondary h-9 w-9 p-0" onClick={() => { setShowImportModal(false); setFile(null); }} aria-label="Close import form">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/40 px-4 py-5 text-center transition-colors hover:bg-muted">
              <Icon name="upload" className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{file ? file.name : 'Choose CSV file'}</span>
              <span className="mt-1 text-xs text-muted-foreground">CSV only, dates as dd/MM/yyyy</span>
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setImportResult(null);
                }}
              />
            </label>

            <div className="mt-4 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Example</p>
              <p className="mt-1 font-mono">25/05/2026,31/05/2026,5,350</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="button-secondary" onClick={() => { setShowImportModal(false); setFile(null); }}>Cancel</button>
              <button type="submit" className="button gap-2" disabled={!file || importCsv.isPending}>
                <Icon name="check" className="h-4 w-4" />
                {importCsv.isPending ? 'Importing...' : 'Confirm import'}
              </button>
            </div>
          </form>
        </div>
      )}
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

const csvTemplate = [
  'Start Date,End Date,Weekly Hours,Weekly Income',
  '25/05/2026,31/05/2026,5,350',
  '18/05/2026,24/05/2026,6,420',
].join('\n');

const csvTemplateUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`;
