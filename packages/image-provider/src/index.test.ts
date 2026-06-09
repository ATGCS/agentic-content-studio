import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import {
  DEFAULT_IMAGE_PROVIDER,
  getImageProvider,
  listImageProviders,
  resolveImageProviderId,
} from './factory.js';
import { imageProviderRegistry } from './registry.js';

describe('image provider factory', () => {
  const prev = process.env.IMAGE_PROVIDER;

  afterEach(() => {
    if (prev === undefined) delete process.env.IMAGE_PROVIDER;
    else process.env.IMAGE_PROVIDER = prev;
  });

  it('defaults to agnes when unset', () => {
    delete process.env.IMAGE_PROVIDER;
    assert.equal(resolveImageProviderId(), DEFAULT_IMAGE_PROVIDER);
  });

  it('returns registered provider by id', () => {
    process.env.IMAGE_PROVIDER = 'doubao';
    assert.equal(getImageProvider().id, 'doubao');
  });

  it('rejects unknown provider id', () => {
    process.env.IMAGE_PROVIDER = 'openai';
    assert.throws(() => resolveImageProviderId(), /无效/);
  });

  it('lists built-in providers', () => {
    const ids = listImageProviders().map((p) => p.id);
    assert.ok(ids.includes('agnes'));
    assert.ok(ids.includes('doubao'));
  });

  it('registry exposes all adapters', () => {
    assert.equal(imageProviderRegistry.listIds().length, 2);
  });
});
