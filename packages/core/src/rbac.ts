import type { UserRole } from '@acs/db';
import { ErrorCodes, AppError } from './errors.js';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function requireRoles(user: AuthUser, ...roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
}

export function canReview(user: AuthUser, contentCreatedBy: string): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'REVIEWER') return false;
  return user.id !== contentCreatedBy;
}
