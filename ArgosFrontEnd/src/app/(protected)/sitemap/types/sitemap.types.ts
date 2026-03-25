export interface IRouteData {
    name: string;
    path: string;
}

export interface ICategoryData {
    name: string;
    routes: IRouteData[];
}
