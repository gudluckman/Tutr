import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGoogleCalendarAuthUrl, getGoogleCalendarStatus, syncGoogleCalendarDeletions } from '../../api/calendarApi';
import { createLesson, createRecurringLessons, deleteLesson, listLessons, updateLesson, updateLessonStatuses } from '../../api/lessonApi';
import { listStudents } from '../../api/studentApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Lesson, LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../types/lesson';
import type { Student } from '../../types/student';

type FormMode = 'single' | 'recurring';
type CalendarView = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type LessonsWorkspaceView = 'CALENDAR' | 'TABLE';

const lessonAmountNumber = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyLesson: LessonPayload = {
  studentId: '',
  title: '',
  lessonDate: toDateTimeLocal(new Date()),
  durationMinutes: 60,
  hourlyRate: 0,
  status: 'SCHEDULED',
  paymentStatus: 'UNPAID',
  lessonNotes: '',
  homework: '',
  miroBoardUrl: '',
  inviteEmail: '',
  syncToGoogle: true,
};

const emptyRecurring: RecurringLessonPayload = {
  studentId: '',
  title: '',
  firstLessonDate: toDateTimeLocal(new Date()),
  durationMinutes: 60,
  hourlyRate: 0,
  frequency: 'WEEKLY',
  intervalCount: 1,
  lessonNotes: '',
  homework: '',
  miroBoardUrl: '',
  inviteEmail: '',
  syncToGoogle: true,
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

  const remove = useMutation({ mutationFn: deleteLesson, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }) });

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
      if (data.deletedLessons > 0) {
        queryClient.invalidateQueries({ queryKey: ['lessons'] });
      }
    },
  });

  useEffect(() => {
    if (googleStatus.data?.connected) {
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

  function removeLesson(id: string) {
    if (window.confirm('Delete this lesson and its Google Calendar event?')) {
      remove.mutate(id);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Lessons</h1>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <div className="grid flex-1 grid-cols-2 rounded-lg bg-muted p-1 sm:inline-flex sm:flex-none">
            {(['CALENDAR', 'TABLE'] as LessonsWorkspaceView[]).map((option) => (
              <button
                key={option}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${workspaceView === option ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                type="button"
                onClick={() => setWorkspaceView(option)}
              >
                {statusLabel(option)}
              </button>
            ))}
          </div>
          <button className="button gap-2" onClick={() => setShowForm(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Add lesson
          </button>
        </div>
      </div>

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

      {calendarError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {calendarError === 'oauth'
            ? 'Google did not grant Calendar access. Make sure you choose your listed test account, press Continue on the unverified-app screen, and allow the Calendar permission.'
            : 'Google Calendar could not finish connecting. Check that the OAuth client secret and redirect URI match your Google Cloud settings.'}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{editing ? 'Edit lesson' : mode === 'recurring' ? 'Add recurring lessons' : 'Add lesson'}</h2>
              {!editing && (
                <div className="mt-3 inline-flex rounded-lg border border-border bg-muted p-1">
                  <button type="button" onClick={() => setMode('single')} className={`rounded-md px-3 py-1.5 text-sm ${mode === 'single' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Single</button>
                  <button type="button" onClick={() => setMode('recurring')} className={`rounded-md px-3 py-1.5 text-sm ${mode === 'recurring' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Recurring</button>
                </div>
              )}
            </div>
            <button className="icon-button" onClick={resetForm} type="button" aria-label="Close form">
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <ErrorAlert className="md:col-span-2" error={mode === 'recurring' && !editing ? saveRecurring.error : save.error} fallback="Could not save the lesson. Please check the details and try again." />
            {mode === 'recurring' && !editing ? (
              <RecurringFields form={recurringForm} setForm={setRecurringForm} students={students.data ?? []} googleConnected={Boolean(googleStatus.data?.connected)} />
            ) : (
              <SingleLessonFields form={form} setForm={setForm} students={students.data ?? []} googleConnected={Boolean(googleStatus.data?.connected)} />
            )}
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button className="button" disabled={save.isPending || saveRecurring.isPending}>
                {editing ? 'Update lesson' : mode === 'recurring' ? 'Create recurring lessons' : 'Add lesson'}
              </button>
              <button className="button-secondary" type="button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
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
    </div>
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
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: LessonStatus) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
}) {
  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()), [lessons]);
  const move = (direction: number) => onDateChange(calendarViewDate(date, view, direction));

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col items-stretch justify-between gap-4 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <button className="button-secondary" type="button" onClick={() => onDateChange(startOfDay(new Date()))}>Today</button>
          <div className="inline-flex overflow-hidden rounded-lg border border-border">
            <button className="px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" type="button" onClick={() => move(-1)} aria-label={`Previous ${view.toLowerCase()}`}>‹</button>
            <button className="border-l border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" type="button" onClick={() => move(1)} aria-label={`Next ${view.toLowerCase()}`}>›</button>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{calendarRangeLabel(date, view)}</h2>
        </div>
        <div className="grid grid-cols-3 rounded-lg border border-border bg-muted p-1 sm:inline-flex">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as CalendarView[]).map((option) => (
            <button
              key={option}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === option ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              type="button"
              onClick={() => onViewChange(option)}
            >
              {statusLabel(option)}
            </button>
          ))}
        </div>
      </div>

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
    </section>
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
  onDelete: (id: string) => void;
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
            onDelete={() => onDelete(lesson.id)}
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
          <button className="icon-button" type="button" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`}>
            <Icon name="edit" className="h-4 w-4" />
          </button>
          <button className="icon-button hover:bg-destructive/10 hover:text-destructive" type="button" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`}>
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Icon name="dollar" className="h-4 w-4" />
          <strong className="text-foreground">${lesson.hourlyRate}/hr</strong>
          <span>(${lessonAmount(lesson)} total)</span>
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
  onDelete: (id: string) => void;
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
                    onDelete={() => onDelete(lesson.id)}
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
  onDelete: (id: string) => void;
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
                        <button className={`block w-full truncate rounded px-2 py-1 text-left text-[11px] font-medium transition-colors ${calendarPaymentPalette(lesson).chip}`} type="button" onClick={() => setSelectedLessonId(lesson.id)}>
                          {timeLabel(lesson.lessonDate)} {lesson.studentName}
                        </button>
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
          onDelete={() => { setSelectedLessonId(null); onDelete(selectedLesson.id); }}
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
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="dollar" className="h-3.5 w-3.5" />${lesson.hourlyRate}/hr (${lessonAmount(lesson)} total)</p>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${lesson.title || 'Lesson'} details`} onMouseDown={onClose}>
      <article className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-card p-4 shadow-xl sm:rounded-lg sm:p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{lesson.title || 'Tutoring lesson'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{lesson.studentName}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close lesson details">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4" />{new Date(lesson.lessonDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4" />{lessonTimeRange(lesson)}</p>
          <p className="flex items-center gap-2"><Icon name="dollar" className="h-4 w-4" />${lesson.hourlyRate}/hr (${lessonAmount(lesson)} total)</p>
          <div className="flex flex-wrap gap-2">
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
        </div>
        {lesson.lessonNotes && <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{lesson.lessonNotes}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="button-secondary gap-2 text-destructive hover:bg-destructive/10" type="button" onClick={onDelete}><Icon name="trash" className="h-4 w-4" />Delete lesson</button>
          <button className="button-secondary" type="button" onClick={onClose}>Close</button>
          <button className="button gap-2" type="button" onClick={onEdit}><Icon name="edit" className="h-4 w-4" />Edit lesson</button>
        </div>
      </article>
    </div>
  );
}

function CalendarEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <Icon name="calendar" className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function GoogleCalendarPanel({
  configured,
  connected,
  email,
  onConnect,
  isConnecting,
  onSyncDeletions,
  isSyncingDeletions,
}: {
  configured: boolean;
  connected: boolean;
  email?: string | null;
  onConnect: () => void;
  isConnecting: boolean;
  onSyncDeletions: () => void;
  isSyncingDeletions: boolean;
}) {
  const stateStyles = connected
    ? 'border-green-200 bg-green-50 text-green-900'
    : configured
      ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
      : 'border-red-200 bg-red-50 text-red-900';

  return (
    <section className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 sm:p-5 ${stateStyles}`}>
      <div>
        <h2 className="font-semibold">Google Calendar</h2>
        <p className="text-sm opacity-80">
          {!configured ? 'Add Google OAuth env vars to enable calendar sync.' : connected ? `Connected${email ? ` as ${email}` : ''}.` : 'Connect Google Calendar to sync lessons when you create them.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {connected && (
          <button className="rounded-md bg-white/80 px-4 py-2 text-sm font-medium text-green-900 ring-1 ring-green-200 disabled:opacity-60" onClick={onSyncDeletions} disabled={isSyncingDeletions}>
            Sync deletions
          </button>
        )}
        <button className={connected ? 'rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-80' : 'button-secondary'} onClick={onConnect} disabled={!configured || connected || isConnecting}>
          {connected ? 'Connected' : 'Connect Google Calendar'}
        </button>
      </div>
    </section>
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
          <button className="rounded-md border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:bg-white/80 hover:text-foreground" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`}>
            <Icon name="edit" className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-md border border-transparent p-1 text-muted-foreground transition-colors hover:border-red-100 hover:bg-red-50 hover:text-destructive" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`}>
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
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
      <span>${lesson.hourlyRate}/hr</span>
    </p>
  );
}

