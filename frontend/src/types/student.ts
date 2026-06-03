export type Student = {
  id: string;
  name: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  schoolYear?: string;
  subject?: string;
  hourlyRate?: number;
  notes?: string;
  active: boolean;
};

export type StudentPayload = Omit<Student, 'id'>;

