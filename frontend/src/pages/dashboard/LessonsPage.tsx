import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGoogleCalendarAuthUrl, getGoogleCalendarStatus, syncGoogleCalendarChanges } from '../../api/calendarApi';
import { createLesson, createRecurringLessons, deleteFollowingLessons, deleteLesson, deleteLessonSeries, listLessons, updateLesson, updateLessonStatuses } from '../../api/lessonApi';
import { listStudents } from '../../api/studentApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Lesson, LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../types/lesson';
import type { Student } from '../../types/student';
import { emptyLesson, emptyRecurring, googleCalendarSyncStorageKey, lessonStatusStyles, paymentStatusStyles } from './lessons/constants';
import { DeleteLessonDialog } from './lessons/DeleteLessonDialog';
import { GoogleCalendarPanel } from './lessons/GoogleCalendarPanel';
import { RecurringFields, SingleLessonFields } from './lessons/LessonFormFields';
import { LessonTable } from './lessons/LessonTable';
import type { CalendarView, FormMode, LessonDeleteScope, LessonsWorkspaceView } from './lessons/types';
import {
  addDays,
  calendarPaymentPalette,
  calendarRangeLabel,
  calendarViewDate,
  isSameDay,
  isGeneratedLessonTitle,
  lessonAmount,
  lessonTimeRange,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
  searchMatcher,
  statusLabel,
  subjectOptionsForStudent,
  timeLabel,
  toDateTimeLocal,
} from './lessons/lessonUtils';

type LessonFiltersState = {
  search: string;
  studentId: string;
  schoolYear: string;
  subject: string;
  lessonStatus: string;
  paymentStatus: string;
};

const emptyLessonFilters: LessonFiltersState = {
  search: '',
  studentId: '',
  schoolYear: '',
  subject: '',
  lessonStatus: '',
  paymentStatus: '',
};

