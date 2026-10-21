export interface IInspectionReport {
  id: number;
  start_date: string;
  problem: string | null;
  photo_url: string | null;
  work_instruction_id: number;
  work_instruction_description: string | null;
  inspection_mode: "rate" | "full_time";
  inspection_rate_per_hour: number | null;
  part_id: number;
  part_name: string;
  service_id: number;
  service_name: string;
  client_id: number;
  client_name: string;
  client_email: string;
  // Aggregated across all boxes (inspection_details) of this report - only
  // present in the list endpoint (GET /reports), used by "Mis Reportes".
  inspector_names?: string | null;
  total_inspected_pieces?: number;
  total_accepted_pieces?: number;
  total_rejected_pieces?: number;
  total_reworked_pieces?: number;
}

export interface IInspectionReportsResponse {
  reports: IInspectionReport[];
  total: number;
}

export interface IReportHoursPoint {
  date: string;
  daily_hours: number;
  accumulated_hours: number;
}

export interface IReportDashboard {
  total_hours: number;
  hours_history: IReportHoursPoint[];
}

export interface CreateInspectionReportData {
  work_instruction_id: number;
  start_date: string;
  problem?: string;
  photo_url?: string;
}

export interface UpdateInspectionReportData {
  work_instruction_id?: number;
  start_date?: string;
  problem?: string;
  photo_url?: string;
}

// Inspection detail associated with a report
export interface IInspectionDetail {
  id: number;
  /** Each serial/lot is a box with its own manually captured piece counts. */
  serial_numbers: {
    id: number;
    serial_number: string;
    lot_number: string | null;
    inspected_pieces: number | null;
    accepted_pieces: number | null;
    rejected_pieces: number | null;
    reworked_pieces: number | null;
  }[];
  lot_number: string | null;
  inspector_id: number;
  inspector_name: string;
  inspection_date: string | null;
  manufacture_date?: string | null;
  shift: string | null;
  hours: number | null;
  comments: string | null;
  inspected_pieces: number | null;
  accepted_pieces: number | null;
  rejected_pieces: number | null;
  reworked_pieces?: number | null;
}

export interface IWorkInstructionDocument {
  id: number;
  photo_url: string | null;
  comment: string | null;
  is_main_it: number | boolean;
}

// Full report details for the modal
export interface IInspectionReportDetails {
  report: IInspectionReport;
  inspections: IInspectionDetail[];
  documents: IWorkInstructionDocument[];
}

// Work instruction option for select dropdown
export interface IWorkInstructionOption {
  id: number;
  start_date: string | null;
  inspection_mode: "rate" | "full_time";
  problem: string | null;
  part_name: string;
  service_name: string;
  client_name: string;
}
