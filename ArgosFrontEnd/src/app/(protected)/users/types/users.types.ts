export interface IUser {
    id: number;
    email: string;
    name?: string;
    phone_number?: string;
    roles: string[];
}