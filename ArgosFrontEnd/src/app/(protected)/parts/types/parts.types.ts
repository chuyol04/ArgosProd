export interface IPart {
    id: number;
    name: string;
    description: string | null;
}

export interface IPartsResponse {
    parts: IPart[];
    total: number;
}

export interface CreatePartData {
    name: string;
    description?: string;
}

export interface UpdatePartData {
    name: string;
    description: string;
}
