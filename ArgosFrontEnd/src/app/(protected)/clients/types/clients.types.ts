export interface IClient {
    id: number;
    name: string;
    contact_person: string;
    email: string;
    phone_number: string;
}

export interface IClientsResponse {
    clients: IClient[];
    total: number;
}

export interface CreateClientData {
    name: string;
    email: string;
    contact_person?: string;
    phone_number?: string;
}

export interface UpdateClientData {
    name: string;
    contact_person: string;
    email: string;
    phone_number: string;
}
