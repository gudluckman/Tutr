import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { exportEarningsCsv, getEarnings, importEarningsCsv } from '../../api/analyticsApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon, type IconName } from '../../components/ui/Icon';
import type { ImportEarningsResponse } from '../../types/analytics';

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const hours = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });

export function EarningsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportEarningsResponse | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [replaceExistingImports, setReplaceExistingImports] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const earnings = useQuery({
    queryKey: ['earnings', page, selectedYear, selectedMonth],
    queryFn: () => getEarnings(page, numberOrUndefined(selectedYear), numberOrUndefined(selectedMonth)),
    placeholderData: (previousData) => previousData,
  });
  const importCsv = useMutation({
    mutationFn: ({ selectedFile, replaceExisting }: { selectedFile: File; replaceExisting: boolean }) => (
      importEarningsCsv(selectedFile, replaceExisting, setImportProgress)
    ),
    onMutate: () => {
      setImportResult(null);
      setImportProgress(0);
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportProgress(null);
      if (result.errors.length > 0) {
        return;
      }
      setFile(null);
      setShowImportModal(false);
      setReplaceExistingImports(false);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: () => {
      setImportProgress(null);
    },
  });
  const exportCsv = useMutation({
    mutationFn: () => exportEarningsCsv(numberOrUndefined(selectedYear), numberOrUndefined(selectedMonth)),
    onSuccess: (blob) => {
      if (!blob) {
        setExportMessage('No earning weeks to export yet.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFilename(selectedYear, selectedMonth);
      link.click();
      URL.revokeObjectURL(url);
      setExportMessage(null);
    },
  });
  const data = earnings.data;
  const rangeLabel = selectedYear
    ? selectedMonth
      ? monthLabel(`${selectedYear}-${selectedMonth.padStart(2, '0')}`)
      : selectedYear
    : 'all time';

  const handleExport = () => {
    if (!data || data.totalWeeks === 0) {
      setExportMessage('No earning weeks to export yet.');
      return;
    }
    exportCsv.mutate();
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review income from paid lessons week by week, including cancellation payments.</p>
      </div>

      <ErrorAlert className="mb-6" error={earnings.error} fallback="Could not load your earnings. Please refresh the page." />
      {!showImportModal && (
        <ErrorAlert className="mb-6" error={importCsv.error} fallback="Could not import the CSV file. Please check the format and try again." />
      )}
      <ErrorAlert className="mb-6" error={exportCsv.error} fallback="Could not export your earnings. Please try again." />
      {exportMessage && (
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {exportMessage}
        </div>
      )}

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
                setImportProgress(null);
                setReplaceExistingImports(false);
              }}
            >
              <Icon name="upload" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {importResult && !showImportModal && (
          <div className="mt-3 rounded-md bg-white/80 p-3 text-sm">
            <p className="font-medium text-foreground">
              Imported {importResult.importedRows} new rows and updated {importResult.updatedRows} existing rows.
            </p>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-destructive">
                <p className="font-medium">Import notes:</p>
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
            <p className="text-sm text-muted-foreground">{data?.totalWeeks ?? 0} earning weeks recorded for {rangeLabel}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <select
              className="h-10 rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
              value={selectedYear}
              aria-label="Filter earnings by year"
              onChange={(event) => {
                setSelectedYear(event.target.value);
                setSelectedMonth('');
                setPage(0);
              }}
            >
              <option value="">All time</option>
              {data?.availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedMonth}
              aria-label="Filter earnings by month"
              disabled={!selectedYear}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All months</option>
              {data?.availableMonths.map((month) => (
                <option key={month} value={month.slice(5, 7)}>{monthLabel(month)}</option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              Page {data?.totalPages ? (data.page + 1) : 0} of {data?.totalPages ?? 0}
            </p>
            <button
              className="icon-button border border-border bg-white text-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              title="Export earnings CSV"
              aria-label="Export earnings CSV"
              disabled={earnings.isLoading || exportCsv.isPending}
              onClick={handleExport}
            >
              <Icon name="csvDownload" className="h-4 w-4" />
            </button>
          </div>
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
              if (file) importCsv.mutate({ selectedFile: file, replaceExisting: replaceExistingImports });
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="import-earnings-title" className="text-lg font-semibold text-foreground">Import historical earnings</h2>
                <p className="mt-1 text-sm text-muted-foreground">Upload weekly earnings history using the exact column names below.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => { setShowImportModal(false); setFile(null); setReplaceExistingImports(false); setImportProgress(null); }}
                aria-label="Close import form"
                title="Close"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <ErrorAlert className="mb-4" error={importCsv.error} fallback="Could not import the CSV file. Please check the format and try again." />

            {importResult?.errors.length ? (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Fix these CSV issues and upload again.</p>
                <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-5">
                  {importResult.errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}
                </ul>
                {importResult.errors.length > 8 && (
                  <p className="mt-2 text-xs">Showing 8 of {importResult.errors.length} issues.</p>
                )}
              </div>
            ) : null}

            <div className="mb-4 overflow-hidden rounded-md border border-border">
              <div className="bg-muted px-3 py-2 text-xs font-medium text-foreground">Required weekly CSV format</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="border-b border-border bg-white">
                    <tr>
                      <FormatTh>Start Date</FormatTh>
                      <FormatTh>End Date</FormatTh>
                      <FormatTh>Weekly Hours</FormatTh>
                      <FormatTh>Weekly Income</FormatTh>
                    </tr>
                  </thead>
                  <tbody className="bg-card text-muted-foreground">
                    <tr className="border-b border-border">
                      <FormatTd>25/05/2026</FormatTd>
                      <FormatTd>31/05/2026</FormatTd>
                      <FormatTd>5</FormatTd>
                      <FormatTd>350</FormatTd>
                    </tr>
                    <tr>
                      <FormatTd>18/05/2026</FormatTd>
                      <FormatTd>24/05/2026</FormatTd>
                      <FormatTd>6</FormatTd>
                      <FormatTd>420</FormatTd>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/40 px-4 py-5 text-center transition-colors hover:bg-muted">
              <Icon name="upload" className="mb-2 h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{file ? file.name : 'Drop CSV file'}</span>
              <span className="mt-1 text-xs text-muted-foreground">CSV only, Monday-Sunday weeks, dates as dd/MM/yyyy</span>
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setImportResult(null);
                  setImportProgress(null);
                }}
              />
            </label>

            {importProgress !== null && (
              <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-foreground">
                  <span>{importProgress < 100 ? 'Uploading CSV' : 'Validating CSV'}</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            )}

            <label className="mt-4 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <input
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                type="checkbox"
                checked={replaceExistingImports}
                onChange={(event) => setReplaceExistingImports(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">Replace existing imported earnings</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Use this when fixing a previous upload. Tutr validates the CSV first, then replaces only imported history with this file.
                </span>
              </span>
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="button-secondary" onClick={() => { setShowImportModal(false); setFile(null); setReplaceExistingImports(false); setImportProgress(null); }}>Cancel</button>
              <button type="submit" className="button gap-2" disabled={!file || importCsv.isPending}>
                <Icon name="check" className="h-4 w-4" />
                {importCsv.isPending ? 'Importing...' : replaceExistingImports ? 'Replace imported history' : 'Confirm import'}
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

function FormatTh({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold text-foreground">{children}</th>;
}

function FormatTd({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 font-mono">{children}</td>;
}

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportDateStamp() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${today.getFullYear()}`;
}

function exportFilename(year: string, month: string) {
  const range = year
    ? month
      ? `${year}-${month.padStart(2, '0')}`
      : year
    : 'all_time';
  return `tutr_earnings_${range}_until_${exportDateStamp()}.csv`;
}

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

function numberOrUndefined(value: string) {
  return value ? Number(value) : undefined;
}

const csvTemplate = [
  'Start Date,End Date,Weekly Hours,Weekly Income',
  '25/05/2026,31/05/2026,5,350',
  '18/05/2026,24/05/2026,6,420',
].join('\n');

const csvTemplateUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`;
