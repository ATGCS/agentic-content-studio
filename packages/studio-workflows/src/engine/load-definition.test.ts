import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listWorkflowDefinitionIds,
  loadWorkflowDefinition,
} from './load-definition.js';

describe('loadWorkflowDefinition', () => {
  it('loads built-in content.generate json', () => {
    const def = loadWorkflowDefinition('content.generate');
    assert.equal(def.id, 'content.generate');
    assert.ok(def.steps.length > 0);
    assert.equal(def.steps[0]?.node, 'content.setStatus');
  });

  it('lists json definitions from definitions folder', () => {
    const ids = listWorkflowDefinitionIds();
    assert.ok(ids.includes('content.generate'));
  });
});
