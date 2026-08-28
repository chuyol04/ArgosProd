export interface IWorkInstruction {
    id: number;
    inspection_rate_per_hour: number;
    description: string | null;
    problem: string | null;
    part_id: number;
    part_name: string;
    service_id: number;
    service_name: string;
    client_id: number;
    client_name: string;
}

export interface IWorkInstructionsResponse {
    workInstructions: IWorkInstruction[];
    total: number;
}

export interface CreateWorkInstructionData {
    service_id: number;
    /** Free-text part name/description - the backend finds or creates a
     * matching catalog row, so this no longer has to be a pre-existing part. */
    part_name: string;
    inspection_rate_per_hour: number;
    description?: string;
    problem?: string;
}

export interface UpdateWorkInstructionData {
    service_id?: number;
    part_name?: string;
    inspection_rate_per_hour?: number;
    description?: string;
    problem?: string;
}

// Simplified version for service details modal
export interface IWorkInstructionSummary {
    id: number;
    inspection_rate_per_hour: number;
    description: string | null;
    part_id: number;
    part_name: string;
}

// Evidence for work instructions.
// is_main_it: true = the signed IT file (only one per work instruction),
// false = a complementary document (safety sheets, supporting files, etc.)
export interface IEvidence {
    id: number;
    photo_url: string | null;
    comment: string | null;
    is_main_it: boolean;
}

// Inspection report associated with work instruction
export interface IInspectionReport {
    id: number;
    start_date: string;
    po_hours: number | null;
    problem: string | null;
    po_number: string | null;
    description: string | null;
}

// Collaborator (user with role)
export interface ICollaborator {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface IWorkInstructionDefect {
    id: number;
    name: string;
    description: string | null;
}

// Full work instruction details for the modal
export interface IWorkInstructionDetails {
    instruction: {
        id: number;
        inspection_rate_per_hour: number;
        description: string | null;
        problem: string | null;
        part_id: number;
        part_name: string;
        service_id: number;
        service_name: string;
        client_id: number;
        client_name: string;
        client_email: string;
    };
    evidences: IEvidence[];
    reports: IInspectionReport[];
    collaborators: ICollaborator[];
    defects: IWorkInstructionDefect[];
}
