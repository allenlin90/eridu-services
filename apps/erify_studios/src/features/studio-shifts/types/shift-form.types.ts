export type ShiftStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type ShiftBlockFormState = {
  id: string; // Used for React key only
  startTime: string;
  endTime: string;
};

export type ShiftFormState = {
  userId: string;
  date: string;
  blocks: ShiftBlockFormState[];
  hourlyRate: string;
  status?: ShiftStatus;
  isDutyManager: boolean;
};
