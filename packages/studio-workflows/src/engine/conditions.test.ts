import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCondition } from './conditions.js';
import type { WorkflowContext } from './types.js';

function ctx(vars: Record<string, unknown> = {}): WorkflowContext {
  return {
    contentId: 'c1',
    platforms: ['XIAOHONGSHU'],
    versions: [],
    vars,
  };
}

describe('evaluateCondition', () => {
  it('returns true when expression is empty', () => {
    assert.equal(evaluateCondition(undefined, ctx()), true);
  });

  it('evaluates hasImageSlots from vars', () => {
    assert.equal(
      evaluateCondition('hasImageSlots', ctx({ hasImageSlots: true })),
      true
    );
    assert.equal(evaluateCondition('hasImageSlots', ctx()), false);
    assert.equal(evaluateCondition('!hasImageSlots', ctx()), true);
  });
});
