export interface IInspectionReport {
  id: number;
  start_date: string;
  description: string | null;
  problem: string | null;
  po_number: string | null;
  po_hours: number | null;
  photo_url: string | null;
  work_instruction_id: number;
  work_instruction_description: string | null;
  part_id: number;
  part_name: string;
  service_id: number;
  service_name: string;
  client_id: number;
  client_name: string;
  client_email: string;
}

export interface IInspectionReportsResponse {
  reports: IInspectionReport[];
  total: number;
}

export interface CreateInspectionReportData {
  work_instruction_id: number;
  start_date: string;
  po_number?: string;
  po_hours?: number;
  description?: string;
  problem?: string;
  photo_url?: string;
}

export interface UpdateInspectionReportData {
  work_instruction_id?: number;
  start_date?: string;
  po_number?: string;
  po_hours?: number;
  description?: string;
  problem?: string;
  photo_url?: string;
}

// Inspection detail associated with a report
export interface IInspectionDetail {
  id: number;
  serial_number: string | null;
  lot_number: string | null;
  inspector_id: number;
  inspector_name: string;
  inspection_date: string | null;
  shift: string | null;
  hours: number | null;
  inspected_pieces: number | null;
  accepted_pieces: number | null;
  rejected_pieces: number | null;
}

// Full report details for the modal
export interface IInspectionReportDetails {
  report: IInspectionReport;
  inspections: IInspectionDetail[];
}

// Work instruction option for select dropdown
export interface IWorkInstructionOption {
  id: number;
  description: string | null;
  part_name: string;
  service_name: string;
  client_name: string;
}
