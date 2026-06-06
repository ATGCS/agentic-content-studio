import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AppError, ErrorCodes } from './errors.js';
import { canReview, requireRoles, type AuthUser } from './rbac.js';

const admin: AuthUser = {
  id: 'a1',
  email: 'a@test',
  name: 'Admin',
  role: 'ADMIN',
};
const reviewer: AuthUser = {
  id: 'r1',
  email: 'r@test',
  name: 'Reviewer',
  role: 'REVIEWER',
};
const operator: AuthUser = {
  id: 'o1',
  email: 'o@test',
  name: 'Operator',
  role: 'OPERATOR',
};

describe('requireRoles', () => {
  it('allows matching role', () => {
    assert.doesNotThrow(() => requireRoles(admin, 'ADMIN'));
  });

  it('throws FORBIDDEN for wrong role', () => {
    assert.throws(
      () => requireRoles(operator, 'ADMIN'),
      (err: unknown) =>
        err instanceof AppError && err.code === ErrorCodes.FORBIDDEN
    );
  });
});

describe('canReview', () => {
  it('admin can review any content', () => {
    assert.strictEqual(canReview(admin, 'o1'), true);
  });

  it('reviewer cannot review own content', () => {
    assert.strictEqual(canReview(reviewer, 'r1'), false);
  });

  it('reviewer can review others content', () => {
    assert.strictEqual(canReview(reviewer, 'o1'), true);
  });

  it('operator cannot review', () => {
    assert.strictEqual(canReview(operator, 'o1'), false);
  });
});
