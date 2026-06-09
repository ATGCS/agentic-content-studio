import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { executeWorkflow } from './executor.js';
import { NodeRegistry } from './registry.js';
import type { WorkflowDefinition } from './types.js';

describe('executeWorkflow', () => {
  it('runs steps in order and applies context patches', async () => {
    const registry = new NodeRegistry();
    const trace: string[] = [];

    registry.register('trace', async (_ctx, input) => {
      trace.push(String(input.label));
      return { output: { last: input.label } };
    });

    registry.register('setPlatform', async (ctx) => {
      return { patch: { platform: 'WECHAT' as never, vars: { done: true } } };
    });

    const definition: WorkflowDefinition = {
      id: 'test.flow',
      name: 'test',
      steps: [
        { id: 'a', node: 'trace', input: { label: 'a' } },
        {
          id: 'loop',
          foreach: 'platforms',
          steps: [
            { id: 'b', node: 'trace', input: { label: 'loop' } },
            { id: 'c', node: 'setPlatform' },
          ],
        },
        { id: 'd', node: 'trace', input: { label: 'd' } },
      ],
    };

    const result = await executeWorkflow(
      definition,
      { contentId: 'c1', platforms: ['XIAOHONGSHU', 'WECHAT'] },
      registry
    );

    assert.deepEqual(trace, ['a', 'loop', 'loop', 'd']);
    assert.equal(result.context.vars.last, 'd');
    assert.equal(result.steps.filter((s) => s.status === 'success').length, 6);
  });

  it('skips steps when condition is false', async () => {
    const registry = new NodeRegistry();
    registry.register('noop', async () => ({ output: {} }));

    const definition: WorkflowDefinition = {
      id: 'test.skip',
      name: 'test',
      steps: [{ id: 'x', node: 'noop', when: 'hasImageSlots' }],
    };

    const result = await executeWorkflow(
      definition,
      { contentId: 'c1', platforms: [] },
      registry
    );

    assert.equal(result.steps[0]?.status, 'skipped');
  });
});
