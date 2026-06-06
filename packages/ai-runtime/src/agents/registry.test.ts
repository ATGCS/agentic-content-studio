import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { AgentType } from '@acs/db';
import { agentSpecRegistry } from './registry.js';
import { outputParserRegistry } from '../output/parser-registry.js';
import { outputApplierRegistry } from '../output/applier-registry.js';

const agentTypes: AgentType[] = [
  'TITLE',
  'TAG',
  'REWRITE',
  'BODY',
  'COVER_COPY',
  'REVIEW',
  'SUMMARY',
  'TOPIC',
  'IMAGE',
  'VIDEO_SCRIPT',
  'COMPETITOR',
];

describe('agentSpecRegistry', () => {
  it('has executable spec for every agent type', () => {
    for (const type of agentTypes) {
      const spec = agentSpecRegistry.get(type);
      assert.strictEqual(spec.type, type);
      assert.ok(spec.contextProviders.length > 0);
      assert.ok(outputParserRegistry.get(spec.parser));
      assert.ok(outputApplierRegistry.get(spec.applier));
    }
  });
});
