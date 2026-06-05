import type { Lesson } from '../../../types/lesson';
import type { Student } from '../../../types/student';
import type { CalendarView } from './types';

const lessonAmountNumber = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function lessonTitle(student: Student) {
  return [student.name, student.schoolYear, student.subject].filter(Boolean).join(' ');
}

export function statusLabel(status: string) {
  return status.toLowerCase().replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function calendarPaymentPalette(lesson: Lesson) {
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

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeek(firstDay);
}

export function calendarViewDate(date: Date, view: CalendarView, direction: number) {
  if (view === 'DAILY') return addDays(date, direction);
  if (view === 'WEEKLY') return addDays(date, direction * 7);
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + direction);
  return copy;
}

export function calendarRangeLabel(date: Date, view: CalendarView) {
  if (view === 'DAILY') return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (view === 'MONTHLY') return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.toLocaleDateString('en-AU', { day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function lessonTimeRange(lesson: Lesson) {
  const start = new Date(lesson.lessonDate);
  const end = lessonEndTime(lesson);
  return `${timeLabel(start.toISOString())} - ${timeLabel(end.toISOString())}`;
}

export function lessonEndTime(lesson: Lesson) {
  return new Date(new Date(lesson.lessonDate).getTime() + lesson.durationMinutes * 60_000);
}

export function lessonAmount(lesson: Lesson) {
  return lessonAmountNumber.format(lesson.hourlyRate * lesson.durationMinutes / 60);
}

export function searchMatcher(search: string) {
  try {
    return new RegExp(search, 'i');
  } catch {
    return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
