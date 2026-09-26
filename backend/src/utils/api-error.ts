export type FieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  statusCode: number;
  errors: FieldError[];

  constructor(statusCode: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
