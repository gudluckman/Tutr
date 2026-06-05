import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGoogleCalendarAuthUrl, getGoogleCalendarStatus, syncGoogleCalendarDeletions } from '../../api/calendarApi';
import { createLesson, createRecurringLessons, deleteFollowingLessons, deleteLesson, deleteLessonSeries, listLessons, updateLesson, updateLessonStatuses } from '../../api/lessonApi';
import { listStudents } from '../../api/studentApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Lesson, LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../types/lesson';
import type { Student } from '../../types/student';
import { emptyLesson, emptyRecurring, googleDeletionSyncStorageKey, lessonStatusStyles, paymentStatusStyles } from './lessons/constants';
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
  lessonAmount,
  lessonTimeRange,
  lessonTitle,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
  statusLabel,
  timeLabel,
  toDateTimeLocal,
} from './lessons/lessonUtils';

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

  const lessons = useQuery({ queryKey: ['lessons'], queryFn: listLessons });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const googleStatus = useQuery({ queryKey: ['google-calendar-status'], queryFn: getGoogleCalendarStatus });
  const calendarError = searchParams.get('calendarError');

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

  const syncDeletedGoogleEvents = useMutation({
    mutationFn: syncGoogleCalendarDeletions,
    onSuccess: (data) => {
      sessionStorage.setItem(googleDeletionSyncStorageKey, String(Date.now()));
      if (data.deletedLessons > 0) {
        queryClient.invalidateQueries({ queryKey: ['lessons'] });
      }
    },
  });

  useEffect(() => {
    if (!googleStatus.data?.connected) {
      return;
    }
    const lastSyncAt = Number(sessionStorage.getItem(googleDeletionSyncStorageKey) ?? 0);
    if (Date.now() - lastSyncAt > 5 * 60_000) {
      syncDeletedGoogleEvents.mutate();
    }
  }, [googleStatus.data?.connected]);

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
        onSyncDeletions={() => syncDeletedGoogleEvents.mutate()}
        isSyncingDeletions={syncDeletedGoogleEvents.isPending}
      />

      <ErrorAlert className="mb-6" error={lessons.error} fallback="Could not load lessons. Please refresh the page." />
      <ErrorAlert className="mb-6" error={students.error} fallback="Could not load students for lesson scheduling. Please refresh the page." />
      <ErrorAlert className="mb-6" error={googleStatus.error} fallback="Could not load Google Calendar status. Please refresh the page." />
      <ErrorAlert className="mb-6" error={connectGoogle.error} fallback="Could not start Google Calendar connection. Please try again." />
      <ErrorAlert className="mb-6" error={syncDeletedGoogleEvents.error} fallback="Could not sync deleted Google Calendar events. Please try again." />
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
                  sx={{ mt: 1.5 }}
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

      {workspaceView === 'CALENDAR' ? (
        <LessonCalendar
          view={calendarView}
          date={calendarDate}
          lessons={lessons.data ?? []}
          students={students.data ?? []}
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
          lessons={lessons.data ?? []}
          onEdit={edit}
          onDelete={removeLesson}
        />
      )}
    </Box>
  );
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
  isUpdating,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  lesson: Lesson;
  isUpdating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: LessonStatus) => void;
  onUpdatePaymentStatus: (status: PaymentStatus) => void;
}) {
  const palette = calendarPaymentPalette(lesson);

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
        </div>
        <div className="flex gap-1 self-end sm:self-auto">
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
      <div className="grid min-h-[360px] md:min-w-[1120px] md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => {
          const day = addDays(weekStart, index);
          const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), day));
          return (
            <div key={day.toISOString()} className="border-b border-border p-3 md:border-b-0 md:border-r md:last:border-r-0">
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
                <div key={day.toISOString()} className="min-h-28 border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0">
                  <p className={`mb-1 text-xs ${isSameDay(day, new Date()) ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60'}`}>{day.getDate()}</p>
                  <div className="space-y-1">
                    {dayLessons.slice(0, 3).map((lesson) => (
                      <div key={lesson.id} className="group relative">
                        <ButtonBase className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] font-medium transition-colors ${calendarPaymentPalette(lesson).chip}`} onClick={() => setSelectedLessonId(lesson.id)}>
                          {timeLabel(lesson.lessonDate)} {lesson.studentName}
                        </ButtonBase>
                        <LessonHoverCard lesson={lesson} />
                      </div>
                    ))}
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
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-label={`${lesson.title || 'Lesson'} details`}>
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{lesson.title || 'Tutoring lesson'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{lesson.studentName}</Typography>
          </Box>
          <IconButton type="button" onClick={onClose} aria-label="Close lesson details">
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mt: 2, color: 'text.secondary', fontSize: 14 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}><Icon name="calendar" className="h-4 w-4" />{new Date(lesson.lessonDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}><Icon name="clock" className="h-4 w-4" />{lessonTimeRange(lesson)}</Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}><Icon name="dollar" className="h-4 w-4" />{lesson.hourlyRate}/hr ({lessonAmount(lesson)} total)</Stack>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
            {lesson.lessonNotes}
          </Typography>
        )}
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} sx={{ justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          <Button variant="outlined" color="error" type="button" startIcon={<Icon name="trash" className="h-4 w-4" />} onClick={onDelete}>Delete lesson</Button>
          <Button variant="outlined" type="button" onClick={onClose}>Close</Button>
          <Button variant="contained" type="button" startIcon={<Icon name="edit" className="h-4 w-4" />} onClick={onEdit}>Edit lesson</Button>
        </Stack>
      </DialogContent>
    </Dialog>
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

  return (
    <article className="group relative overflow-hidden rounded-lg border border-border/80 bg-muted/45 p-2.5 pl-3.5 text-xs shadow-sm transition-all hover:border-border hover:bg-muted/70 hover:shadow">
      <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1">
            <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${palette.pill}`}>
              <Icon name="clock" className="h-3 w-3 shrink-0" />
              {lessonTimeRange(lesson)}
            </span>
          </div>
          {student && lesson.title === lessonTitle(student) ? (
            <div className="mt-1.5 space-y-1">
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
            <div className="mt-1.5 space-y-1">
              <p className="whitespace-normal break-words font-semibold leading-tight text-foreground">{lesson.title || 'Tutoring lesson'}</p>
              <WeeklyLessonRate lesson={lesson} />
            </div>
          )}
        </div>
        <div className="flex shrink-0">
          <IconButton size="small" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`} sx={{ p: 0.5 }}>
            <Icon name="edit" className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton size="small" color="error" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`} sx={{ p: 0.5 }}>
            <Icon name="trash" className="h-3.5 w-3.5" />
          </IconButton>
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
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' }}>{label}</Typography>
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

function statusSelectSx(tone: string, fontSize: number, minWidth: number) {
  const palette = statusTonePalette(tone);
  return {
    minWidth,
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
