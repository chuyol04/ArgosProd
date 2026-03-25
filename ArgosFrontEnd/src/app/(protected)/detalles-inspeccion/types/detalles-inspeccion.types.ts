// Base inspection detail fields (from DB)
export interface IInspectionDetail {
  id: number;
  inspection_report_id: number;
  serial_number: string | null;
  lot_number: string | null;
  inspector_id: number | null;
  hours: number | null;
  week: number | null;
  inspection_date: string | null;
  manufacture_date: string | null;
  comments: string | null;
  inspected_pieces: number | null;
  accepted_pieces: number | null;
  rejected_pieces: number | null;
  reworked_pieces: number | null;
  start_time: string | null;
  end_time: string | null;
  shift: string | null;
  created_at: string;
  updated_at: string;
}

// Extended detail with joined fields
export interface IInspectionDetailExtended extends IInspectionDetail {
  part_name: string;
  part_description: string | null;
  po_number: string | null;
  report_start_date: string | null;
  work_instruction_description: string | null;
  service_name: string;
  client_name: string;
  inspector_name: string | null;
}

// Form data for create/update
export interface IInspectionDetailFormData {
  inspection_report_id: number;
  serial_number?: string;
  lot_number?: string;
  inspector_id?: number;
  hours?: number;
  week?: number;
  inspection_date?: string;
  manufacture_date?: string;
  comments?: string;
  inspected_pieces?: number;
  accepted_pieces?: number;
  rejected_pieces?: number;
  reworked_pieces?: number;
  start_time?: string;
  end_time?: string;
  shift?: string;
}

// API responses
export interface IInspectionDetailResponse {
  success: boolean;
  data?: IInspectionDetailExtended;
  error?: string;
}

export interface IInspectionDetailsListResponse {
  success: boolean;
  data?: IInspectionDetailExtended[];
  error?: string;
}

// For inspector dropdown
export interface IInspector {
  id: number;
  name: string;
}

// For report dropdown when creating
export interface IReportOption {
  id: number;
  part_name: string;
  service_name: string;
  po_number: string | null;
}
