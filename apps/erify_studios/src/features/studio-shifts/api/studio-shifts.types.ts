export type StudioShiftBlock = {
  id: string;
  start_time: string;
  end_time: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StudioShift = {
  id: string;
  studio_id: string;
  user_id: string;
  date: string;
  hourly_rate: string;
  projected_cost: string;
  calculated_cost: string | null;
  is_approved: boolean;
  is_duty_manager: boolean;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  metadata: Record<string, unknown>;
  blocks: StudioShiftBlock[];
  created_at: string;
  updated_at: string;
};

export type StudioShiftsResponse = {
  data: StudioShift[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
