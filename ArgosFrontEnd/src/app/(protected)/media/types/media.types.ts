export interface IMediaFile {
  _id: string;
  filename: string;
  contentType: string;
  length: number;
  uploadDate: string;
}

export interface IMediaListResponse {
  files: IMediaFile[];
  total: number;
}
