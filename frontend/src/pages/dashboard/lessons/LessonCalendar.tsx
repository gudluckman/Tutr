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
import { type ReactNode, useMemo, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { Lesson, LessonStatus, PaymentStatus } from '../../../types/lesson';
import type { Student } from '../../../types/student';
import { lessonStatusStyles, paymentStatusOptions, paymentStatusStyles } from './constants';
import type { CalendarView } from './types';
import {
  addDays,
  calendarPaymentPalette,
  calendarRangeLabel,
  calendarViewDate,
  isGeneratedLessonTitle,
  isSameDay,
  lessonAmount,
  lessonEndTime,
  lessonTimeRange,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
  statusLabel,
  subjectOptionsForStudent,
  timeLabel,
} from './lessonUtils';

export function LessonCalendar({
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
          students={students}
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
  const timelineItems = dailyTimelineItems(dayLessons, date);

  return (
    <div className="bg-[#F7F8FA] p-3 sm:p-5">
      <div className="mb-4 border-b border-indigo-100 pb-3">
        <h3 className="font-semibold text-foreground">{date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
      </div>
      <div className="max-h-[700px] space-y-4 overflow-y-auto pr-1">
        {timelineItems.map((item) => (
          item.type === 'lesson' ? (
            <DailyLessonCard
              key={item.lesson.id}
              lesson={item.lesson}
              student={students.find((student) => student.id === item.lesson.studentId)}
              isUpdating={isUpdating(item.lesson)}
              onEdit={() => onEdit(item.lesson)}
              onDelete={() => onDelete(item.lesson)}
              onUpdateStatus={(status) => onUpdateStatus(item.lesson.id, status)}
              onUpdatePaymentStatus={(paymentStatus) => onUpdatePaymentStatus(item.lesson.id, paymentStatus)}
            />
          ) : (
            <DailyFreeTimeDivider key={item.key} label={item.label} isCurrent={item.isCurrent} />
          )
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
  const subject = primarySubject(student);
  const notePreview = lesson.lessonNotes?.trim();
  const homeworkPreview = lesson.homework?.trim();

  return (
    <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-3">
      <div className="pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
        {new Date(lesson.lessonDate).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
      </div>
      <article className="relative overflow-hidden rounded-lg border border-indigo-100 bg-white p-4 pl-5 shadow-sm sm:p-5 sm:pl-6">
        <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Icon name="clock" className="h-4 w-4 text-indigo-700" />
                <strong className="font-semibold text-foreground">{lessonTimeRange(lesson)}</strong>
              </span>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">{lesson.durationMinutes} min</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#303f9f] text-xs font-semibold text-white">
                {studentInitials(lesson.studentName)}
              </span>
              <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, minWidth: 0 }}>{lesson.studentName}</Typography>
              {student?.schoolYear && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">{student.schoolYear}</span>}
              {subject && <span className="text-sm font-medium text-indigo-900/75">{subject}</span>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="dollar" className="h-4 w-4" />
                {lesson.hourlyRate}/hr
              </span>
              <span className="font-semibold text-foreground">${lessonAmount(lesson)}</span>
              <DailyActionLink lesson={lesson} kind="video" />
              {customLinks.map((link, index) => (
                <DailyActionLink key={`${link.label}-${link.url}-${index}`} lesson={lesson} link={link} kind="link" />
              ))}
            </div>
            {(notePreview || homeworkPreview) && (
              <div className="mt-3 space-y-2">
                {notePreview && (
                  <p className="rounded-lg border border-indigo-100 bg-[#FAFBFD] px-3 py-2 text-sm text-indigo-950/80">
                    <span className="font-medium">Note:</span> {notePreview}
                  </p>
                )}
                {homeworkPreview && (
                  <p className="rounded-lg border border-indigo-100 bg-[#FAFBFD] px-3 py-2 text-sm text-indigo-950/80">
                    <span className="font-medium">Homework:</span> {homeworkPreview}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-3 lg:justify-end">
            <div className="flex flex-wrap gap-2 lg:justify-end">
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
                options={paymentStatusOptions}
                tone={paymentStatusStyles[lesson.paymentStatus]}
                disabled={isUpdating}
                onChange={(value) => onUpdatePaymentStatus(value as PaymentStatus)}
              />
            </div>
            <div className="flex shrink-0 flex-row gap-1 lg:flex-col">
              <VideoCallButton lesson={lesson} />
              <AttachedLinkButtons lesson={lesson} />
              <IconButton size="small" type="button" onClick={onEdit} aria-label={`Edit ${lesson.title || 'lesson'}`} sx={indigoIconButtonSx}>
                <Icon name="edit" className="h-4 w-4" />
              </IconButton>
              <IconButton size="small" color="error" type="button" onClick={onDelete} aria-label={`Delete ${lesson.title || 'lesson'}`} sx={{ bgcolor: '#fff1f2', '&:hover': { bgcolor: '#ffe4e6' } }}>
                  <Icon name="trash" className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function DailyActionLink({
  lesson,
  link,
  kind,
}: {
  lesson: Lesson;
  link?: { label: string; url: string };
  kind: 'video' | 'link';
}) {
  const href = kind === 'video' ? lesson.googleMeetLink : link?.url;
  if (!href) return null;

  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-900 hover:bg-indigo-100"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name={kind === 'video' ? 'video' : 'link'} className="h-4 w-4" />
      {kind === 'video' ? 'Meeting' : link?.label || 'Link'}
    </a>
  );
}

function DailyFreeTimeDivider({ label, isCurrent }: { label: string; isCurrent: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-3">
      <div className="hidden sm:block" />
      <div className="relative flex items-center gap-3 text-xs font-medium text-indigo-700/45 sm:text-sm">
        <span className="h-px flex-1 bg-indigo-100" />
        <span className={`inline-flex items-center gap-2 whitespace-nowrap ${isCurrent ? 'text-indigo-700' : ''}`}>
          {isCurrent && <Icon name="check" className="h-4 w-4" />}
          {isCurrent ? 'Current focus' : label}
        </span>
        <span className="h-px flex-1 bg-indigo-100" />
      </div>
    </div>
  );
}

function dailyTimelineItems(lessons: Lesson[], date: Date) {
  const now = new Date();
  const isToday = isSameDay(date, now);
  return lessons.flatMap((lesson, index) => {
    const items: Array<
      | { type: 'free'; key: string; label: string; isCurrent: boolean }
      | { type: 'lesson'; lesson: Lesson }
    > = [];
    const previousLesson = lessons[index - 1];

    if (previousLesson) {
      const previousEnd = lessonEndTime(previousLesson);
      const lessonStart = new Date(lesson.lessonDate);
      const freeMinutes = Math.round((lessonStart.getTime() - previousEnd.getTime()) / 60000);

      if (freeMinutes > 0) {
        items.push({
          type: 'free',
          key: `${previousLesson.id}-${lesson.id}-free`,
          label: `${timeLabel(previousEnd.toISOString())} - ${timeLabel(lessonStart.toISOString())} · ${formatFreeDuration(freeMinutes)} free`,
          isCurrent: isToday && now >= previousEnd && now < lessonStart,
        });
      }
    }

    items.push({ type: 'lesson', lesson });
    return items;
  });
}

function formatFreeDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
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
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  return (
    <>
      <div className="max-h-[640px] overflow-auto bg-[#F7F8FA]">
        <div className="grid min-h-[360px] sm:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => {
            const day = addDays(weekStart, index);
            const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), day));
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="border-b border-border/80 bg-white/60 p-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(7n)]:border-r-0">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{day.toLocaleDateString('en-AU', { weekday: 'short' })}</p>
                    <p className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{day.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  {isToday && <span className="rounded-full bg-[#303f9f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Today</span>}
                </div>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <CalendarLessonCard
                      key={lesson.id}
                      lesson={lesson}
                      student={students.find((student) => student.id === lesson.studentId)}
                      onOpen={() => setSelectedLessonId(lesson.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedLesson && (
        <LessonDetailsModal
          lesson={selectedLesson}
          student={students.find((student) => student.id === selectedLesson.studentId)}
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

function MonthlyCalendar({
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
  const firstDay = startOfMonthGrid(date);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  return (
    <>
      <div className="overflow-x-auto bg-[#F7F8FA]">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/55">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, index) => {
              const day = addDays(firstDay, index);
              const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.lessonDate), day));
              const isCurrentMonth = day.getMonth() === date.getMonth();
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="min-h-32 border-b border-r border-border/80 bg-white/60 p-2 [&:nth-child(7n)]:border-r-0">
                  <div className="mb-2 flex h-6 items-center">
                    <span className={`text-xs ${isToday ? 'font-semibold text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {day.getDate()}
                    </span>
                    {isToday && <span className="ml-1.5 rounded-full bg-[#303f9f] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Today</span>}
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
        <LessonDetailsModal
          lesson={selectedLesson}
          student={students.find((student) => student.id === selectedLesson.studentId)}
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
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="dollar" className="h-3.5 w-3.5" />{lesson.hourlyRate}/hr ({lessonAmount(lesson)})</p>
    </div>
  );
}

function LessonDetailsModal({
  lesson,
  student,
  isUpdating,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onUpdatePaymentStatus,
}: {
  lesson: Lesson;
  student?: Student;
  isUpdating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: LessonStatus) => void;
  onUpdatePaymentStatus: (status: PaymentStatus) => void;
}) {
  const customLinks = lessonLinksForDisplay(lesson);
  const hasResources = Boolean(lesson.googleMeetLink || customLinks.length > 0);
  const subject = primarySubject(student);
  const metaLabel = [subject, 'Lesson'].filter(Boolean).join(' - ') || 'Lesson';
  const titleIsStudentDetails = Boolean(student && isGeneratedLessonTitle(student, lesson.title));
  const displayTitle = titleIsStudentDetails ? '' : lesson.title || 'Tutoring lesson';
  const lessonDate = new Date(lesson.lessonDate);

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label={`${displayTitle} details`}
      sx={{
        '& .MuiBackdrop-root': { bgcolor: 'rgba(17, 24, 39, 0.42)' },
        '& .MuiDialog-paper': {
          bgcolor: '#FAFBFD',
          borderRadius: 3,
          boxShadow: '0 24px 72px rgba(15, 23, 42, 0.28)',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', bgcolor: '#ffffff', justifyContent: 'space-between', gap: 2, px: { xs: 2.5, sm: 3.5 }, pb: 2.5, pt: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: 'center', bgcolor: '#f4f6ff', border: 1, borderColor: '#dfe3f4', borderRadius: 2, color: '#7b85ad', display: 'inline-flex', gap: 1, mb: 1.5, px: 1, py: 0.75 }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 1.5, bgcolor: '#eef2ff', color: '#303f9f' }}>
                <Icon name="book" className="h-3.5 w-3.5" />
              </Box>
              <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, lineHeight: 1, textTransform: 'uppercase' }}>{metaLabel}</Typography>
            </Stack>
            {displayTitle && <Typography variant="h6" sx={{ color: '#171827', fontSize: { xs: 18, sm: 20 }, fontWeight: 750, letterSpacing: 0, lineHeight: 1.25 }}>{displayTitle}</Typography>}
            <Stack direction="row" sx={{ alignItems: 'center', color: '#64748b', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              <Box sx={{ alignItems: 'center', bgcolor: '#303f9f', borderRadius: '50%', color: '#ffffff', display: 'flex', fontSize: 11, fontWeight: 800, height: 28, justifyContent: 'center', width: 28 }}>
                {studentInitials(lesson.studentName)}
              </Box>
              <Typography variant="body2" sx={{ color: '#1f2937', fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{lesson.studentName}</Typography>
              {(student?.schoolYear || subject) && <Box component="span" sx={{ bgcolor: '#cbd5e1', borderRadius: '50%', height: 4, width: 4 }} />}
              {(student?.schoolYear || subject) && (
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: 12, lineHeight: 1.25 }}>
                  {[student?.schoolYear, subject].filter(Boolean).join(' ')}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
              <StatusPill label={statusLabel(lesson.status)} tone={lessonStatusStyles[lesson.status]} dot />
              <StatusPill label={statusLabel(lesson.paymentStatus)} tone={paymentStatusStyles[lesson.paymentStatus]} dot />
              {lesson.lessonSeriesId && <StatusPill label="Recurring" />}
            </Stack>
          </Box>
          <IconButton type="button" onClick={onClose} aria-label="Close lesson details" sx={{ color: '#7b85a8', mt: -0.5 }}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </Stack>

        <Box sx={{ bgcolor: '#FAFBFD', borderBottom: '2px solid #e4e8f2', borderTop: '2px solid #e4e8f2', px: { xs: 2.5, sm: 3.5 }, py: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
            <LessonMetric icon="calendar" label="Date" primary={lessonDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long' })} secondary={String(lessonDate.getFullYear())} />
            <LessonMetric icon="clock" label="Time" primary={timeLabel(lesson.lessonDate)} secondary={`- ${lessonEndTime(lesson).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
            <LessonMetric icon="dollar" label="Total" primary={lessonAmount(lesson)} secondary={`${lesson.hourlyRate}/hr - ${lesson.durationMinutes} min`} />
          </Box>
        </Box>

        <Stack sx={{ bgcolor: '#ffffff', gap: 2, px: { xs: 2.5, sm: 3.5 }, py: 2.5 }}>
          {lesson.lessonNotes && <LessonContentBlock icon="edit" title="Lesson notes">{lesson.lessonNotes}</LessonContentBlock>}
          {lesson.homework && <LessonContentBlock icon="book" title="Homework assigned">{lesson.homework}</LessonContentBlock>}
          {hasResources && (
            <LessonContentBlock icon="link" title="Links and resources">
              <Stack sx={{ gap: 1 }}>
                {lesson.googleMeetLink && <LessonVideoCallLine lesson={lesson} />}
                {customLinks.map((link, index) => <LessonAttachedLinkLine key={`${link.label}-${link.url}-${index}`} link={link} />)}
              </Stack>
            </LessonContentBlock>
          )}
          {!lesson.lessonNotes && !lesson.homework && !hasResources && <LessonContentBlock icon="edit" title="Lesson notes">No notes added yet.</LessonContentBlock>}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, bgcolor: '#ffffff', borderTop: 1, borderColor: '#e1e5f2', gap: 2.5, px: { xs: 2.5, sm: 3.5 }, py: 2 }}>
          <LabeledStatusSelect label="Lesson">
            <CalendarStatusSelect
              ariaLabel={`Lesson status for ${lesson.title || 'lesson'}`}
              value={lesson.status}
              options={['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']}
              tone={lessonStatusStyles[lesson.status]}
              disabled={isUpdating}
              onChange={(value) => onUpdateStatus(value as LessonStatus)}
            />
          </LabeledStatusSelect>
          <LabeledStatusSelect label="Payment">
            <CalendarStatusSelect
              ariaLabel={`Payment status for ${lesson.title || 'lesson'}`}
              value={lesson.paymentStatus}
              options={paymentStatusOptions}
              tone={paymentStatusStyles[lesson.paymentStatus]}
              disabled={isUpdating}
              onChange={(value) => onUpdatePaymentStatus(value as PaymentStatus)}
            />
          </LabeledStatusSelect>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', bgcolor: '#ffffff', borderTop: 1, borderColor: '#e1e5f2', justifyContent: 'space-between', gap: 2, px: { xs: 2.5, sm: 3.5 }, py: 2.25 }}>
          <IconButton
            type="button"
            color="error"
            onClick={onDelete}
            aria-label="Delete lesson"
            sx={{ color: '#ef4444' }}
          >
            <Icon name="trash" className="h-4 w-4" />
          </IconButton>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="text"
              type="button"
              size="small"
              onClick={onClose}
              sx={{ color: '#64708f', fontSize: 14, fontWeight: 500, minHeight: 38, px: 2, textTransform: 'none' }}
            >
              Close
            </Button>
            <Button
              variant="contained"
              type="button"
              size="small"
              startIcon={<Icon name="edit" className="h-3.5 w-3.5" />}
              onClick={onEdit}
              sx={{ bgcolor: '#303f9f', borderRadius: 2, fontSize: 14, fontWeight: 700, minHeight: 38, px: 2.25, textTransform: 'none', '&:hover': { bgcolor: '#283593' } }}
            >
              Edit lesson
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function StatusPill({ label, tone = 'bg-muted text-muted-foreground', dot = false }: { label: string; tone?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium leading-none ${tone}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

function primarySubject(student?: Student) {
  return subjectOptionsForStudent(student)[0] ?? student?.subject?.trim();
}

function studentInitials(name?: string | null) {
  return name?.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'S';
}

function LessonMetric({ icon, label, primary, secondary }: { icon: 'calendar' | 'clock' | 'dollar'; label: string; primary: string; secondary?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.25, minWidth: 0, py: 0.5 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: '#eef2ff', color: '#303f9f', flexShrink: 0 }}>
        <Icon name={icon} className="h-3.5 w-3.5" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: '#7b85ad', display: 'block', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: '#1d243d', fontSize: 14, fontWeight: 500, lineHeight: 1.25 }}>{primary}</Typography>
        {secondary && <Typography variant="caption" sx={{ color: '#7b85ad', display: 'block', fontSize: 13, fontWeight: 400, lineHeight: 1.35 }}>{secondary}</Typography>}
      </Box>
    </Stack>
  );
}

function LessonContentBlock({ icon, title, children }: { icon: 'edit' | 'book' | 'link'; title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ bgcolor: '#FAFBFD', borderColor: '#dfe3f4', borderRadius: 2.5, p: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', color: '#303f9f', gap: 1, mb: 1.25 }}>
        <Icon name={icon} className="h-3.5 w-3.5" />
        <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, lineHeight: 1, textTransform: 'uppercase' }}>{title}</Typography>
      </Stack>
      {typeof children === 'string' ? (
        <Typography variant="body2" sx={{ color: '#343b59', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{children}</Typography>
      ) : children}
    </Paper>
  );
}

function LabeledStatusSelect({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
      <Typography variant="caption" sx={{ color: '#7b85ad', flexShrink: 0, fontSize: 12, fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>{label}</Typography>
      {children}
    </Stack>
  );
}

const indigoIconButtonSx = {
  bgcolor: '#f5f7ff',
  color: '#303f9f',
  '&:hover': {
    bgcolor: '#eef2ff',
  },
};

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
      sx={compact ? { p: 0.25, color: '#303f9f' } : indigoIconButtonSx}
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
          sx={compact ? { p: 0.25, color: '#303f9f' } : indigoIconButtonSx}
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
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        <Icon name="video" className="h-4 w-4" />
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0 }}>Meeting</Typography>
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
  onOpen,
}: {
  lesson: Lesson;
  student?: Student;
  onOpen: () => void;
}) {
  const palette = calendarPaymentPalette(lesson);
  const showStudentDetails = student && isGeneratedLessonTitle(student, lesson.title);
  const title = showStudentDetails ? student.name : lesson.title || lesson.studentName || 'Tutoring lesson';

  return (
    <ButtonBase
      type="button"
      onClick={onOpen}
      className={`group relative w-full overflow-hidden rounded-md border border-border bg-white text-left text-xs shadow-sm transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow ${palette.chip}`}
      sx={{
        alignItems: 'stretch',
        display: 'block',
        justifyContent: 'flex-start',
        minHeight: 104,
        px: 1.25,
        py: 1,
        pl: 1.75,
      }}
      aria-label={`Open ${lesson.title || lesson.studentName || 'lesson'} details`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${palette.rail}`} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="block text-[11px] font-semibold leading-tight opacity-80">{lessonTimeRange(lesson)}</span>
        <span className="block min-w-0 truncate text-sm font-semibold leading-tight text-foreground">{title}</span>
        {showStudentDetails && student.schoolYear && (
          <span className="flex min-w-0 items-start gap-1 text-[11px] leading-tight text-muted-foreground">
            <Icon name="graduation" className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{student.schoolYear}</span>
          </span>
        )}
        {showStudentDetails && student.subject && (
          <span className="flex min-w-0 items-start gap-1 text-[11px] leading-tight text-muted-foreground">
            <Icon name="book" className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{student.subject}</span>
          </span>
        )}
        <span className="flex min-w-0 items-center gap-1 text-[11px] leading-tight text-muted-foreground">
          <Icon name="dollar" className="h-3 w-3 shrink-0" />
          <span>{lessonAmount(lesson)}</span>
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${lessonStatusStyles[lesson.status]}`}>{statusLabel(lesson.status)}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${paymentStatusStyles[lesson.paymentStatus]}`}>{statusLabel(lesson.paymentStatus)}</span>
          {lesson.lessonSeriesId && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Recurring</span>}
        </span>
      </div>
    </ButtonBase>
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
        sx={statusSelectSx(tone, 13, 120)}
        className={tone}
      >
        {options.map((option) => <MenuItem key={option} value={option}>{statusLabel(option)}</MenuItem>)}
      </Select>
    </FormControl>
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
      py: 0.6,
      pl: 1.25,
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
  if (tone.includes('indigo')) return { bg: '#eef2ff', border: '#c7d2fe', color: '#303f9f' };
  if (tone.includes('blue')) return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
  if (tone.includes('green')) return { bg: '#d6f7e4', border: '#9ee7c2', color: '#166534' };
  if (tone.includes('red')) return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' };
  if (tone.includes('yellow')) return { bg: '#fff1c7', border: '#f7d27a', color: '#9a4f00' };
  return { bg: '#f9fafb', border: '#e5e7eb', color: '#374151' };
}
