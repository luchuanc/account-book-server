export type ApiSuccess<T> = {
  code: number;
  message: string;
  data: T;
};

export type PagedResult<T> = {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
};
