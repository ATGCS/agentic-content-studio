import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { AppError } from '@acs/core';
import * as materials from './materials.js';

describe('materials', () => {
  let adminId: string;
  let contentId: string;

  before(async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    adminId = admin.id;
    const content = await prisma.content.create({
      data: {
        title: 'material-test',
        createdBy: adminId,
        status: 'DRAFT',
      },
    });
    contentId = content.id;
  });

  it('createMaterial requires url or localPath', async () => {
    const user = {
      id: adminId,
      email: 'admin@acs.local',
      name: 'Admin',
      role: 'ADMIN' as const,
    };
    await assert.rejects(
      () =>
        materials.createMaterial(user, contentId, {
          type: 'IMAGE',
          role: 'COVER',
        }),
      (err: unknown) => err instanceof AppError
    );
  });

  it('creates and lists materials by type', async () => {
    const user = {
      id: adminId,
      email: 'admin@acs.local',
      name: 'Admin',
      role: 'ADMIN' as const,
    };
    await materials.createMaterial(user, contentId, {
      type: 'IMAGE',
      role: 'COVER',
      name: '封面',
      url: 'https://example.com/cover.jpg',
    });
    await materials.createMaterial(user, contentId, {
      type: 'VIDEO',
      role: 'ATTACHMENT',
      name: '介绍视频',
      url: 'https://example.com/intro.mp4',
    });
    const list = await materials.listContentMaterials(user, contentId);
    assert.ok(list.length >= 2);
    const filtered = await materials.listMaterials(user, {
      type: 'IMAGE',
      contentId,
    });
    assert.ok(filtered.items.every((m) => m.type === 'IMAGE'));
  });

  it('deleteMaterial removes row', async () => {
    const user = {
      id: adminId,
      email: 'admin@acs.local',
      name: 'Admin',
      role: 'ADMIN' as const,
    };
    const row = await materials.createMaterial(user, contentId, {
      type: 'FILE',
      role: 'ATTACHMENT',
      url: 'https://example.com/doc.pdf',
    });
    await materials.deleteMaterial(user, row.id);
    const found = await prisma.material.findUnique({ where: { id: row.id } });
    assert.strictEqual(found, null);
  });

  it('supports batch seed and full CRUD flow', async () => {
    const user = {
      id: adminId,
      email: 'admin@acs.local',
      name: 'Admin',
      role: 'ADMIN' as const,
    };
    const seedData = Array.from({ length: 12 }, (_, index) => ({
      type: index % 3 === 0 ? 'IMAGE' as const : index % 3 === 1 ? 'VIDEO' as const : 'FILE' as const,
      role: index % 2 === 0 ? 'ATTACHMENT' as const : 'BODY' as const,
      name: `批量素材-${index + 1}`,
      url: `https://example.com/material-${index + 1}.${index % 3 === 1 ? 'mp4' : index % 3 === 0 ? 'jpg' : 'pdf'}`,
      source: 'batch-test',
      meta: {
        size: (index + 1) * 1024,
        tags: ['批量测试', `tag-${index + 1}`],
      },
    }));

    const created = [];
    for (const data of seedData) {
      created.push(await materials.createMaterial(user, contentId, data));
    }

    assert.strictEqual(created.length, 12);

    const pageOne = await materials.listMaterials(user, {
      contentId,
      page: '1',
      pageSize: '5',
    });
    assert.strictEqual(pageOne.items.length, 5);
    assert.ok(pageOne.total >= 12);

    const imageList = await materials.listMaterials(user, {
      contentId,
      type: 'IMAGE',
      page: '1',
      pageSize: '20',
    });
    assert.ok(imageList.items.length >= 4);
    assert.ok(imageList.items.every((item) => item.type === 'IMAGE'));

    const detail = await materials.getMaterial(user, created[0].id);
    assert.strictEqual(detail.id, created[0].id);
    assert.strictEqual(detail.name, '批量素材-1');

    const updated = await materials.updateMaterial(user, created[0].id, {
      name: '批量素材-1-已更新',
      source: 'batch-test-updated',
      meta: { size: 4096, tags: ['已更新'] },
    });
    assert.strictEqual(updated.name, '批量素材-1-已更新');
    assert.strictEqual(updated.source, 'batch-test-updated');

    await materials.deleteMaterial(user, created[1].id);
    const deleted = await prisma.material.findUnique({ where: { id: created[1].id } });
    assert.strictEqual(deleted, null);
  });

  it('filters materials by keyword and returns stats', async () => {
    const user = {
      id: adminId,
      email: 'admin@acs.local',
      name: 'Admin',
      role: 'ADMIN' as const,
    };

    await materials.createMaterial(user, contentId, {
      type: 'IMAGE',
      role: 'COVER',
      name: 'keyword-search-target',
      url: 'https://example.com/keyword.jpg',
      source: 'keyword-source',
      meta: { size: 2048, tags: ['搜索标签'] },
    });

    const keywordList = await materials.listMaterials(user, {
      contentId,
      keyword: 'keyword-search',
    });
    assert.ok(keywordList.items.some((item) => item.name === 'keyword-search-target'));

    const stats = await materials.getMaterialStats(user);
    assert.ok(stats.total >= 1);
    assert.ok(stats.byType.IMAGE >= 1);
    assert.ok(stats.sources.includes('keyword-source'));
    assert.ok(stats.topTags.length >= 1);
    assert.ok(stats.recentUploads.some((row) => row.name === 'keyword-search-target'));
  });
});