export function LessonsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<FormMode>('single');
  const [workspaceView, setWorkspaceView] = useState<LessonsWorkspaceView>('CALENDAR');
  const [calendarView, setCalendarView] = useState<CalendarView>('WEEKLY');
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonPayload>(emptyLesson);
  const [recurringForm, setRecurringForm] = useState<RecurringLessonPayload>(emptyRecurring);
  const [filters, setFilters] = useState<LessonFiltersState>(emptyLessonFilters);

  const lessons = useQuery({ queryKey: ['lessons'], queryFn: listLessons });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const googleStatus = useQuery({ queryKey: ['google-calendar-status'], queryFn: getGoogleCalendarStatus });
  const calendarError = searchParams.get('calendarError');
  const lessonList = lessons.data ?? [];
  const studentList = students.data ?? [];
  const filteredLessons = useMemo(() => filterLessons(lessonList, studentList, filters), [filters, lessonList, studentList]);

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, lessonDate: new Date(form.lessonDate).toISOString(), syncToGoogle: form.syncToGoogle };
      return editing ? updateLesson(editing.id, payload) : createLesson(payload);
    },
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setCalendarDate(startOfDay(new Date(lesson.lessonDate)));
      resetForm();
    },
  });

  const saveRecurring = useMutation({
    mutationFn: () => createRecurringLessons({
      ...recurringForm,
      intervalCount: recurringForm.intervalCount || undefined,
      firstLessonDate: new Date(recurringForm.firstLessonDate).toISOString(),
      recurrenceUntil: recurringForm.recurrenceUntil ? new Date(recurringForm.recurrenceUntil).toISOString() : undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      const firstLesson = data.lessons[0];
      if (firstLesson) {
        setCalendarDate(startOfDay(new Date(firstLesson.lessonDate)));
      }
      resetForm();
    },
  });

  const remove = useMutation({
    mutationFn: ({ lesson, scope }: { lesson: Lesson; scope: LessonDeleteScope }) => (
      scope === 'SERIES' ? deleteLessonSeries(lesson.id) : scope === 'FOLLOWING' ? deleteFollowingLessons(lesson.id) : deleteLesson(lesson.id)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setDeletingLesson(null);
    },
  });

  const updateStatuses = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: string; status?: LessonStatus; paymentStatus?: PaymentStatus }) => updateLessonStatuses(id, { status, paymentStatus }),
    onSuccess: (updatedLesson) => {
      queryClient.setQueryData<Lesson[]>(['lessons'], (currentLessons = []) => currentLessons.map((lesson) => lesson.id === updatedLesson.id ? updatedLesson : lesson));
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const connectGoogle = useMutation({
    mutationFn: getGoogleCalendarAuthUrl,
    onSuccess: (data) => {
      if (data.authUrl) window.location.href = data.authUrl;
    },
  });

  const syncGoogleCalendar = useMutation({
    mutationFn: syncGoogleCalendarChanges,
    onSuccess: (data) => {
      sessionStorage.setItem(googleCalendarSyncStorageKey, String(Date.now()));
      if (data.updatedLessons > 0 || data.deletedLessons > 0) {
        queryClient.invalidateQueries({ queryKey: ['lessons'] });
      }
    },
  });

  useEffect(() => {
    if (!googleStatus.data?.connected) {
      return;
    }
    const syncIfStale = () => {
      const lastSyncAt = Number(sessionStorage.getItem(googleCalendarSyncStorageKey) ?? 0);
      if (Date.now() - lastSyncAt > 60_000 && !syncGoogleCalendar.isPending) {
        syncGoogleCalendar.mutate();
      }
    };
    syncIfStale();
    const interval = window.setInterval(syncIfStale, 60_000);
    const syncOnFocus = () => {
      if (document.visibilityState === 'visible') {
        syncIfStale();
      }
    };
    document.addEventListener('visibilitychange', syncOnFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', syncOnFocus);
    };
  }, [googleStatus.data?.connected, syncGoogleCalendar.isPending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'recurring' && !editing) {
      saveRecurring.mutate();
      return;
    }
    save.mutate();
  }

  function edit(lesson: Lesson) {
    setEditing(lesson);
    setMode('single');
    setForm({
      studentId: lesson.studentId,
      title: lesson.title ?? '',
      lessonDate: toDateTimeLocal(new Date(lesson.lessonDate)),
      durationMinutes: lesson.durationMinutes,
      hourlyRate: lesson.hourlyRate,
      status: lesson.status,
      paymentStatus: lesson.paymentStatus,
      lessonNotes: lesson.lessonNotes ?? '',
      homework: lesson.homework ?? '',
      miroBoardUrl: lesson.miroBoardUrl ?? '',
      lessonLinks: lessonLinksForForm(lesson),
      inviteEmail: lesson.inviteEmail ?? '',
      googleColorId: lesson.googleColorId ?? '',
      googleExtraReminderMinutes: lesson.googleExtraReminderMinutes ?? null,
      syncToGoogle: Boolean(lesson.googleSyncEnabled),
      googleSyncEnabled: lesson.googleSyncEnabled,
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditing(null);
    setMode('single');
    setForm(emptyLesson);
    setRecurringForm(emptyRecurring);
    setShowForm(false);
  }

  function removeLesson(lesson: Lesson) {
    setDeletingLesson(lesson);
  }

  function confirmRemoveLesson(scope: LessonDeleteScope) {
    if (deletingLesson) {
      remove.mutate({ lesson: deletingLesson, scope });
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: { xs: 3, sm: 4 } }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Lessons</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <ToggleButtonGroup
            exclusive
            value={workspaceView}
            size="small"
            onChange={(_, value: LessonsWorkspaceView | null) => value && setWorkspaceView(value)}
            aria-label="Lesson workspace view"
            fullWidth
            sx={segmentedControlSx}
          >
            {(['CALENDAR', 'TABLE'] as LessonsWorkspaceView[]).map((option) => (
              <ToggleButton key={option} value={option}>{statusLabel(option)}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<Icon name="plus" className="h-4 w-4" />}
            onClick={() => setShowForm(true)}
            sx={{ minWidth: 112, whiteSpace: 'nowrap', fontSize: 12, px: 1.75 }}
          >
            Add lesson
          </Button>
        </Stack>
      </Stack>

      <GoogleCalendarPanel
        configured={Boolean(googleStatus.data?.configured)}
        connected={Boolean(googleStatus.data?.connected)}
        email={googleStatus.data?.googleAccountEmail}
        onConnect={() => connectGoogle.mutate()}
        isConnecting={connectGoogle.isPending}
        onSyncChanges={() => syncGoogleCalendar.mutate()}
        isSyncingChanges={syncGoogleCalendar.isPending}
      />

      <ErrorAlert className="mb-6" error={lessons.error} fallback="Could not load lessons. Please refresh the page." />
      <ErrorAlert className="mb-6" error={students.error} fallback="Could not load students for lesson scheduling. Please refresh the page." />
      <ErrorAlert className="mb-6" error={googleStatus.error} fallback="Could not load Google Calendar status. Please refresh the page." />
      <ErrorAlert className="mb-6" error={connectGoogle.error} fallback="Could not start Google Calendar connection. Please try again." />
      <ErrorAlert className="mb-6" error={syncGoogleCalendar.error} fallback="Could not sync Google Calendar changes. Please try again." />
      <ErrorAlert className="mb-6" error={remove.error} fallback="Could not delete the lesson. Please try again." />
      <ErrorAlert className="mb-6" error={updateStatuses.error} fallback="Could not update the lesson status. Please try again." />

      {deletingLesson && (
        <DeleteLessonDialog
          lesson={deletingLesson}
          isDeleting={remove.isPending}
          onClose={() => setDeletingLesson(null)}
          onConfirm={confirmRemoveLesson}
        />
      )}

      {calendarError && (
        <Paper variant="outlined" sx={{ mb: 3, borderColor: 'error.light', bgcolor: 'error.50', p: 2, color: 'error.dark', fontSize: 14 }}>
          {calendarError === 'oauth'
            ? 'Google did not grant Calendar access. Make sure you choose your listed test account, press Continue on the unverified-app screen, and allow the Calendar permission.'
            : 'Google Calendar could not finish connecting. Check that the OAuth client secret and redirect URI match your Google Cloud settings.'}
        </Paper>
      )}

      {showForm && (
        <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{editing ? 'Edit lesson' : mode === 'recurring' ? 'Add recurring lessons' : 'Add lesson'}</Typography>
              {!editing && (
                <ToggleButtonGroup
                  exclusive
                  value={mode}
                  size="small"
                  onChange={(_, value: FormMode | null) => value && setMode(value)}
                  aria-label="Lesson form mode"
                  sx={{ ...segmentedControlSx, mt: 1.5 }}
                >
                  <ToggleButton value="single">Single</ToggleButton>
                  <ToggleButton value="recurring">Recurring</ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>
            <IconButton onClick={resetForm} type="button" aria-label="Close form">
              <Icon name="x" className="h-5 w-5" />
            </IconButton>
          </Stack>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <ErrorAlert className="md:col-span-2" error={mode === 'recurring' && !editing ? saveRecurring.error : save.error} fallback="Could not save the lesson. Please check the details and try again." />
            {mode === 'recurring' && !editing ? (
              <RecurringFields form={recurringForm} setForm={setRecurringForm} students={students.data ?? []} googleConnected={Boolean(googleStatus.data?.connected)} />
            ) : (
              <SingleLessonFields form={form} setForm={setForm} students={students.data ?? []} googleConnected={Boolean(googleStatus.data?.connected)} />
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5 }} className="md:col-span-2">
              <Button variant="contained" type="submit" disabled={save.isPending || saveRecurring.isPending}>
                {editing ? 'Update lesson' : mode === 'recurring' ? 'Create recurring lessons' : 'Add lesson'}
              </Button>
              <Button variant="outlined" type="button" onClick={resetForm}>Cancel</Button>
            </Stack>
          </form>
        </Paper>
      )}

      <LessonFilters
        filters={filters}
        lessons={lessonList}
        students={studentList}
        resultCount={filteredLessons.length}
        onChange={setFilters}
        onClear={() => setFilters(emptyLessonFilters)}
      />

      {workspaceView === 'CALENDAR' ? (
        <LessonCalendar
          view={calendarView}
          date={calendarDate}
          lessons={filteredLessons}
          students={studentList}
          isUpdating={(lesson) => updateStatuses.isPending && updateStatuses.variables?.id === lesson.id}
          onViewChange={setCalendarView}
          onDateChange={setCalendarDate}
          onEdit={edit}
          onDelete={removeLesson}
          onUpdateStatus={(id, status) => updateStatuses.mutate({ id, status })}
          onUpdatePaymentStatus={(id, paymentStatus) => updateStatuses.mutate({ id, paymentStatus })}
        />
      ) : (
        <LessonTable
          lessons={filteredLessons}
          onEdit={edit}
          onDelete={removeLesson}
        />
      )}
    </Box>
  );
}

function LessonFilters({
  filters,
  lessons,
  students,
  resultCount,
  onChange,
  onClear,
}: {
  filters: LessonFiltersState;
  lessons: Lesson[];
  students: Student[];
  resultCount: number;
  onChange: (filters: LessonFiltersState) => void;
  onClear: () => void;
}) {
  const studentOptions = useMemo(() => students
    .map((student) => ({ value: student.id, label: student.name }))
    .sort((a, b) => a.label.localeCompare(b.label)), [students]);
  const schoolYearOptions = useMemo(() => uniqueOptions(students.map((student) => student.schoolYear)), [students]);
  const subjectOptions = useMemo(() => uniqueOptions(students.flatMap((student) => subjectOptionsForStudent(student))), [students]);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ alignItems: { xs: 'stretch', lg: 'center' }, gap: 1.5 }}>
        <TextField
          label="Search lessons"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Student, title, subject, notes"
          size="small"
          sx={{ flex: { lg: '1 1 260px' } }}
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
        <LessonFilterSelect label="Student" value={filters.studentId} onChange={(studentId) => onChange({ ...filters, studentId })} options={studentOptions} placeholder="All students" />
        <LessonFilterSelect label="Year level" value={filters.schoolYear} onChange={(schoolYear) => onChange({ ...filters, schoolYear })} options={schoolYearOptions} placeholder="All year levels" />
        <LessonFilterSelect label="Subject(s)" value={filters.subject} onChange={(subject) => onChange({ ...filters, subject })} options={subjectOptions} placeholder="All subjects" />
        <LessonFilterSelect label="Lesson status" value={filters.lessonStatus} onChange={(lessonStatus) => onChange({ ...filters, lessonStatus })} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All statuses" />
        <LessonFilterSelect label="Payment" value={filters.paymentStatus} onChange={(paymentStatus) => onChange({ ...filters, paymentStatus })} options={['UNPAID', 'PAID', 'PARTIAL'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All payments" />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{resultCount} of {lessons.length} lessons shown</Typography>
        <Button variant="outlined" color="inherit" size="small" onClick={onClear} disabled={!hasFilters} sx={{ alignSelf: { sm: 'flex-end' } }}>
          Clear filters
        </Button>
      </Stack>
    </Paper>
  );
}

function LessonFilterSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <FormControl size="small" sx={{ minWidth: { lg: 156 } }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <MenuItem value="">{placeholder}</MenuItem>
        {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function filterLessons(lessons: Lesson[], students: Student[], filters: LessonFiltersState) {
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const matcher = searchMatcher(filters.search);
  return lessons
    .filter((lesson) => !filters.studentId || lesson.studentId === filters.studentId)
    .filter((lesson) => !filters.lessonStatus || lesson.status === filters.lessonStatus)
    .filter((lesson) => !filters.paymentStatus || lesson.paymentStatus === filters.paymentStatus)
    .filter((lesson) => {
      const student = studentsById.get(lesson.studentId);
      return !filters.schoolYear || student?.schoolYear === filters.schoolYear;
    })
    .filter((lesson) => {
      const student = studentsById.get(lesson.studentId);
      return !filters.subject || subjectOptionsForStudent(student).includes(filters.subject);
    })
    .filter((lesson) => {
      if (!filters.search) return true;
      const student = studentsById.get(lesson.studentId);
      return matcher.test([
        lesson.title,
        lesson.studentName,
        lesson.lessonNotes,
        lesson.homework,
        student?.schoolYear,
        student?.subject,
      ].filter(Boolean).join(' '));
    });
}

function uniqueOptions(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function lessonLinksForForm(lesson: Lesson) {
  if (lesson.lessonLinks?.length) {
    return lesson.lessonLinks;
  }
  if (lesson.miroBoardUrl) {
    return [{ label: 'Board', url: lesson.miroBoardUrl }];
  }
  return [];
}

function LessonCalendar({
  view,
  date,
  lessons,
  students,
  isUpdating,
  onViewChange,
  onDateChange,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  view: CalendarView;
  date: Date;
  lessons: Lesson[];
  students: Student[];
  isUpdating: (lesson: Lesson) => boolean;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
}) {
  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()), [lessons]);
  const move = (direction: number) => onDateChange(calendarViewDate(date, view, direction));

  return (
    <Paper component="section" variant="outlined" sx={{ mb: 4, overflow: 'hidden', borderRadius: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: 'divider', p: 2 }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Button variant="outlined" size="small" type="button" onClick={() => onDateChange(startOfDay(new Date()))}>Today</Button>
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            <IconButton size="small" type="button" onClick={() => move(-1)} aria-label={`Previous ${view.toLowerCase()}`}>
              <span aria-hidden>‹</span>
            </IconButton>
            <IconButton size="small" type="button" onClick={() => move(1)} aria-label={`Next ${view.toLowerCase()}`}>
              <span aria-hidden>›</span>
            </IconButton>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{calendarRangeLabel(date, view)}</Typography>
        </Stack>
        <ToggleButtonGroup
          exclusive
          value={view}
          size="small"
          onChange={(_, value: CalendarView | null) => value && onViewChange(value)}
          aria-label="Calendar view"
          sx={segmentedControlSx}
        >
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as CalendarView[]).map((option) => (
            <ToggleButton key={option} value={option}>{statusLabel(option)}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {view === 'DAILY' && (
        <DailyCalendar
          date={date}
          lessons={sortedLessons}
          students={students}
          isUpdating={isUpdating}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateStatus={onUpdateStatus}
          onUpdatePaymentStatus={onUpdatePaymentStatus}
        />
      )}
      {view === 'WEEKLY' && (
        <WeeklyCalendar
          date={date}
          lessons={sortedLessons}
          students={students}
          isUpdating={isUpdating}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateStatus={onUpdateStatus}
          onUpdatePaymentStatus={onUpdatePaymentStatus}
        />
      )}
      {view === 'MONTHLY' && (
        <MonthlyCalendar
          date={date}
          lessons={sortedLessons}
          isUpdating={isUpdating}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateStatus={onUpdateStatus}
          onUpdatePaymentStatus={onUpdatePaymentStatus}
        />
      )}
    </Paper>
  );
}

function DailyCalendar({
  date,
  lessons,
  students,
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  date: Date;
  lessons: Lesson[];
  students: Student[];
  isUpdating: (lesson: Lesson) => boolean;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
}) {
  const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), date));

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3 border-b border-border pb-3">
        <h3 className="font-semibold text-foreground">{date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      </div>
      <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
        {dayLessons.map((lesson) => (
          <DailyLessonCard
            key={lesson.id}
            lesson={lesson}
            student={students.find((student) => student.id === lesson.studentId)}
            isUpdating={isUpdating(lesson)}
            onEdit={() => onEdit(lesson)}
            onDelete={() => onDelete(lesson)}
            onUpdateStatus={(status) => onUpdateStatus(lesson.id, status)}
            onUpdatePaymentStatus={(paymentStatus) => onUpdatePaymentStatus(lesson.id, paymentStatus)}
          />
        ))}
        {dayLessons.length === 0 && <CalendarEmptyState message="No lessons scheduled for this day." />}
      </div>
    </div>
  );
}

function DailyLessonCard({
  lesson,
  student,
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  lesson: Lesson;
  student?: Student;
  isUpdating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: LessonStatus) => void;
  onUpdatePaymentStatus: (status: PaymentStatus) => void;
}) {
  const palette = calendarPaymentPalette(lesson);
  const customLinks = lessonLinksForDisplay(lesson);

  return (
    <article className="relative overflow-hidden rounded-lg border border-border bg-card p-4 pl-5 sm:p-5 sm:pl-6">
      <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Icon name="clock" className="h-4 w-4" />
              <strong className="font-semibold text-foreground">{lessonTimeRange(lesson)}</strong>
              <span>({lesson.durationMinutes} min)</span>
            </span>
            <CalendarStatusSelect
              ariaLabel={`Lesson status for ${lesson.title || 'lesson'}`}
              value={lesson.status}
              options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']}
              tone={lessonStatusStyles[lesson.status]}
              disabled={isUpdating}
              onChange={(value) => onUpdateStatus(value as LessonStatus)}
            />
            <CalendarStatusSelect
              ariaLabel={`Payment status for ${lesson.title || 'lesson'}`}
              value={lesson.paymentStatus}
              options={['UNPAID', 'PAID', 'PARTIAL']}
              tone={paymentStatusStyles[lesson.paymentStatus]}
              disabled={isUpdating}
              onChange={(value) => onUpdatePaymentStatus(value as PaymentStatus)}
            />
          </div>
          <h3 className="text-base font-semibold text-foreground">{lesson.title || 'Tutoring lesson'}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="user" className="h-4 w-4" />
            {lesson.studentName}
          </p>
          {(student?.schoolYear || student?.subject) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {student.schoolYear && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="graduation" className="h-4 w-4" />
                  <span>Year level: {student.schoolYear}</span>
                </span>
              )}
              {student.subject && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="book" className="h-4 w-4" />
                  <span>{student.subject}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 self-end sm:self-auto">
          <VideoCallButton lesson={lesson} />
          <AttachedLinkButtons lesson={lesson} />
          <IconButton size="small" type="button" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`}>
            <Icon name="edit" className="h-4 w-4" />
          </IconButton>
          <IconButton size="small" color="error" type="button" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`}>
            <Icon name="trash" className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Icon name="dollar" className="h-4 w-4" />
          <strong className="text-foreground">{lesson.hourlyRate}/hr</strong>
          <span>({lessonAmount(lesson)} total)</span>
        </span>
        {lesson.googleMeetLink && (
          <a className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href={lesson.googleMeetLink} target="_blank" rel="noreferrer">
            <Icon name="video" className="h-4 w-4" />
            Video call
          </a>
        )}
        {customLinks.map((link, index) => (
          <a key={`${link.label}-${link.url}-${index}`} className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href={link.url} target="_blank" rel="noreferrer">
            <Icon name="link" className="h-4 w-4" />
            {link.label || 'Link'}
          </a>
        ))}
        {lesson.lessonNotes && <span className="inline-flex items-center gap-2"><Icon name="edit" className="h-4 w-4" />{lesson.lessonNotes}</span>}
        {lesson.homework && <span className="inline-flex items-center gap-2"><Icon name="book" className="h-4 w-4" />{lesson.homework}</span>}
      </div>
    </article>
  );
}

function WeeklyCalendar({
  date,
  lessons,
  students,
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  date: Date;
  lessons: Lesson[];
  students: Student[];
  isUpdating: (lesson: Lesson) => boolean;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
}) {
  const weekStart = startOfWeek(date);

  return (
    <div className="max-h-[640px] overflow-auto">
      <div className="grid min-h-[360px] sm:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => {
          const day = addDays(weekStart, index);
          const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), day));
          return (
            <div key={day.toISOString()} className="border-b border-border p-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(7n)]:border-r-0">
              <p className="text-sm font-medium text-foreground">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</p>
              <p className={`mb-3 text-xs ${isSameDay(day, new Date()) ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{day.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</p>
              <div className="space-y-2">
                {dayLessons.map((lesson) => (
                  <CalendarLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    student={students.find((student) => student.id === lesson.studentId)}
                    isUpdating={isUpdating(lesson)}
                    onEdit={() => onEdit(lesson)}
                    onDelete={() => onDelete(lesson)}
                    onUpdateStatus={(status) => onUpdateStatus(lesson.id, status)}
                    onUpdatePaymentStatus={(paymentStatus) => onUpdatePaymentStatus(lesson.id, paymentStatus)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyCalendar({
  date,
  lessons,
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  date: Date;
  lessons: Lesson[];
  isUpdating: (lesson: Lesson) => boolean;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
}) {
  const firstDay = startOfMonthGrid(date);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/55">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, index) => {
              const day = addDays(firstDay, index);
              const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), day));
              const isCurrentMonth = day.getMonth() === date.getMonth();
              return (
                <div key={day.toISOString()} className="min-h-32 border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0">
                  <div className="mb-2 flex h-6 items-center">
                    <span className={`text-xs ${isSameDay(day, new Date()) ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayLessons.slice(0, 3).map((lesson) => {
                      const palette = calendarPaymentPalette(lesson);
                      return (
                        <div key={lesson.id} className="group relative">
                          <ButtonBase
                            className={`relative w-full overflow-hidden rounded-md border border-border bg-white text-left text-[12px] shadow-sm transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow ${palette.chip}`}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            sx={{
                              alignItems: 'center',
                              display: 'flex',
                              justifyContent: 'flex-start',
                              minHeight: 40,
                              px: 1,
                              py: 0.75,
                              pl: 1.5,
                            }}
                          >
                            <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-medium leading-snug opacity-80">{timeLabel(lesson.lessonDate)}</span>
                              <span className="block truncate font-medium leading-snug text-foreground">{lesson.studentName}</span>
                            </span>
                          </ButtonBase>
                          <LessonHoverCard lesson={lesson} />
                        </div>
                      );
                    })}
                    {dayLessons.length > 3 && <p className="px-1 text-[11px] text-muted-foreground">+{dayLessons.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {selectedLesson && (
        <MonthlyLessonModal
          lesson={selectedLesson}
          isUpdating={isUpdating(selectedLesson)}
          onClose={() => setSelectedLessonId(null)}
          onEdit={() => { setSelectedLessonId(null); onEdit(selectedLesson); }}
          onDelete={() => { setSelectedLessonId(null); onDelete(selectedLesson); }}
          onUpdateStatus={(status) => onUpdateStatus(selectedLesson.id, status)}
          onUpdatePaymentStatus={(paymentStatus) => onUpdatePaymentStatus(selectedLesson.id, paymentStatus)}
        />
      )}
    </>
  );
}

function LessonHoverCard({ lesson }: { lesson: Lesson }) {
  return (
    <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-60 rounded-lg border border-border bg-card p-3 text-left shadow-lg group-hover:block">
      <p className="truncate text-sm font-semibold text-foreground">{lesson.title || 'Tutoring lesson'}</p>
      <p className="mt-1 text-xs text-muted-foreground">{lesson.studentName}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="clock" className="h-3.5 w-3.5" />{lessonTimeRange(lesson)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="dollar" className="h-3.5 w-3.5" />{lesson.hourlyRate}/hr ({lessonAmount(lesson)} total)</p>
    </div>
  );
}

function MonthlyLessonModal({
  lesson,
  isUpdating,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  lesson: Lesson;
  isUpdating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: LessonStatus) => void;
  onUpdatePaymentStatus: (status: PaymentStatus) => void;
}) {
  const customLinks = lessonLinksForDisplay(lesson);

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label={`${lesson.title || 'Lesson'} details`}
      sx={{ '& .MuiDialog-paper': { bgcolor: '#f7f7f7', borderRadius: 2, overflow: 'hidden' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', bgcolor: 'background.paper', justifyContent: 'space-between', gap: 2, px: { xs: 2.5, sm: 3 }, pt: 2.5, pb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.25 }}>{lesson.title || 'Tutoring lesson'}</Typography>
          </Box>
          <IconButton type="button" onClick={onClose} aria-label="Close lesson details" sx={{ mt: -0.5 }}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </Stack>

        <Box sx={{ bgcolor: '#f7f7f7', px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 5, rowGap: 2 }}>
            <LessonSummaryLine icon="calendar" value={new Date(lesson.lessonDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} />
            <LessonSummaryLine icon="clock" value={lessonTimeRange(lesson)} />
            <LessonSummaryLine icon="dollar" value={`${lesson.hourlyRate}/hr (${lessonAmount(lesson)} total)`} />
            {lesson.googleMeetLink && <LessonVideoCallLine lesson={lesson} />}
            {customLinks.map((link, index) => <LessonAttachedLinkLine key={`${link.label}-${link.url}-${index}`} link={link} />)}
            <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <CalendarStatusSelect
                ariaLabel={`Lesson status for ${lesson.title || 'lesson'}`}
                value={lesson.status}
                options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']}
                tone={lessonStatusStyles[lesson.status]}
                disabled={isUpdating}
                onChange={(value) => onUpdateStatus(value as LessonStatus)}
              />
              <CalendarStatusSelect
                ariaLabel={`Payment status for ${lesson.title || 'lesson'}`}
                value={lesson.paymentStatus}
                options={['UNPAID', 'PAID', 'PARTIAL']}
                tone={paymentStatusStyles[lesson.paymentStatus]}
                disabled={isUpdating}
                onChange={(value) => onUpdatePaymentStatus(value as PaymentStatus)}
              />
            </Stack>
          </Box>

          {lesson.lessonNotes && (
            <Paper variant="outlined" sx={{ mt: 2, p: 1.5, borderColor: '#e2e2e2', bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary">Notes</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{lesson.lessonNotes}</Typography>
            </Paper>
          )}
        </Box>

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ bgcolor: '#f7f7f7', borderTop: 1, borderColor: '#e4e4e4', justifyContent: 'flex-end', gap: 1, px: { xs: 2.5, sm: 3 }, py: 2 }}>
          <Button
            variant="outlined"
            type="button"
            size="small"
            startIcon={<Icon name="trash" className="h-3.5 w-3.5" />}
            onClick={onDelete}
            sx={{ borderColor: '#fecaca', color: '#dc2626', minHeight: 36, textTransform: 'none', '&:hover': { borderColor: '#fca5a5', bgcolor: '#fff1f2' } }}
          >
            Delete lesson
          </Button>
          <Button
            variant="outlined"
            type="button"
            size="small"
            onClick={onClose}
            sx={{ borderColor: '#d4d4d4', color: '#525252', minHeight: 36, textTransform: 'none', '&:hover': { borderColor: '#a3a3a3', bgcolor: '#eeeeee' } }}
          >
            Close
          </Button>
          {lesson.googleMeetLink && (
            <Button
              component="a"
              href={lesson.googleMeetLink}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              type="button"
              size="small"
              startIcon={<Icon name="video" className="h-3.5 w-3.5" />}
              sx={{ borderColor: '#bbf7d0', color: '#166534', minHeight: 36, textTransform: 'none', '&:hover': { borderColor: '#86efac', bgcolor: '#f0fdf4' } }}
            >
              Join call
            </Button>
          )}
          {customLinks.map((link, index) => (
            <Button
              key={`${link.label}-${link.url}-${index}`}
              component="a"
              href={link.url}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              type="button"
              size="small"
              startIcon={<Icon name="link" className="h-3.5 w-3.5" />}
              sx={{ borderColor: '#d4d4d4', color: '#525252', minHeight: 36, textTransform: 'none', '&:hover': { borderColor: '#a3a3a3', bgcolor: '#eeeeee' } }}
            >
              {link.label || 'Link'}
            </Button>
          ))}
          <Button
            variant="contained"
            type="button"
            size="small"
            startIcon={<Icon name="edit" className="h-3.5 w-3.5" />}
            onClick={onEdit}
            sx={{ bgcolor: '#52525b', minHeight: 36, textTransform: 'none', '&:hover': { bgcolor: '#3f3f46' } }}
          >
            Edit lesson
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function VideoCallButton({ lesson, compact = false }: { lesson: Lesson; compact?: boolean }) {
  if (!lesson.googleMeetLink) return null;

  return (
    <IconButton
      component="a"
      href={lesson.googleMeetLink}
      target="_blank"
      rel="noreferrer"
      size="small"
      type="button"
      aria-label={`Open video call for ${lesson.title || 'lesson'}`}
      title="Open video call"
      onClick={(event) => event.stopPropagation()}
      sx={compact ? { p: 0.25, color: 'success.main' } : { color: 'success.main' }}
    >
      <Icon name="video" className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
    </IconButton>
  );
}

function AttachedLinkButtons({ lesson, compact = false }: { lesson: Lesson; compact?: boolean }) {
  const customLinks = lessonLinksForDisplay(lesson);
  if (customLinks.length === 0) return null;

  return (
    <>
      {customLinks.map((link, index) => (
        <IconButton
          key={`${link.label}-${link.url}-${index}`}
          component="a"
          href={link.url}
          target="_blank"
          rel="noreferrer"
          size="small"
          type="button"
          aria-label={`Open ${link.label || 'attached link'} for ${lesson.title || 'lesson'}`}
          title={link.label || 'Open attached link'}
          onClick={(event) => event.stopPropagation()}
          sx={compact ? { p: 0.25, color: 'text.secondary' } : { color: 'text.secondary' }}
        >
          <Icon name="link" className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        </IconButton>
      ))}
    </>
  );
}

function LessonVideoCallLine({ lesson }: { lesson: Lesson }) {
  if (!lesson.googleMeetLink) return null;

  return (
    <Stack component="a" href={lesson.googleMeetLink} target="_blank" rel="noreferrer" direction="row" sx={{ alignItems: 'center', color: 'success.dark', gap: 1.25, minWidth: 0, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
      <Box sx={{ color: 'success.dark', display: 'flex' }}>
        <Icon name="video" className="h-4 w-4" />
      </Box>
      <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 500, minWidth: 0 }}>Join video call</Typography>
    </Stack>
  );
}

function LessonAttachedLinkLine({ link }: { link: { label: string; url: string } }) {
  return (
    <Stack component="a" href={link.url} target="_blank" rel="noreferrer" direction="row" sx={{ alignItems: 'center', color: 'text.secondary', gap: 1.25, minWidth: 0, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        <Icon name="link" className="h-4 w-4" />
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0 }}>{link.label || 'Link'}</Typography>
    </Stack>
  );
}

function lessonLinksForDisplay(lesson: Lesson) {
  if (lesson.lessonLinks?.length) {
    return lesson.lessonLinks.filter((link) => link.url?.trim());
  }
  if (lesson.miroBoardUrl) {
    return [{ label: 'Board', url: lesson.miroBoardUrl }];
  }
  return [];
}

function LessonSummaryLine({ icon, value }: { icon: 'calendar' | 'clock' | 'dollar'; value: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        <Icon name={icon} className="h-4 w-4" />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>{value}</Typography>
    </Stack>
  );
}

function CalendarEmptyState({ message }: { message: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderStyle: 'dashed', borderRadius: 2 }}>
      <Icon name="calendar" className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Paper>
  );
}

function CalendarLessonCard({
  lesson,
  student,
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  lesson: Lesson;
  student?: Student;
  isUpdating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: LessonStatus) => void;
  onUpdatePaymentStatus: (status: PaymentStatus) => void;
}) {
  const palette = calendarPaymentPalette(lesson);
  const customLinks = lessonLinksForDisplay(lesson);

  return (
    <article className="group relative overflow-hidden rounded-lg border border-border/80 bg-muted/45 p-2.5 pl-3.5 text-xs shadow-sm transition-all hover:border-border hover:bg-muted/70 hover:shadow">
      <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-1">
          <div className="min-w-0 flex-1 pr-1">
            <span className={`inline-flex max-w-full shrink items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${palette.pill}`}>
              <Icon name="clock" className="h-3 w-3 shrink-0" />
              <span className="min-w-0 truncate">{lessonTimeRange(lesson)}</span>
            </span>
          </div>
          <div className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100">
            <VideoCallButton lesson={lesson} compact />
            <AttachedLinkButtons lesson={lesson} compact />
            <IconButton size="small" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`} sx={{ p: 0.25 }}>
              <Icon name="edit" className="h-3 w-3" />
            </IconButton>
            <IconButton size="small" color="error" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`} sx={{ p: 0.25 }}>
              <Icon name="trash" className="h-3 w-3" />
            </IconButton>
          </div>
        </div>

        <div className="min-w-0">
          {student && isGeneratedLessonTitle(student, lesson.title) ? (
            <div className="space-y-1">
              <p className="whitespace-normal break-words font-semibold leading-tight text-foreground">{student.name}</p>
              {student.schoolYear && (
                <p className="flex items-start gap-1 text-[10px] leading-tight text-muted-foreground">
                  <Icon name="graduation" className="h-3 w-3 shrink-0" />
                  <span>{student.schoolYear}</span>
                </p>
              )}
              {student.subject && (
                <p className="flex items-start gap-1 whitespace-normal break-words text-[10px] leading-tight text-muted-foreground">
                  <Icon name="book" className="h-3 w-3 shrink-0" />
                  <span>{student.subject}</span>
                </p>
              )}
              <WeeklyLessonRate lesson={lesson} />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="whitespace-normal break-words font-semibold leading-tight text-foreground">{lesson.title || 'Tutoring lesson'}</p>
              <WeeklyLessonRate lesson={lesson} />
            </div>
          )}
          {lesson.googleMeetLink && (
            <a className="mt-1 flex items-start gap-1 text-[10px] font-medium leading-tight text-primary hover:underline" href={lesson.googleMeetLink} target="_blank" rel="noreferrer">
              <Icon name="video" className="h-3 w-3 shrink-0" />
              <span>Meeting</span>
            </a>
          )}
          {customLinks.slice(0, 2).map((link, index) => (
            <a key={`${link.label}-${link.url}-${index}`} className="mt-1 flex items-start gap-1 text-[10px] font-medium leading-tight text-primary hover:underline" href={link.url} target="_blank" rel="noreferrer">
              <Icon name="link" className="h-3 w-3 shrink-0" />
              <span className="truncate">{link.label || 'Link'}</span>
            </a>
          ))}
          {customLinks.length > 2 && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">+{customLinks.length - 2} more links</p>}
        </div>
      </div>
      {lesson.lessonSeriesId && <span className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Recurring</span>}
      <div className="mt-2 space-y-1.5 border-t border-border pt-2">
        <QuickStatusSelect
          label="Lesson"
          ariaLabel={`Lesson status for ${lesson.title || 'lesson'}`}
          value={lesson.status}
          options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']}
          tone={lessonStatusStyles[lesson.status]}
          disabled={isUpdating}
          onChange={(value) => onUpdateStatus(value as LessonStatus)}
        />
        <QuickStatusSelect
          label="Payment"
          ariaLabel={`Payment status for ${lesson.title || 'lesson'}`}
          value={lesson.paymentStatus}
          options={['UNPAID', 'PAID', 'PARTIAL']}
          tone={paymentStatusStyles[lesson.paymentStatus]}
          disabled={isUpdating}
          onChange={(value) => onUpdatePaymentStatus(value as PaymentStatus)}
        />
      </div>
    </article>
  );
}

function WeeklyLessonRate({ lesson }: { lesson: Lesson }) {
  return (
    <p className="flex items-start gap-1 text-[10px] leading-tight text-muted-foreground">
      <Icon name="dollar" className="h-3 w-3 shrink-0" />
      <span>{lesson.hourlyRate}/hr</span>
    </p>
  );
}

function CalendarStatusSelect({ ariaLabel, value, options, tone, disabled, onChange }: { ariaLabel: string; value: string; options: string[]; tone: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <FormControl size="small" disabled={disabled}>
      <Select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        sx={statusSelectSx(tone, 12, 120)}
        className={tone}
      >
        {options.map((option) => <MenuItem key={option} value={option}>{statusLabel(option)}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function QuickStatusSelect({ label, ariaLabel, value, options, tone, disabled, onChange }: { label: string; ariaLabel: string; value: string; options: string[]; tone: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, justifyContent: 'space-between', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: 9, fontWeight: 600, letterSpacing: 0, textTransform: 'uppercase' }}>{label}</Typography>
      <Select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        sx={statusSelectSx(tone, 10, 96)}
        className={tone}
      >
        {options.map((option) => <MenuItem key={option} value={option}>{statusLabel(option)}</MenuItem>)}
      </Select>
    </Stack>
  );
}

const segmentedControlSx = {
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
};

function statusSelectSx(tone: string, fontSize: number, minWidth: number) {
  const palette = statusTonePalette(tone);
  return {
    minWidth: minWidth || undefined,
    maxWidth: '100%',
    borderRadius: 1.5,
    bgcolor: palette.bg,
    color: palette.color,
    fontSize,
    fontWeight: 500,
    lineHeight: 1.2,
    '& .MuiSelect-select': {
      minHeight: 'auto',
      py: 0.55,
      pl: 1,
      pr: 3,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: palette.border,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: palette.border,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: palette.border,
      borderWidth: 1,
    },
    '& .MuiSvgIcon-root': {
      color: palette.color,
      fontSize: 18,
    },
  };
}

function statusTonePalette(tone: string) {
  if (tone.includes('blue')) return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
  if (tone.includes('green')) return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' };
  if (tone.includes('red')) return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' };
  if (tone.includes('yellow')) return { bg: '#fefce8', border: '#fde68a', color: '#854d0e' };
  return { bg: '#f9fafb', border: '#e5e7eb', color: '#374151' };
}
