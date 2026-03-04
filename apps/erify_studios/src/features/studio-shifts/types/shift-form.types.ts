export type ShiftStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type ShiftFormState = {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  status?: ShiftStatus;
  isDutyManager: boolean;
};