const lessonStatusStyles: Record<LessonStatus, string> = {
  SCHEDULED: 'border-blue-200 bg-blue-50 text-blue-800',
  COMPLETED: 'border-green-200 bg-green-50 text-green-800',
  CANCELLED: 'border-gray-200 bg-gray-50 text-gray-700',
  NO_SHOW: 'border-red-200 bg-red-50 text-red-800',
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  PAID: 'border-green-200 bg-green-50 text-green-800',
  UNPAID: 'border-red-200 bg-red-50 text-red-800',
  PARTIAL: 'border-yellow-200 bg-yellow-50 text-yellow-800',
};

function calendarPaymentPalette(lesson: Lesson) {
  if (lesson.paymentStatus === 'PAID' && lesson.status !== 'SCHEDULED') {
    return {
      rail: 'bg-green-500',
      pill: 'bg-green-100/80 text-green-800',
      chip: 'bg-green-100 text-green-800',
    };
  }
  if (lesson.paymentStatus === 'PARTIAL') {
    return {
      rail: 'bg-yellow-400',
      pill: 'bg-yellow-100 text-yellow-800',
      chip: 'bg-yellow-100 text-yellow-800',
    };
  }
  if (lesson.paymentStatus === 'UNPAID' && lessonEndTime(lesson).getTime() < Date.now()) {
    return {
      rail: 'bg-red-500',
      pill: 'bg-red-100 text-red-800',
      chip: 'bg-red-100 text-red-800',
    };
  }
  return {
    rail: 'bg-gray-400',
    pill: 'bg-gray-100 text-gray-700',
    chip: 'bg-gray-100 text-gray-700',
  };
}

