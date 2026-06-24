import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Collapse,
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
import { getGoogleCalendarStatus, retryFailedGoogleCalendarSyncs } from '../../api/calendarApi';
import { createLesson, createRecurringLessons, deleteFollowingLessons, deleteLesson, deleteLessonSeries, listLessons, updateLesson, updateLessonStatuses } from '../../api/lessonApi';
import { listStudents } from '../../api/studentApi';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Icon } from '../../components/ui/Icon';
import type { Lesson, LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../types/lesson';
import type { Student } from '../../types/student';
import { emptyLesson, emptyRecurring, paymentStatusOptions } from './lessons/constants';
import { DeleteLessonDialog } from './lessons/DeleteLessonDialog';
import { LessonCalendar } from './lessons/LessonCalendar';
import { RecurringFields, SingleLessonFields } from './lessons/LessonFormFields';
import { LessonTable } from './lessons/LessonTable';
import type { CalendarView, FormMode, LessonDeleteScope, LessonUpdateScope, LessonsWorkspaceView } from './lessons/types';
import { UpdateRecurringLessonDialog } from './lessons/UpdateRecurringLessonDialog';
import {
  startOfDay,
  searchMatcher,
  statusLabel,
  subjectOptionsForStudent,
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

const lessonCalendarViewStorageKey = 'tutr.lessonsCalendarView';
const calendarViews: CalendarView[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

export function LessonsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<FormMode>('single');
  const [workspaceView, setWorkspaceView] = useState<LessonsWorkspaceView>('CALENDAR');
  const [calendarView, setCalendarView] = useState<CalendarView>(() => storedLessonCalendarView());
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [choosingUpdateScope, setChoosingUpdateScope] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonPayload>(emptyLesson);
  const [recurringForm, setRecurringForm] = useState<RecurringLessonPayload>(emptyRecurring);
  const [filters, setFilters] = useState<LessonFiltersState>(emptyLessonFilters);

  const lessons = useQuery({ queryKey: ['lessons'], queryFn: listLessons });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const googleStatus = useQuery({ queryKey: ['google-calendar-status'], queryFn: getGoogleCalendarStatus });
  const lessonList = lessons.data ?? [];
  const studentList = students.data ?? [];
  const filteredLessons = useMemo(() => filterLessons(lessonList, studentList, filters), [filters, lessonList, studentList]);

  useEffect(() => {
    localStorage.setItem(lessonCalendarViewStorageKey, calendarView);
  }, [calendarView]);

  const save = useMutation({
    mutationFn: (scope: LessonUpdateScope = 'SINGLE') => {
      const payload = { ...form, lessonDate: new Date(form.lessonDate).toISOString(), syncToGoogle: form.syncToGoogle };
      return editing ? updateLesson(editing.id, payload, scope) : createLesson(payload);
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
    onMutate: async ({ id, status, paymentStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['lessons'] });
      const previousLessons = queryClient.getQueryData<Lesson[]>(['lessons']);
      queryClient.setQueryData<Lesson[]>(['lessons'], (currentLessons = []) => currentLessons.map((lesson) => (
        lesson.id === id
          ? {
              ...lesson,
              status: status ?? lesson.status,
              paymentStatus: paymentStatus ?? lesson.paymentStatus,
            }
          : lesson
      )));
      return { previousLessons };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLessons) {
        queryClient.setQueryData(['lessons'], context.previousLessons);
      }
    },
    onSuccess: (updatedLesson, variables) => {
      queryClient.setQueryData<Lesson[]>(['lessons'], (currentLessons = []) => currentLessons.map((lesson) => (
        lesson.id === variables.id || lesson.id === updatedLesson.id ? updatedLesson : lesson
      )));
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });

  const retryGoogleSync = useMutation({
    mutationFn: retryFailedGoogleCalendarSyncs,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
  });
  const failedGoogleSyncCount = new Set(lessonList
    .filter((lesson) => (
      lesson.googleSyncEnabled
      && (lesson.googleSyncStatus === 'FAILED' || lesson.googleSyncStatus === 'NOT_CONNECTED')
    ))
    .map((lesson) => lesson.lessonSeriesId ? `series:${lesson.lessonSeriesId}` : `lesson:${lesson.id}`))
    .size;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'recurring' && !editing) {
      saveRecurring.mutate();
      return;
    }
    if (editing?.lessonSeriesId) {
      setChoosingUpdateScope(true);
      return;
    }
    save.mutate('SINGLE');
  }

  function changeMode(nextMode: FormMode) {
    if (nextMode === mode) return;

    if (nextMode === 'recurring') {
      setRecurringForm((current) => ({
        ...current,
        studentId: form.studentId,
        title: form.title,
        firstLessonDate: form.lessonDate,
        durationMinutes: form.durationMinutes,
        hourlyRate: form.hourlyRate,
        lessonNotes: form.lessonNotes,
        homework: form.homework,
        miroBoardUrl: form.miroBoardUrl,
        lessonLinks: form.lessonLinks,
        inviteEmail: form.inviteEmail,
        googleColorId: form.googleColorId,
        googleExtraReminderMinutes: form.googleExtraReminderMinutes,
        syncToGoogle: form.syncToGoogle,
      }));
    } else {
      setForm((current) => ({
        ...current,
        studentId: recurringForm.studentId,
        title: recurringForm.title,
        lessonDate: recurringForm.firstLessonDate,
        durationMinutes: recurringForm.durationMinutes,
        hourlyRate: recurringForm.hourlyRate,
        lessonNotes: recurringForm.lessonNotes,
        homework: recurringForm.homework,
        miroBoardUrl: recurringForm.miroBoardUrl,
        lessonLinks: recurringForm.lessonLinks,
        inviteEmail: recurringForm.inviteEmail,
        googleColorId: recurringForm.googleColorId,
        googleExtraReminderMinutes: recurringForm.googleExtraReminderMinutes,
        syncToGoogle: recurringForm.syncToGoogle,
      }));
    }
    setMode(nextMode);
  }

  function confirmUpdateLesson(scope: LessonUpdateScope) {
    setChoosingUpdateScope(false);
    save.mutate(scope);
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

      <ErrorAlert className="mb-6" error={lessons.error} fallback="Could not load lessons. Please refresh the page." />
      <ErrorAlert className="mb-6" error={students.error} fallback="Could not load students for lesson scheduling. Please refresh the page." />
      <ErrorAlert className="mb-6" error={googleStatus.error} fallback="Could not load Google Calendar status. Please refresh the page." />
      <ErrorAlert className="mb-6" error={retryGoogleSync.error} fallback="Could not retry failed Google Calendar syncs." />
      <ErrorAlert className="mb-6" error={remove.error} fallback="Could not delete the lesson. Please try again." />
      <ErrorAlert className="mb-6" error={updateStatuses.error} fallback="Could not update the lesson status. Please try again." />

      {failedGoogleSyncCount > 0 && (
        <Paper variant="outlined" sx={{ mb: 3, p: 2, borderColor: 'warning.light', bgcolor: 'warning.50' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{failedGoogleSyncCount} lesson sync{failedGoogleSyncCount === 1 ? '' : 's'} need attention</Typography>
              <Typography variant="body2" color="text.secondary">Your Tutr schedule is unchanged. Retry sending these lessons to Google Calendar.</Typography>
            </Box>
            <Button variant="outlined" color="warning" disabled={retryGoogleSync.isPending || !googleStatus.data?.connected} onClick={() => retryGoogleSync.mutate()}>
              {retryGoogleSync.isPending ? 'Retrying…' : 'Retry failed syncs'}
            </Button>
          </Stack>
        </Paper>
      )}
      {retryGoogleSync.isSuccess && (
        <Paper variant="outlined" sx={{ mb: 3, p: 2, borderColor: retryGoogleSync.data.failed ? 'warning.light' : 'success.light', bgcolor: retryGoogleSync.data.failed ? 'warning.50' : 'success.50' }}>
          <Typography variant="body2">
            {retryGoogleSync.data.synced} Google Calendar sync{retryGoogleSync.data.synced === 1 ? '' : 's'} recovered
            {retryGoogleSync.data.failed ? `; ${retryGoogleSync.data.failed} still need attention.` : '.'}
          </Typography>
        </Paper>
      )}

      {deletingLesson && (
        <DeleteLessonDialog
          lesson={deletingLesson}
          isDeleting={remove.isPending}
          onClose={() => setDeletingLesson(null)}
          onConfirm={confirmRemoveLesson}
        />
      )}

      <UpdateRecurringLessonDialog
        open={choosingUpdateScope}
        isUpdating={save.isPending}
        onClose={() => setChoosingUpdateScope(false)}
        onConfirm={confirmUpdateLesson}
      />

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
                  onChange={(_, value: FormMode | null) => value && changeMode(value)}
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
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filterControls = (
    <>
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
        <LessonFilterSelect label="Payment" value={filters.paymentStatus} onChange={(paymentStatus) => onChange({ ...filters, paymentStatus })} options={paymentStatusOptions.map((value) => ({ value, label: statusLabel(value) }))} placeholder="All payments" />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{resultCount} of {lessons.length} lessons shown</Typography>
        <Button variant="outlined" color="inherit" size="small" onClick={onClear} disabled={!hasFilters} sx={{ alignSelf: { sm: 'flex-end' } }}>
          Clear filters
        </Button>
      </Stack>
    </>
  );

  return (
    <Paper variant="outlined" sx={{ mb: 3, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      <Stack direction="row" sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Search & filters</Typography>
          <Typography variant="body2" color="text.secondary">
            {resultCount} of {lessons.length} shown{activeFilterCount ? ` - ${activeFilterCount} active` : ''}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          {hasFilters && (
            <Button color="inherit" size="small" onClick={onClear}>
              Clear
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setMobileFiltersOpen((current) => !current)}
            aria-expanded={mobileFiltersOpen}
            endIcon={<Icon name="chevronDown" className="h-4 w-4" style={{ transform: mobileFiltersOpen ? 'rotate(180deg)' : undefined, transition: 'transform 160ms ease' }} />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Filters
          </Button>
        </Stack>
      </Stack>
      <Collapse in={mobileFiltersOpen} unmountOnExit sx={{ display: { sm: 'none' } }}>
        <Box sx={{ mt: 2 }}>{filterControls}</Box>
      </Collapse>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{filterControls}</Box>
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

function storedLessonCalendarView(): CalendarView {
  const stored = localStorage.getItem(lessonCalendarViewStorageKey) as CalendarView | null;
  return stored && calendarViews.includes(stored) ? stored : 'WEEKLY';
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
