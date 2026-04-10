export interface IUser {
    id: number;
    email: string;
    name?: string;
    phone_number?: string;
    roles: string[];
}

export interface IUserRow {
    id: number;
    name: string;
    email: string;
    phone_number: string | null;
    is_active: boolean;
    roles: string | null; // comma-separated from GROUP_CONCAT
}

export interface IUsersResponse {
    users: IUserRow[];
    total: number;
}

export interface IUserRole {
    id: number;
    name: string;
}

export interface IUserWorkInstruction {
    id: number;
    description: string | null;
    inspection_rate_per_hour: number;
    part_name: string;
    service_name: string;
    client_name: string;
}

export interface IUserDetails {
    id: number;
    name: string;
    email: string;
    phone_number: string | null;
    is_active: boolean;
    roles: IUserRole[];
    work_instructions: IUserWorkInstruction[];
}

export interface IRole {
    id: number;
    name: string;
    description: string | null;
}