function CalendarStatusSelect({ ariaLabel, value, options, tone, disabled, onChange }: { ariaLabel: string; value: string; options: string[]; tone: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <select
      aria-label={ariaLabel}
      className={`rounded border px-2 py-1 text-xs font-medium outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-60 ${tone}`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
    </select>
  );
}

function QuickStatusSelect({ label, ariaLabel, value, options, tone, disabled, onChange }: { label: string; ariaLabel: string; value: string; options: string[]; tone: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        aria-label={ariaLabel}
        className={`min-w-0 max-w-[88px] rounded-full border px-1.5 py-0.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-60 ${tone}`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
      </select>
    </label>
  );
}

function SingleLessonFields({ form, setForm, students, googleConnected }: { form: LessonPayload; setForm: (form: LessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  return (
    <>
      <StudentSelect value={form.studentId} onChange={(student) => setForm({
        ...form,
        studentId: student?.id ?? '',
        title: student ? lessonTitle(student) : '',
        hourlyRate: student?.hourlyRate ?? 0,
        inviteEmail: student?.parentEmail ?? '',
      })} students={students} />
      <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
      <FormInput label="Date and time *" type="datetime-local" value={form.lessonDate} onChange={(value) => setForm({ ...form, lessonDate: value })} required />
      <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
      <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      <SelectField label="Lesson status *" value={form.status} onChange={(value) => setForm({ ...form, status: value as LessonStatus })} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']} />
      <SelectField label="Payment status *" value={form.paymentStatus} onChange={(value) => setForm({ ...form, paymentStatus: value as PaymentStatus })} options={['UNPAID', 'PAID', 'PARTIAL']} />
      <FormInput label="Board link" type="url" value={form.miroBoardUrl ?? ''} onChange={(value) => setForm({ ...form, miroBoardUrl: value })} />
      <FormInput label="Invite email" type="email" value={form.inviteEmail ?? ''} onChange={(value) => setForm({ ...form, inviteEmail: value })} />
      <SyncToggle checked={Boolean(form.syncToGoogle)} disabled={!googleConnected} onChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })} />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

function RecurringFields({ form, setForm, students, googleConnected }: { form: RecurringLessonPayload; setForm: (form: RecurringLessonPayload) => void; students: Student[]; googleConnected: boolean }) {
  return (
    <>
      <StudentSelect value={form.studentId} onChange={(student) => setForm({
        ...form,
        studentId: student?.id ?? '',
        title: student ? lessonTitle(student) : '',
        hourlyRate: student?.hourlyRate ?? 0,
        inviteEmail: student?.parentEmail ?? '',
      })} students={students} />
      <FormInput label="Lesson title *" value={form.title ?? ''} onChange={(value) => setForm({ ...form, title: value })} required />
      <FormInput label="First lesson date and time *" type="datetime-local" value={form.firstLessonDate} onChange={(value) => setForm({ ...form, firstLessonDate: value })} required />
      <FormInput label="Duration (minutes) *" type="number" value={String(form.durationMinutes)} onChange={(value) => setForm({ ...form, durationMinutes: Number(value) })} required />
      <FormInput label="Hourly rate ($) *" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} required />
      <FormInput label="Repeat every weeks" type="number" value={String(form.intervalCount ?? '')} onChange={(value) => setForm({ ...form, intervalCount: value ? Number(value) : undefined })} />
      <FormInput label="Repeat until" type="datetime-local" value={form.recurrenceUntil ?? ''} onChange={(value) => setForm({ ...form, recurrenceUntil: value || undefined })} />
      <FormInput label="Board link" type="url" value={form.miroBoardUrl ?? ''} onChange={(value) => setForm({ ...form, miroBoardUrl: value })} />
      <FormInput label="Invite email" type="email" value={form.inviteEmail ?? ''} onChange={(value) => setForm({ ...form, inviteEmail: value })} />
      <SyncToggle checked={Boolean(form.syncToGoogle)} disabled={!googleConnected} onChange={(syncToGoogle) => setForm({ ...form, syncToGoogle })} />
      <TextArea label="Lesson notes" value={form.lessonNotes ?? ''} onChange={(value) => setForm({ ...form, lessonNotes: value })} />
      <TextArea label="Homework" value={form.homework ?? ''} onChange={(value) => setForm({ ...form, homework: value })} />
    </>
  );
}

function StudentSelect({ value, onChange, students }: { value: string; onChange: (student?: Student) => void; students: Student[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">Student *</span>
      <select
        className="input"
        value={value}
        onChange={(event) => {
          const student = students.find((item) => item.id === event.target.value);
          onChange(student);
        }}
        required
      >
        <option value="">Select student</option>
        {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
      </select>
    </label>
  );
}

function lessonTitle(student: Student) {
  return [student.name, student.schoolYear, student.subject].filter(Boolean).join(' ');
}

function FormInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value?: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
      </select>
    </label>
  );
}

function SyncToggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 pt-7 text-sm ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring disabled:opacity-50" />
      Add to Google Calendar
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block md:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <textarea className="input min-h-20 resize-none" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function LessonTable({ lessons, onEdit, onDelete }: { lessons: Lesson[]; onEdit: (lesson: Lesson) => void; onDelete: (id: string) => void }) {
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
    <div className="overflow-hidden rounded-lg border border-border bg-muted/45">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lesson history</h2>
          <p className="text-sm text-muted-foreground">{filteredLessons.length} of {lessons.length} lessons shown</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {filteredLessons.length > 0 && <p className="text-sm text-muted-foreground">Showing {firstRow + 1}-{Math.min(firstRow + pageSize, filteredLessons.length)} of {filteredLessons.length}</p>}
          <button className="button-secondary gap-2" type="button" aria-expanded={showFilters} onClick={() => setShowFilters((current) => !current)}>
            Filters
            <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>
      {showFilters && <div className="grid gap-3 border-b border-border bg-muted/65 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="xl:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Search title</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input className="input bg-white/80 !pl-10" value={titleSearch} onChange={(event) => setTitleSearch(event.target.value)} placeholder="Search for anything" />
          </div>
        </label>
        <HistorySelect label="Student" value={studentId} onChange={setStudentId} options={studentOptions.map(([value, label]) => ({ value, label }))} placeholder="All students" />
        <HistoryInput label="Lesson date" type="date" value={lessonDate} onChange={setLessonDate} />
        <HistoryInput label="Start time" type="time" value={lessonTime} onChange={setLessonTime} />
        <HistorySelect label="Payment" value={paymentStatus} onChange={setPaymentStatus} options={['UNPAID', 'PAID', 'PARTIAL'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All payments" />
        <HistorySelect label="Lesson status" value={lessonStatus} onChange={setLessonStatus} options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => ({ value, label: statusLabel(value) }))} placeholder="All statuses" />
        <div className="flex items-end xl:col-span-4">
          <button className="button-secondary" type="button" onClick={() => {
            setSort('created');
            setStudentId('');
            setTitleSearch('');
            setLessonDate('');
            setLessonTime('');
            setPaymentStatus('');
            setLessonStatus('');
          }}>Clear filters</button>
        </div>
      </div>}
      <div className="max-h-[430px] overflow-auto bg-white/70">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-border bg-muted">
            <tr>
              <Th>Student</Th>
              <Th>Title</Th>
              <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                <button className="inline-flex items-center gap-1 transition-colors hover:text-primary" type="button" onClick={() => setSort((current) => current === 'date-desc' ? 'date-asc' : 'date-desc')}>
                  Date & Time
                  <span className={`text-xs ${sort === 'created' ? 'text-muted-foreground' : 'text-primary'}`}>{sort === 'date-asc' ? '▲' : '▼'}</span>
                </button>
              </th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th>Links</Th>
              <Th>Calendar</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visibleLessons.map((lesson) => (
              <tr key={lesson.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-6 py-4 text-foreground">{lesson.studentName}</td>
                <td className="px-6 py-4 text-foreground">{lesson.title}</td>
                <td className="px-6 py-4">
                  <p className="text-foreground">{new Date(lesson.lessonDate).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">{timeLabel(lesson.lessonDate)}</p>
                </td>
                <td className="px-6 py-4"><StatusBadge status={lesson.status} /></td>
                <td className="px-6 py-4"><PaymentBadge status={lesson.paymentStatus} /></td>
                <td className="px-6 py-4"><LessonLinks lesson={lesson} /></td>
                <td className="px-6 py-4"><GoogleBadge lesson={lesson} /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="icon-button" onClick={() => onEdit(lesson)} aria-label={`Edit ${lesson.title || lesson.studentName}`}>
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button className="icon-button hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(lesson.id)} aria-label={`Delete ${lesson.title || lesson.studentName} and synced Google event`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLessons.length === 0 && <p className="p-6 text-muted-foreground">{lessons.length === 0 ? 'No lessons yet.' : 'No lessons match your filters.'}</p>}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-4">
          <button className="button-secondary" disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button>
          <p className="text-sm text-muted-foreground">Page {safePage + 1} of {totalPages}</p>
          <button className="button-secondary" disabled={safePage + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

function HistoryInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input className="input bg-white/80" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function HistorySelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <select className="input bg-white/80" value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function LessonLinks({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {lesson.googleMeetLink && <a className="text-primary underline-offset-2 hover:underline" href={lesson.googleMeetLink} target="_blank" rel="noreferrer">Meeting</a>}
      {lesson.miroBoardUrl && <a className="text-primary underline-offset-2 hover:underline" href={lesson.miroBoardUrl} target="_blank" rel="noreferrer">Board</a>}
      {!lesson.googleMeetLink && !lesson.miroBoardUrl && <span className="text-muted-foreground">No links</span>}
    </div>
  );
}

function GoogleBadge({ lesson }: { lesson: Lesson }) {
  if (lesson.lessonSeriesId) return <span className="rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Series</span>;
  if (!lesson.googleSyncEnabled) return <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Not synced</span>;
  if (lesson.googleSyncStatus === 'SYNCED') return <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Synced</span>;
  if (lesson.googleSyncStatus === 'FAILED') {
    return (
      <div className="max-w-52">
        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">Failed</span>
        {lesson.googleSyncError && <p className="mt-2 text-xs text-red-700">{lesson.googleSyncError}</p>}
      </div>
    );
  }
  return <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Needs connection</span>;
}

function StatusBadge({ status }: { status: LessonStatus }) {
  const styles: Record<LessonStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    NO_SHOW: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded px-2 py-1 text-xs font-medium ${styles[status]}`}>{statusLabel(status)}</span>;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    PAID: 'bg-green-100 text-green-800',
    UNPAID: 'bg-red-100 text-red-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
  };
  return <span className={`rounded px-2 py-1 text-xs font-medium ${styles[status]}`}>{statusLabel(status)}</span>;
}

function statusLabel(status: string) {
  return status.toLowerCase().replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-6 py-3 text-sm font-medium text-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeek(firstDay);
}

function calendarViewDate(date: Date, view: CalendarView, direction: number) {
  if (view === 'DAILY') return addDays(date, direction);
  if (view === 'WEEKLY') return addDays(date, direction * 7);
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + direction);
  return copy;
}

function calendarRangeLabel(date: Date, view: CalendarView) {
  if (view === 'DAILY') return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (view === 'MONTHLY') return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.toLocaleDateString('en-AU', { day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function lessonTimeRange(lesson: Lesson) {
  const start = new Date(lesson.lessonDate);
  const end = lessonEndTime(lesson);
  return `${timeLabel(start.toISOString())} - ${timeLabel(end.toISOString())}`;
}

function lessonEndTime(lesson: Lesson) {
  return new Date(new Date(lesson.lessonDate).getTime() + lesson.durationMinutes * 60_000);
}

function lessonAmount(lesson: Lesson) {
  return lessonAmountNumber.format(lesson.hourlyRate * lesson.durationMinutes / 60);
}

function searchMatcher(search: string) {
  try {
    return new RegExp(search, 'i');
  } catch {
    return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
