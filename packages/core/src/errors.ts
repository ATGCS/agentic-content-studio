export const ErrorCodes = {
  BAD_REQUEST: 40001,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  CONTENT_NOT_FOUND: 40401,
  AGENT_FAILED: 40501,
  REVIEW_INVALID: 40601,
  PUBLISH_INVALID: 40701,
  INTERNAL: 50000,
} as const;

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public httpStatus = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
