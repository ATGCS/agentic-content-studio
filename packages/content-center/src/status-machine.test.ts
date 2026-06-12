import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ContentStatus } from '@acs/db';
import { canTransitionContent } from './status-machine.js';

const ALLOWED: [ContentStatus, ContentStatus][] = [
  ['DRAFT', 'PENDING_GENERATE'],
  ['DRAFT', 'GENERATING'],
  ['DRAFT', 'APPROVED'],
  ['DRAFT', 'ARCHIVED'],
  ['PENDING_GENERATE', 'GENERATING'],
  ['PENDING_GENERATE', 'DRAFT'],
  ['GENERATING', 'APPROVED'],
  ['GENERATING', 'FAILED'],
  ['APPROVED', 'PENDING_PUBLISH'],
  ['PENDING_PUBLISH', 'PUBLISHING'],
  ['PUBLISHING', 'PUBLISHED'],
  ['PUBLISHED', 'REVIEWED'],
  ['FAILED', 'DRAFT'],
];

const DENIED: [ContentStatus, ContentStatus][] = [
  ['DRAFT', 'PUBLISHED'],
  ['ARCHIVED', 'DRAFT'],
  ['PUBLISHED', 'DRAFT'],
];

describe('canTransitionContent', () => {
  for (const [from, to] of ALLOWED) {
    it(`allows ${from} -> ${to}`, () => {
      assert.strictEqual(canTransitionContent(from, to), true);
    });
  }

  for (const [from, to] of DENIED) {
    it(`disallows ${from} -> ${to}`, () => {
      assert.strictEqual(canTransitionContent(from, to), false);
    });
  }
});
