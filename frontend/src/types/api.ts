export type Role = 'ADMIN' | 'TEACHER';

export interface User {
  id: number;
  login: string;
  role: Role;
  active?: boolean;
  mustChangePassword?: boolean;
  version?: number;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: User;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  fieldErrors?: FieldError[];
  conflictDates?: string[];
  [key: string]: unknown;
}
