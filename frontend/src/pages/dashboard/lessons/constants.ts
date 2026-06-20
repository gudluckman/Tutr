import type { LessonPayload, LessonStatus, PaymentStatus, RecurringLessonPayload } from '../../../types/lesson';
import { toDateTimeLocal } from './lessonUtils';

export const googleCalendarSyncStorageKey = 'tutr.googleCalendarSyncAt';

export const googleCalendarColors = [
  { id: '', label: 'Default', swatch: '#16a34a' },
  { id: '1', label: 'Lavender', swatch: '#7986cb' },
  { id: '2', label: 'Sage', swatch: '#33b679' },
  { id: '3', label: 'Grape', swatch: '#8e24aa' },
  { id: '4', label: 'Flamingo', swatch: '#e67c73' },
  { id: '5', label: 'Banana', swatch: '#f6c026' },
  { id: '6', label: 'Tangerine', swatch: '#f5511d' },
  { id: '7', label: 'Peacock', swatch: '#039be5' },
  { id: '8', label: 'Graphite', swatch: '#616161' },
  { id: '9', label: 'Blueberry', swatch: '#3f51b5' },
  { id: '10', label: 'Basil', swatch: '#0b8043' },
  { id: '11', label: 'Tomato', swatch: '#d50000' },
];

export const googleReminderOptions = [
  { unit: 'minutes', multiplier: 1, min: 1, max: 59 },
  { unit: 'hours', multiplier: 60, min: 1, max: 23 },
  { unit: 'days', multiplier: 1440, min: 1, max: 28 },
];

export const emptyLesson: LessonPayload = {
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
  lessonLinks: [],
  inviteEmail: '',
  googleColorId: '',
  googleExtraReminderMinutes: null,
  syncToGoogle: true,
};

export const emptyRecurring: RecurringLessonPayload = {
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
  lessonLinks: [],
  inviteEmail: '',
  googleColorId: '',
  googleExtraReminderMinutes: null,
  syncToGoogle: true,
};

export const lessonStatusStyles: Record<LessonStatus, string> = {
  SCHEDULED: 'border-blue-200 bg-blue-50 text-blue-800',
  COMPLETED: 'border-green-200 bg-green-50 text-green-800',
  CANCELLED: 'border-slate-300 bg-slate-100 text-slate-900',
  NO_SHOW: 'border-red-200 bg-red-50 text-red-800',
};

export const paymentStatusOptions: PaymentStatus[] = ['UNPAID', 'PAID'];

export const paymentStatusStyles: Record<PaymentStatus, string> = {
  PAID: 'border-green-200 bg-green-50 text-green-800',
  UNPAID: 'border-yellow-300 bg-yellow-100 text-yellow-900',
  PARTIAL: 'border-yellow-200 bg-yellow-50 text-yellow-800',
};
