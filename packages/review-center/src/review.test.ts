import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import * as reviews from './index.js';

describe('review-center', () => {
  let adminId: string;
  let reviewerId: string;

  before(async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    const reviewer = await prisma.user.findUniqueOrThrow({
      where: { email: 'reviewer@acs.local' },
    });
    adminId = admin.id;
    reviewerId = reviewer.id;
  });

  it('createPublishingTask requires APPROVED version', async () => {
    const content = await prisma.content.create({
      data: {
        title: 'pub-test',
        createdBy: adminId,
        status: 'DRAFT',
      },
    });
    const version = await prisma.contentVersion.create({
      data: {
        contentId: content.id,
        platform: 'XIAOHONGSHU',
        status: 'DRAFT',
      },
    });
    await assert.rejects(
      () =>
        reviews.createPublishingTask({
          versionId: version.id,
          accountId: 'mock-acc-wechat',
        }),
      (err: unknown) =>
        err instanceof AppError && err.code === ErrorCodes.PUBLISH_INVALID
    );
  });

  it('listPublishingTasks filters by status', async () => {
    await prisma.platformAccount.upsert({
      where: { id: 'mock-acc-wechat' },
      update: {},
      create: {
        id: 'mock-acc-wechat',
        platform: 'WECHAT',
        accountName: 'Test WeChat',
        authStatus: 'authorized',
        ownerId: adminId,
      },
    });
    const content = await prisma.content.create({
      data: {
        title: 'filter-test',
        createdBy: adminId,
        status: 'APPROVED',
      },
    });
    const version = await prisma.contentVersion.create({
      data: {
        contentId: content.id,
        platform: 'XIAOHONGSHU',
        status: 'APPROVED',
      },
    });
    const pending = await reviews.createPublishingTask({
      versionId: version.id,
      accountId: 'mock-acc-wechat',
    });
    await prisma.publishingTask.update({
      where: { id: pending.id },
      data: { status: 'CANCELLED' },
    });

    const cancelled = await reviews.listPublishingTasks({ status: 'CANCELLED' });
    assert.ok(cancelled.some((t) => t.id === pending.id));

    const onlyPending = await reviews.listPublishingTasks({ status: 'PENDING' });
    assert.ok(!onlyPending.some((t) => t.id === pending.id));
  });

  it('approveReview updates version to APPROVED', async () => {
    const content = await prisma.content.create({
      data: {
        title: 'approve-test',
        createdBy: adminId,
        status: 'PENDING_REVIEW',
      },
    });
    const version = await prisma.contentVersion.create({
      data: {
        contentId: content.id,
        platform: 'XIAOHONGSHU',
        status: 'PENDING_REVIEW',
      },
    });
    const task = await reviews.submitReview(
      { id: adminId, email: 'admin@acs.local', name: 'Admin', role: 'ADMIN' },
      { contentId: content.id, versionId: version.id }
    );
    await reviews.approveReview(
      {
        id: reviewerId,
        email: 'reviewer@acs.local',
        name: 'Reviewer',
        role: 'REVIEWER',
      },
      task.id
    );
    const updated = await prisma.contentVersion.findUniqueOrThrow({
      where: { id: version.id },
    });
    assert.strictEqual(updated.status, 'APPROVED');
  });
});
