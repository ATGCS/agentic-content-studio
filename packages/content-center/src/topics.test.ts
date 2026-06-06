import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import * as topics from './topics.js';

describe('topics', () => {
  let operatorId: string;
  let adminId: string;

  before(async () => {
    const op = await prisma.user.findUniqueOrThrow({
      where: { email: 'operator@acs.local' },
    });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    operatorId = op.id;
    adminId = admin.id;
  });

  it('OPERATOR list only sees own topics', async () => {
    const title = `op-topic-${Date.now()}`;
    await topics.createTopic(
      { id: operatorId, email: 'operator@acs.local', name: 'Op', role: 'OPERATOR' },
      { title }
    );
    const list = await topics.listTopics(
      { id: operatorId, email: 'operator@acs.local', name: 'Op', role: 'OPERATOR' },
      {}
    );
    assert.ok(list.items.some((t) => t.title === title));
  });

  it('deleteTopic rejects when topic has contents', async () => {
    const topic = await topics.createTopic(
      { id: adminId, email: 'admin@acs.local', name: 'Admin', role: 'ADMIN' },
      { title: `del-topic-${Date.now()}` }
    );
    await prisma.content.create({
      data: {
        title: 'child',
        createdBy: adminId,
        topicId: topic.id,
        status: 'DRAFT',
      },
    });
    await assert.rejects(
      () =>
        topics.deleteTopic(
          { id: adminId, email: 'admin@acs.local', name: 'Admin', role: 'ADMIN' },
          topic.id
        ),
      (err: unknown) =>
        err instanceof AppError && err.code === ErrorCodes.BAD_REQUEST
    );
  });

  it('OPERATOR cannot update another users topic', async () => {
    const topic = await topics.createTopic(
      { id: adminId, email: 'admin@acs.local', name: 'Admin', role: 'ADMIN' },
      { title: `admin-topic-${Date.now()}` }
    );
    await assert.rejects(
      () =>
        topics.updateTopic(
          {
            id: operatorId,
            email: 'operator@acs.local',
            name: 'Op',
            role: 'OPERATOR',
          },
          topic.id,
          { title: 'hacked' }
        ),
      (err: unknown) =>
        err instanceof AppError && err.code === ErrorCodes.FORBIDDEN
    );
  });
});
