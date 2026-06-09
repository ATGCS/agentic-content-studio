import {
  prisma,
  type AgentType,
  type ContentRevisionScope,
  type Platform,
} from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';

export type RevisionSnapshot = {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  coverText?: string | null;
  tags?: unknown;
  formatConfig?: unknown;
  status?: string;
};

export type RevisionTrigger = 'workflow' | 'agent' | 'manual';

export type CreateRevisionInput = {
  contentId: string;
  versionId?: string;
  scope: ContentRevisionScope;
  platform?: Platform;
  trigger: RevisionTrigger;
  agentType?: AgentType;
  agentRunId?: string;
  label?: string;
  snapshot: RevisionSnapshot;
  createdBy?: string;
};

function hasSnapshotContent(snapshot: RevisionSnapshot) {
  return Boolean(
    snapshot.title?.trim() ||
    snapshot.summary?.trim() ||
    snapshot.body?.trim() ||
    snapshot.coverText?.trim() ||
    (Array.isArray(snapshot.tags) && snapshot.tags.length > 0) ||
    snapshot.formatConfig
  );
}

function draftSnapshotFrom(content: {
  title: string;
  summary: string | null;
  body: string | null;
  coverText: string | null;
  status: string;
}): RevisionSnapshot {
  return {
    title: content.title,
    summary: content.summary,
    body: content.body,
    coverText: content.coverText,
    status: content.status,
  };
}

function versionSnapshotFrom(version: {
  title: string | null;
  body: string | null;
  coverText: string | null;
  tags: unknown;
  formatConfig: unknown;
  status: string;
}): RevisionSnapshot {
  return {
    title: version.title,
    body: version.body,
    coverText: version.coverText,
    tags: version.tags,
    formatConfig: version.formatConfig,
    status: version.status,
  };
}

export async function createRevision(input: CreateRevisionInput) {
  if (!hasSnapshotContent(input.snapshot)) return null;

  return prisma.contentRevision.create({
    data: {
      contentId: input.contentId,
      versionId: input.versionId,
      scope: input.scope,
      platform: input.platform,
      trigger: input.trigger,
      agentType: input.agentType,
      agentRunId: input.agentRunId,
      label: input.label,
      snapshot: input.snapshot as object,
      createdBy: input.createdBy,
    },
  });
}

export async function snapshotDraftBeforeUpdate(
  contentId: string,
  meta: Omit<CreateRevisionInput, 'contentId' | 'scope' | 'snapshot'>
) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      title: true,
      summary: true,
      body: true,
      coverText: true,
      status: true,
    },
  });
  if (!content) return null;

  return createRevision({
    contentId,
    scope: 'DRAFT',
    snapshot: draftSnapshotFrom(content),
    ...meta,
  });
}

export async function snapshotVersionBeforeUpdate(
  versionId: string,
  meta: Omit<
    CreateRevisionInput,
    'versionId' | 'scope' | 'snapshot' | 'contentId'
  >
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
    select: {
      contentId: true,
      platform: true,
      title: true,
      body: true,
      coverText: true,
      tags: true,
      formatConfig: true,
      status: true,
    },
  });
  if (!version) return null;

  return createRevision({
    contentId: version.contentId,
    versionId,
    scope: 'VERSION',
    platform: version.platform,
    snapshot: versionSnapshotFrom(version),
    ...meta,
  });
}

export async function snapshotContentBeforeWorkflow(contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      title: true,
      summary: true,
      body: true,
      coverText: true,
      status: true,
    },
  });
  if (!content) return;

  await createRevision({
    contentId,
    scope: 'DRAFT',
    trigger: 'workflow',
    label: '一键生成前',
    snapshot: draftSnapshotFrom(content),
  });

  const versions = await prisma.contentVersion.findMany({
    where: { contentId },
    select: {
      id: true,
      platform: true,
      title: true,
      body: true,
      coverText: true,
      tags: true,
      formatConfig: true,
      status: true,
    },
  });

  for (const version of versions) {
    await createRevision({
      contentId,
      versionId: version.id,
      scope: 'VERSION',
      platform: version.platform,
      trigger: 'workflow',
      label: '一键生成前',
      snapshot: versionSnapshotFrom(version),
    });
  }
}

export async function listRevisions(
  contentId: string,
  query?: {
    platform?: Platform;
    scope?: ContentRevisionScope;
    limit?: number;
  }
) {
  const limit = query?.limit ?? 50;
  return prisma.contentRevision.findMany({
    where: {
      contentId,
      ...(query?.platform ? { platform: query.platform } : {}),
      ...(query?.scope ? { scope: query.scope } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      agentRun: {
        select: {
          id: true,
          status: true,
          agent: { select: { type: true, name: true } },
        },
      },
      creator: { select: { id: true, name: true } },
    },
  });
}

export async function getRevision(revisionId: string) {
  const revision = await prisma.contentRevision.findUnique({
    where: { id: revisionId },
    include: {
      agentRun: {
        select: {
          id: true,
          status: true,
          agent: { select: { type: true, name: true } },
        },
      },
      creator: { select: { id: true, name: true } },
    },
  });
  if (!revision)
    throw new AppError(ErrorCodes.NOT_FOUND, 'revision not found', 404);
  return revision;
}

export async function restoreRevision(revisionId: string, createdBy?: string) {
  const revision = await getRevision(revisionId);
  const snapshot = revision.snapshot as RevisionSnapshot;

  if (revision.scope === 'DRAFT') {
    await snapshotDraftBeforeUpdate(revision.contentId, {
      trigger: 'manual',
      label: '恢复前备份',
      createdBy,
    });
    await prisma.content.update({
      where: { id: revision.contentId },
      data: {
        title: snapshot.title ?? undefined,
        summary: snapshot.summary,
        body: snapshot.body,
        coverText: snapshot.coverText,
      },
    });
  } else if (revision.versionId) {
    await snapshotVersionBeforeUpdate(revision.versionId, {
      trigger: 'manual',
      label: '恢复前备份',
      createdBy,
    });
    await prisma.contentVersion.update({
      where: { id: revision.versionId },
      data: {
        title: snapshot.title,
        body: snapshot.body,
        coverText: snapshot.coverText,
        tags: snapshot.tags as object | undefined,
        formatConfig: snapshot.formatConfig as object | undefined,
      },
    });
  }

  return revision;
}
