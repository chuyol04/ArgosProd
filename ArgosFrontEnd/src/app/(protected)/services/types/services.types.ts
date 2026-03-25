export interface IService {
    id: number;
    name: string | null;
    start_date: string;
    end_date: string | null;
    client_id: number;
    client_name: string;
    client_email: string;
}

export interface IServicesResponse {
    services: IService[];
    total: number;
}

export interface CreateServiceData {
    client_id: number;
    start_date: string;
    end_date?: string;
    name?: string;
}

export interface UpdateServiceData {
    client_id?: number;
    start_date?: string;
    end_date?: string;
    name?: string;
}

export interface ICollaborator {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface IServiceDetails {
    service: IService;
    client: {
        id: number;
        name: string;
        email: string;
    };
    work_instructions: {
        id: number;
        inspection_rate_per_hour: number;
        description: string | null;
        part_id: number;
        part_name: string;
    }[];
    collaborators: ICollaborator[];
}
