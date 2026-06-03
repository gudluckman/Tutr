export type RevenuePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RevenuePoint = {
  period: string;
  expectedRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
};

export type AnalyticsSummary = {
  revenuePeriod: RevenuePeriod;
  periodExpectedRevenue: number;
  periodPaidRevenue: number;
  periodOutstandingRevenue: number;
  completedLessons: number;
  scheduledLessons: number;
  cancelledLessons: number;
  revenue: RevenuePoint[];
};

export type WeeklyEarning = {
  weekStart: string;
  weekEnd: string;
  hours: number;
  income: number;
  lessonHours: number;
  lessonIncome: number;
  importedHours: number;
  importedIncome: number;
};

export type EarningsResponse = {
  totalEarnings: number;
  totalHours: number;
  averageHourlyRate: number;
  weeks: WeeklyEarning[];
  availableYears: number[];
  availableMonths: string[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalWeeks: number;
};

export type ImportEarningsResponse = {
  importedRows: number;
  updatedRows: number;
  errors: string[];
};
