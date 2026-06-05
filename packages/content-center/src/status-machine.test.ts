import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canTransitionContent } from './status-machine.js';

describe('canTransitionContent', () => {
  it('allows draft to pending_generate', () => {
    assert.strictEqual(canTransitionContent('DRAFT', 'PENDING_GENERATE'), true);
  });
  it('disallows draft to published', () => {
    assert.strictEqual(canTransitionContent('DRAFT', 'PUBLISHED'), false);
  });
});
