import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Chip, FormControl, IconButton, InputAdornment, InputLabel, Link, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Icon } from '../../../components/ui/Icon';
import type { Lesson, LessonStatus, PaymentStatus } from '../../../types/lesson';
import { searchMatcher, statusLabel, timeLabel, toDateInputValue, toTimeInputValue } from './lessonUtils';

export function LessonTable({ lessons, onEdit, onDelete }: { lessons: Lesson[]; onEdit: (lesson: Lesson) => void; onDelete: (lesson: Lesson) => void }) {
  const pageSize = 5;
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<'created' | 'date-desc' | 'date-asc'>('created');
  const [showFilters, setShowFilters] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [lessonStatus, setLessonStatus] = useState('');
  const studentOptions = useMemo(() => Array.from(new Map(lessons.map((lesson) => [lesson.studentId, lesson.studentName])).entries())
    .sort((a, b) => a[1].localeCompare(b[1])), [lessons]);
  const filteredLessons = useMemo(() => {
    const titleMatcher = searchMatcher(titleSearch);
    return lessons
      .filter((lesson) => !studentId || lesson.studentId === studentId)
      .filter((lesson) => !titleSearch || titleMatcher.test(lesson.title ?? ''))
      .filter((lesson) => !lessonDate || toDateInputValue(new Date(lesson.lessonDate)) === lessonDate)
      .filter((lesson) => !lessonTime || toTimeInputValue(new Date(lesson.lessonDate)) === lessonTime)
      .filter((lesson) => !paymentStatus || lesson.paymentStatus === paymentStatus)
      .filter((lesson) => !lessonStatus || lesson.status === lessonStatus)
      .sort((a, b) => sort === 'date-asc'
        ? new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()
        : sort === 'date-desc'
          ? new Date(b.lessonDate).getTime() - new Date(a.lessonDate).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lessonDate, lessonStatus, lessonTime, lessons, paymentStatus, sort, studentId, titleSearch]);
  const totalPages = Math.ceil(filteredLessons.length / pageSize);
  const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const firstRow = safePage * pageSize;
  const visibleLessons = filteredLessons.slice(firstRow, firstRow + pageSize);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    setPage(0);
  }, [lessonDate, lessonStatus, lessonTime, paymentStatus, sort, studentId, titleSearch]);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', bgcolor: 'background.paper', borderColor: '#e0e0e0', borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: { xs: 2, sm: 2.5 }, borderBottom: 1, borderColor: '#e0e0e0', alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 600 }}>Lesson history</Typography>
          <Typography variant="body2" color="text.secondary">{filteredLessons.length} of {lessons.length} lessons shown</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {filteredLessons.length > 0 && <Typography variant="body2" color="text.secondary">Showing {firstRow + 1}-{Math.min(firstRow + pageSize, filteredLessons.length)} of {filteredLessons.length}</Typography>}
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            sx={{ borderColor: '#d8d8d8', borderRadius: 1, color: 'text.primary', fontSize: 13, fontWeight: 500, textTransform: 'none' }}
          >
            Filters {showFilters ? '▲' : '▼'}
          </Button>
        </Stack>
      </Stack>
      {showFilters && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, p: 2, borderBottom: 1, borderColor: '#e0e0e0', bgcolor: '#fafafa' }}>
          <TextField
            label="Search title"
            value={titleSearch}
            onChange={(event) => setTitleSearch(event.target.value)}
            placeholder="Search for anything"
            size="small"
            sx={{ gridColumn: { xl: 'span 2' }, bgcolor: 'background.paper' }}
            slotProps={{
              input: {
              startAdornment: (
                <InputAdornment position="start">
              <Icon name="search" className="h-4 w-4" />
                </InputAdornment>
              ),
              },
            }}
          />
        <HistorySelect label="Student" value={studentId} onChange={setStudentId} options={studentOptions.map(([value, label]) => ({ value, label }))} placeholder="All students" />
        <HistoryInput label="Lesson date" type="date" value={lessonDate} onChange={setLessonDate} />
        <HistoryInput label="Start time" type="time" value={lessonTime} onChange={setLessonTime} />
        <HistorySelect label="Payment" value={paymentStatus} onChange={setPaymentStatus} options={['UNPAID', 'PAID', 'PARTIAL'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All payments" />
        <HistorySelect label="Lesson status" value={lessonStatus} onChange={setLessonStatus} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All statuses" />
          <Box sx={{ display: 'flex', alignItems: 'end', gridColumn: { xl: 'span 4' } }}>
          <Button variant="outlined" color="inherit" onClick={() => {
            setSort('created');
            setStudentId('');
            setTitleSearch('');
            setLessonDate('');
            setLessonTime('');
            setPaymentStatus('');
            setLessonStatus('');
          }}>Clear filters</Button>
          </Box>
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 430, bgcolor: 'background.paper' }}>
        <Table stickyHeader sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#fff', borderBottomColor: '#e0e0e0' } }}>
              <Th>Student</Th>
              <Th>Title</Th>
              <TableCell>
                <Button color="inherit" size="small" onClick={() => setSort((current) => current === 'date-desc' ? 'date-asc' : 'date-desc')} sx={{ px: 0.5, textTransform: 'none' }}>
                  Date & Time
                  <Box component="span" sx={{ ml: 0.5, color: sort === 'created' ? 'text.secondary' : 'primary.main', fontSize: 12 }}>{sort === 'date-asc' ? '▲' : '▼'}</Box>
                </Button>
              </TableCell>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th>Links</Th>
              <Th>Calendar</Th>
              <Th align="right">Actions</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleLessons.map((lesson) => (
              <TableRow key={lesson.id} hover sx={{ '& td': { borderBottomColor: '#e6e6e6' } }}>
                <TableCell>{lesson.studentName}</TableCell>
                <TableCell>{lesson.title}</TableCell>
                <TableCell>
                  <Typography variant="body2">{new Date(lesson.lessonDate).toLocaleDateString()}</Typography>
                  <Typography variant="body2" color="text.secondary">{timeLabel(lesson.lessonDate)}</Typography>
                </TableCell>
                <TableCell><StatusBadge status={lesson.status} /></TableCell>
                <TableCell><PaymentBadge status={lesson.paymentStatus} /></TableCell>
                <TableCell><LessonLinks lesson={lesson} /></TableCell>
                <TableCell><GoogleBadge lesson={lesson} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <IconButton size="small" onClick={() => onEdit(lesson)} aria-label={`Edit ${lesson.title || lesson.studentName}`}>
                      <Icon name="edit" className="h-4 w-4" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(lesson)} aria-label={`Delete ${lesson.title || lesson.studentName} and synced Google event`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredLessons.length === 0 && <Typography sx={{ p: 3 }} color="text.secondary">{lessons.length === 0 ? 'No lessons yet.' : 'No lessons match your filters.'}</Typography>}
      </TableContainer>
      <TablePagination
        component="div"
        rowsPerPageOptions={[pageSize]}
        count={filteredLessons.length}
        rowsPerPage={pageSize}
        page={safePage}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        sx={{ borderTop: 1, borderColor: '#e0e0e0', bgcolor: '#fafafa' }}
      />
    </Paper>
  );
}

function HistoryInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return <TextField label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} size="small" sx={{ bgcolor: 'background.paper' }} slotProps={{ inputLabel: { shrink: true } }} />;
}

function HistorySelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  return (
    <FormControl size="small" sx={{ bgcolor: 'background.paper' }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder && <MenuItem value="">{placeholder}</MenuItem>}
        {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function LessonLinks({ lesson }: { lesson: Lesson }) {
  return (
    <Stack spacing={0.25}>
      {lesson.googleMeetLink && <Link href={lesson.googleMeetLink} target="_blank" rel="noreferrer" underline="hover">Meeting</Link>}
      {lesson.miroBoardUrl && <Link href={lesson.miroBoardUrl} target="_blank" rel="noreferrer" underline="hover">Board</Link>}
      {!lesson.googleMeetLink && !lesson.miroBoardUrl && <Typography variant="body2" color="text.secondary">No links</Typography>}
    </Stack>
  );
}

function GoogleBadge({ lesson }: { lesson: Lesson }) {
  if (lesson.lessonSeriesId) return <Chip size="small" label="Series" sx={badgeSx('green')} />;
  if (!lesson.googleSyncEnabled) return <Chip size="small" label="Not synced" sx={badgeSx('gray')} />;
  if (lesson.googleSyncStatus === 'SYNCED') return <Chip size="small" label="Synced" sx={badgeSx('green')} />;
  if (lesson.googleSyncStatus === 'FAILED') {
    return (
      <Box sx={{ maxWidth: 208 }}>
        <Chip size="small" label="Failed" sx={badgeSx('red')} />
        {lesson.googleSyncError && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{lesson.googleSyncError}</Typography>}
      </Box>
    );
  }
  return <Chip size="small" label="Needs connection" sx={badgeSx('yellow')} />;
}

function StatusBadge({ status }: { status: LessonStatus }) {
  const colors: Record<LessonStatus, BadgeTone> = {
    SCHEDULED: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'gray',
    NO_SHOW: 'red',
  };
  return <Chip size="small" label={statusLabel(status)} sx={badgeSx(colors[status])} />;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, BadgeTone> = {
    PAID: 'green',
    UNPAID: 'red',
    PARTIAL: 'yellow',
  };
  return <Chip size="small" label={statusLabel(status)} sx={badgeSx(colors[status])} />;
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <TableCell align={align} sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary' }}>{children}</TableCell>;
}

type BadgeTone = 'blue' | 'green' | 'red' | 'yellow' | 'gray';

function badgeSx(tone: BadgeTone) {
  const palette: Record<BadgeTone, { bg: string; color: string }> = {
    blue: { bg: '#dbeafe', color: '#1d4ed8' },
    green: { bg: '#dcfce7', color: '#008a2e' },
    red: { bg: '#fee2e2', color: '#b91c1c' },
    yellow: { bg: '#fef3c7', color: '#a16207' },
    gray: { bg: '#f3f4f6', color: '#4b5563' },
  };
  return {
    height: 24,
    borderRadius: 1,
    bgcolor: palette[tone].bg,
    color: palette[tone].color,
    fontSize: 12,
    fontWeight: 500,
    '& .MuiChip-label': {
      px: 1,
    },
  };
}
