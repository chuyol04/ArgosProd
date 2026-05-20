export interface IDefect {
    id: number;
    name: string;
    description: string | null;
}

export interface IDefectsResponse {
    defects: IDefect[];
}

export interface CreateDefectData {
    name: string;
    description?: string;
}

export interface UpdateDefectData {
    name: string;
    description: string;
}
