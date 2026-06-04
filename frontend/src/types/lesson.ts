export type LessonStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL';
export type GoogleSyncStatus = 'NOT_REQUESTED' | 'NOT_CONNECTED' | 'SYNCED' | 'FAILED';
export type RecurringFrequency = 'WEEKLY';

export type Lesson = {
  id: string;
  lessonSeriesId?: string | null;
  studentId: string;
  studentName: string;
  title?: string;
  lessonDate: string;
  durationMinutes: number;
  hourlyRate: number;
  status: LessonStatus;
  paymentStatus: PaymentStatus;
  lessonNotes?: string;
  homework?: string;
  miroBoardUrl?: string;
  inviteEmail?: string;
  googleColorId?: string | null;
  googleExtraReminderMinutes?: number | null;
  googleSyncEnabled?: boolean;
  googleMeetLink?: string | null;
  googleSyncStatus?: GoogleSyncStatus;
  googleSyncError?: string | null;
  createdAt: string;
};

export type LessonPayload = Omit<Lesson, 'id' | 'studentName' | 'lessonSeriesId' | 'googleMeetLink' | 'googleSyncStatus' | 'googleSyncError' | 'createdAt'> & {
  syncToGoogle?: boolean;
};

export type LessonStatusPayload = {
  status?: LessonStatus;
  paymentStatus?: PaymentStatus;
};

export type RecurringLessonPayload = {
  studentId: string;
  title?: string;
  firstLessonDate: string;
  durationMinutes: number;
  hourlyRate: number;
  frequency: RecurringFrequency;
  intervalCount?: number;
  recurrenceUntil?: string;
  lessonNotes?: string;
  homework?: string;
  miroBoardUrl?: string;
  inviteEmail?: string;
  googleColorId?: string | null;
  googleExtraReminderMinutes?: number | null;
  syncToGoogle?: boolean;
};
