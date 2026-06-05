import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
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
      if (result.errors.length > 0) return;
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

  const closeImport = () => {
    setShowImportModal(false);
    setFile(null);
    setReplaceExistingImports(false);
    setImportProgress(null);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Earnings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Review income from paid lessons week by week, including cancellation payments.
        </Typography>
      </Box>

      <ErrorAlert className="mb-6" error={earnings.error} fallback="Could not load your earnings. Please refresh the page." />
      {!showImportModal && (
        <ErrorAlert className="mb-6" error={importCsv.error} fallback="Could not import the CSV file. Please check the format and try again." />
      )}
      <ErrorAlert className="mb-6" error={exportCsv.error} fallback="Could not export your earnings. Please try again." />
      {exportMessage && (
        <Paper variant="outlined" sx={{ mb: 3, borderColor: 'warning.light', bgcolor: 'warning.50', p: 2, color: 'warning.dark' }}>
          <Typography variant="body2">{exportMessage}</Typography>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 4 }}>
        <OverviewStat icon="dollar" label="Total earnings" value={money.format(data?.totalEarnings ?? 0)} />
        <OverviewStat icon="clock" label="Total hours" value={`${hours.format(data?.totalHours ?? 0)} hrs`} />
        <OverviewStat icon="dashboard" label="Average hourly rate" value={`${money.format(data?.averageHourlyRate ?? 0)}/hr`} />
      </Box>

      <Paper variant="outlined" sx={{ mb: 4, borderColor: 'success.light', bgcolor: 'success.50', p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 1.5, bgcolor: 'white', color: 'primary.main', flexShrink: 0 }}>
              <Icon name="historicalStats" className="h-4 w-4" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Historical earnings</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>Import weekly CSV history or download a starter template.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" sx={{ gap: 1 }}>
            <IconButton component="a" href={csvTemplateUrl} download="tutr-earnings-template.csv" title="Download CSV template" aria-label="Download CSV template" sx={{ bgcolor: 'white' }}>
              <Icon name="download" className="h-4 w-4" />
            </IconButton>
            <IconButton
              title="Import earnings CSV"
              aria-label="Import earnings CSV"
              sx={{ bgcolor: 'white' }}
              onClick={() => {
                setShowImportModal(true);
                setImportResult(null);
                setImportProgress(null);
                setReplaceExistingImports(false);
              }}
            >
              <Icon name="upload" className="h-4 w-4" />
            </IconButton>
          </Stack>
        </Stack>

        {importResult && !showImportModal && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'white' }} elevation={0}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Imported {importResult.importedRows} new rows and updated {importResult.updatedRows} existing rows.
            </Typography>
            {importResult.errors.length > 0 && (
              <Box sx={{ mt: 1.5, color: 'error.main' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Import notes:</Typography>
                <Box component="ul" sx={{ mt: 0.5, pl: 2.5 }}>
                  {importResult.errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: 'divider', p: { xs: 2, sm: 2.5 } }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Weekly income</Typography>
            <Typography variant="body2" color="text.secondary">{data?.totalWeeks ?? 0} earning weeks recorded for {rangeLabel}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end', gap: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 132 }}>
              <InputLabel id="earnings-year-label">Year</InputLabel>
              <Select
                labelId="earnings-year-label"
                label="Year"
                value={selectedYear}
                onChange={(event) => {
                  setSelectedYear(event.target.value);
                  setSelectedMonth('');
                  setPage(0);
                }}
              >
                <MenuItem value="">All time</MenuItem>
                {data?.availableYears.map((year) => <MenuItem key={year} value={String(year)}>{year}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 148 }} disabled={!selectedYear}>
              <InputLabel id="earnings-month-label">Month</InputLabel>
              <Select
                labelId="earnings-month-label"
                label="Month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All months</MenuItem>
                {data?.availableMonths.map((month) => (
                  <MenuItem key={month} value={month.slice(5, 7)}>{monthLabel(month)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Page {data?.totalPages ? (data.page + 1) : 0} of {data?.totalPages ?? 0}
            </Typography>
            <IconButton
              type="button"
              title="Export earnings CSV"
              aria-label="Export earnings CSV"
              disabled={earnings.isLoading || exportCsv.isPending}
              onClick={handleExport}
            >
              <Icon name="csvDownload" className="h-4 w-4" />
            </IconButton>
          </Stack>
        </Stack>

        <TableContainer sx={{ opacity: earnings.isFetching ? 0.7 : 1, transition: 'opacity 160ms ease' }}>
          <Table sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <HeaderCell>Week</HeaderCell>
                <HeaderCell>Hours</HeaderCell>
                <HeaderCell align="right">Income</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.weeks.map((week) => (
                <TableRow key={week.weekStart} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Monday, {dateLabel(week.weekStart)} - Sunday, {dateLabel(week.weekEnd)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {week.importedIncome > 0
                        ? `${money.format(week.importedIncome)} imported, ${money.format(week.lessonIncome)} from Tutr lessons`
                        : 'Monday to Sunday'}
                    </Typography>
                  </TableCell>
                  <TableCell>{hours.format(week.hours)} hrs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>{money.format(week.income)}</TableCell>
                </TableRow>
              ))}
              {data?.weeks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">No paid lesson earnings yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button variant="outlined" disabled={!data || data.page === 0 || earnings.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          <Button variant="outlined" disabled={!data || data.page + 1 >= data.totalPages || earnings.isFetching} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </Stack>
      </Paper>

      <Dialog open={showImportModal} onClose={closeImport} fullWidth maxWidth="sm" aria-labelledby="import-earnings-title">
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (file) importCsv.mutate({ selectedFile: file, replaceExisting: replaceExistingImports });
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <Box>
                <Typography id="import-earnings-title" variant="h6" sx={{ fontWeight: 600 }}>Import historical earnings</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Upload weekly earnings history using the exact column names below.</Typography>
              </Box>
              <IconButton type="button" onClick={closeImport} aria-label="Close import form" title="Close">
                <Icon name="x" className="h-5 w-5" />
              </IconButton>
            </Stack>

            <ErrorAlert className="mb-4" error={importCsv.error} fallback="Could not import the CSV file. Please check the format and try again." />

            {importResult?.errors.length ? (
              <Paper variant="outlined" sx={{ mb: 2, borderColor: 'error.light', bgcolor: 'error.50', p: 1.5, color: 'error.main' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Fix these CSV issues and upload again.</Typography>
                <Box component="ul" sx={{ mt: 1, maxHeight: 128, overflowY: 'auto', pl: 2.5, fontSize: 14 }}>
                  {importResult.errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}
                </Box>
                {importResult.errors.length > 8 && (
                  <Typography variant="caption">Showing 8 of {importResult.errors.length} issues.</Typography>
                )}
              </Paper>
            ) : null}

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.50', px: 1.5, py: 1, fontSize: 12, fontWeight: 500 }}>Required weekly CSV format</Box>
              <Table size="small" sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <FormatCell header>Start Date</FormatCell>
                    <FormatCell header>End Date</FormatCell>
                    <FormatCell header>Weekly Hours</FormatCell>
                    <FormatCell header>Weekly Income</FormatCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <FormatCell>25/05/2026</FormatCell>
                    <FormatCell>31/05/2026</FormatCell>
                    <FormatCell>5</FormatCell>
                    <FormatCell>350</FormatCell>
                  </TableRow>
                  <TableRow>
                    <FormatCell>18/05/2026</FormatCell>
                    <FormatCell>24/05/2026</FormatCell>
                    <FormatCell>6</FormatCell>
                    <FormatCell>420</FormatCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Paper
              component="label"
              variant="outlined"
              sx={{ display: 'flex', minHeight: 112, cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', bgcolor: 'grey.50', px: 2, py: 2.5, textAlign: 'center' }}
            >
              <Icon name="upload" className="mb-2 h-6 w-6 text-muted-foreground" />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{file ? file.name : 'Drop CSV file'}</Typography>
              <Typography variant="caption" color="text.secondary">CSV only, Monday-Sunday weeks, dates as dd/MM/yyyy</Typography>
              <Box
                component="input"
                sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
                type="file"
                accept=".csv,text/csv"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setFile(event.target.files?.[0] ?? null);
                  setImportResult(null);
                  setImportProgress(null);
                }}
              />
            </Paper>

            {importProgress !== null && (
              <Paper variant="outlined" sx={{ mt: 2, bgcolor: 'grey.50', p: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>{importProgress < 100 ? 'Uploading CSV' : 'Validating CSV'}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>{importProgress}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={importProgress} />
              </Paper>
            )}

            <FormControlLabel
              sx={{ mt: 2, alignItems: 'flex-start', border: 1, borderColor: 'warning.light', bgcolor: 'warning.50', borderRadius: 1.5, p: 1.5, mx: 0 }}
              control={<Checkbox checked={replaceExistingImports} onChange={(event) => setReplaceExistingImports(event.target.checked)} />}
              label={(
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Replace existing imported earnings</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use this when fixing a previous upload. Tutr validates the CSV first, then replaces only imported history with this file.
                  </Typography>
                </Box>
              )}
            />

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
              <Button variant="outlined" type="button" onClick={closeImport}>Cancel</Button>
              <Button variant="contained" type="submit" startIcon={<Icon name="check" className="h-4 w-4" />} disabled={!file || importCsv.isPending}>
                {importCsv.isPending ? 'Importing...' : replaceExistingImports ? 'Replace imported history' : 'Confirm import'}
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function OverviewStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', mb: 2, width: 40, height: 40, borderRadius: 2, bgcolor: 'success.50', color: 'primary.main' }}>
        <Icon name={icon} className="h-5 w-5" />
      </Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 600 }}>{value}</Typography>
    </Paper>
  );
}

function HeaderCell({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <TableCell align={align} sx={{ fontSize: 14, fontWeight: 500 }}>{children}</TableCell>;
}

function FormatCell({ children, header = false }: { children: ReactNode; header?: boolean }) {
  return <TableCell sx={{ fontFamily: header ? undefined : 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, fontWeight: header ? 700 : 400 }}>{children}</TableCell>;
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
