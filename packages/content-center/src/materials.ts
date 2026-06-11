import {
  prisma,
  type MaterialRole,
  type MaterialType,
  type Prisma,
} from '@acs/db';
import {
  AppError,
  ErrorCodes,
  parsePagination,
  type AuthUser,
  requireRoles,
} from '@acs/core';
import { getContent } from './contents.js';

async function assertContentAccess(user: AuthUser, contentId: string) {
  const content = await getContent(contentId);
  if (user.role === 'OPERATOR' && content.createdBy !== user.id) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'forbidden', 403);
  }
  return content;
}

function materialAccessWhere(user: AuthUser): Prisma.MaterialWhereInput {
  if (user.role === 'OPERATOR') {
    return { content: { createdBy: user.id } };
  }
  return {};
}

function buildMaterialListWhere(
  user: AuthUser,
  query: {
    contentId?: string;
    type?: string;
    role?: string;
    source?: string;
    keyword?: string;
  }
): Prisma.MaterialWhereInput {
  const filters: Prisma.MaterialWhereInput[] = [];

  if (query.contentId) filters.push({ contentId: query.contentId });
  if (query.type) filters.push({ type: query.type as MaterialType });
  if (query.role) filters.push({ role: query.role as MaterialRole });
  if (query.source) filters.push({ source: { contains: query.source } });
  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    filters.push({
      OR: [
        { name: { contains: keyword } },
        { source: { contains: keyword } },
        { url: { contains: keyword } },
        { localPath: { contains: keyword } },
        { content: { title: { contains: keyword } } },
      ],
    });
  }

  const access = materialAccessWhere(user);
  if (filters.length === 0) return access;
  return { ...access, AND: filters };
}

const materialListInclude = {
  content: {
    select: {
      id: true,
      title: true,
      status: true,
      creator: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

export async function listMaterials(
  user: AuthUser,
  query: {
    contentId?: string;
    type?: string;
    role?: string;
    source?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }
) {
  const { page, pageSize, skip } = parsePagination(query);
  const where = buildMaterialListWhere(user, query);

  const [items, total] = await Promise.all([
    prisma.material.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: materialListInclude,
    }),
    prisma.material.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getMaterialStats(user: AuthUser) {
  const where = materialAccessWhere(user);
  const rows = await prisma.material.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      url: true,
      source: true,
      meta: true,
      createdAt: true,
      content: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const byType: Record<MaterialType, number> = {
    IMAGE: 0,
    VIDEO: 0,
    AUDIO: 0,
    FILE: 0,
  };
  let totalSizeBytes = 0;
  const byTypeSize: Record<MaterialType, number> = {
    IMAGE: 0,
    VIDEO: 0,
    AUDIO: 0,
    FILE: 0,
  };
  const tagCounts = new Map<string, number>();
  const sourceSet = new Set<string>();

  for (const row of rows) {
    byType[row.type] += 1;
    const meta = row.meta as { size?: number; tags?: unknown } | null;
    const size = typeof meta?.size === 'number' ? meta.size : 0;
    totalSizeBytes += size;
    byTypeSize[row.type] += size;
    if (row.source) sourceSet.add(row.source);
    const tags = Array.isArray(meta?.tags) ? meta.tags : [];
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim()) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const recentUploads = rows.slice(0, 5).map((row) => ({
    id: row.id,
    name: row.name ?? row.content?.title ?? '未命名素材',
    type: row.type,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    total: rows.length,
    byType,
    totalSizeBytes,
    byTypeSize,
    topTags,
    sources: [...sourceSet].sort(),
    recentUploads,
  };
}

export async function listContentMaterials(user: AuthUser, contentId: string) {
  await assertContentAccess(user, contentId);
  return prisma.material.findMany({
    where: { contentId },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createMaterial(
  user: AuthUser,
  contentId: string,
  data: {
    type: MaterialType;
    role?: MaterialRole;
    name?: string;
    url?: string;
    localPath?: string;
    source?: string;
    meta?: Record<string, unknown>;
  }
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  await assertContentAccess(user, contentId);

  if (!data.url?.trim() && !data.localPath?.trim()) {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      'url or localPath is required',
      400
    );
  }

  return prisma.material.create({
    data: {
      contentId,
      type: data.type,
      role: data.role ?? 'ATTACHMENT',
      name: data.name,
      url: data.url,
      localPath: data.localPath,
      source: data.source,
      meta: data.meta as object | undefined,
    },
  });
}

export async function getMaterial(user: AuthUser, id: string) {
  const material = await prisma.material.findUnique({
    where: { id },
    include: { content: true },
  });
  if (!material)
    throw new AppError(ErrorCodes.NOT_FOUND, 'material not found', 404);
  await assertContentAccess(user, material.contentId);
  return material;
}

export async function updateMaterial(
  user: AuthUser,
  id: string,
  data: Partial<{
    type: MaterialType;
    role: MaterialRole;
    name: string;
    url: string;
    localPath: string;
    source: string;
    meta: Record<string, unknown>;
  }>
) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  const existing = await getMaterial(user, id);
  const nextUrl = data.url !== undefined ? data.url : existing.url;
  const nextPath =
    data.localPath !== undefined ? data.localPath : existing.localPath;
  if (!nextUrl?.trim() && !nextPath?.trim()) {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      'url or localPath is required',
      400
    );
  }
  return prisma.material.update({
    where: { id },
    data: {
      ...data,
      meta: data.meta as object | undefined,
    },
  });
}

export async function deleteMaterial(user: AuthUser, id: string) {
  requireRoles(user, 'ADMIN', 'OPERATOR');
  await getMaterial(user, id);
  return prisma.material.delete({ where: { id } });
}
