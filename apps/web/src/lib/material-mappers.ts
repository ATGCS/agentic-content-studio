export type MaterialType = 'image' | 'video' | 'document' | 'audio' | 'other';

export type ApiMaterial = {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  role?: string | null;
  name?: string | null;
  url?: string | null;
  localPath?: string | null;
  source?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
  content?: {
    id?: string;
    title?: string | null;
    creator?: { id?: string; name?: string | null; email?: string | null } | null;
  } | null;
};

export type MaterialItem = {
  id: string;
  contentId?: string;
  contentTitle?: string;
  name: string;
  file: string;
  type: MaterialType;
  format: string;
  size: string;
  sizeBytes: number;
  source: string;
  tags: string[];
  uploader: string;
  avatar: string;
  uploadedAt: string;
  status: 'enabled' | 'reviewing' | 'disabled';
  url?: string | null;
  role?: string | null;
  rawType: ApiMaterial['type'];
};

export type MaterialStats = {
  total: number;
  byType: Record<'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE', number>;
  totalSizeBytes: number;
  byTypeSize: Record<'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE', number>;
  topTags: { tag: string; count: number }[];
  sources: string[];
  recentUploads: {
    id: string;
    name: string;
    type: ApiMaterial['type'];
    createdAt: string;
  }[];
};

export const MATERIAL_TABS = ['全部素材', '图片', '视频', '文档', '音频', '其他'] as const;

const materialTypeMap: Record<ApiMaterial['type'], MaterialType> = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'document',
};

export function tabToMaterialType(tab: string): ApiMaterial['type'] | undefined {
  switch (tab) {
    case '图片':
      return 'IMAGE';
    case '视频':
      return 'VIDEO';
    case '文档':
      return 'FILE';
    case '音频':
      return 'AUDIO';
    default:
      return undefined;
  }
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

export function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatMaterialSize(meta?: Record<string, unknown> | null) {
  const size = typeof meta?.size === 'number' ? meta.size : 0;
  if (!size) return '-';
  return formatBytes(size);
}

function getFormat(material: ApiMaterial) {
  const path = material.url ?? material.localPath ?? material.name ?? '';
  const ext = path.split('.').pop();
  return ext && ext !== path ? ext.toUpperCase() : material.type;
}

function uploaderLabel(material: ApiMaterial) {
  const creator = material.content?.creator;
  return creator?.name ?? creator?.email ?? '系统';
}

function uploaderAvatar(label: string) {
  return label.slice(0, 1).toUpperCase();
}

export function mapApiMaterial(material: ApiMaterial): MaterialItem {
  const name = material.name ?? material.content?.title ?? '未命名素材';
  const tags = Array.isArray(material.meta?.tags)
    ? material.meta.tags.filter((tag): tag is string => typeof tag === 'string')
    : material.role
      ? [material.role]
      : [];
  const uploader = uploaderLabel(material);
  const sizeBytes = typeof material.meta?.size === 'number' ? material.meta.size : 0;

  return {
    id: material.id,
    contentId: material.content?.id,
    contentTitle: material.content?.title ?? undefined,
    name,
    file: material.localPath ?? material.url ?? name,
    type: materialTypeMap[material.type] ?? 'other',
    format: getFormat(material),
    size: formatMaterialSize(material.meta),
    sizeBytes,
    source: material.source ?? '内容素材',
    tags,
    uploader,
    avatar: uploaderAvatar(uploader),
    uploadedAt: formatDateTime(material.createdAt),
    status: 'enabled',
    url: material.url,
    role: material.role,
    rawType: material.type,
  };
}

export function apiTypeToMaterialType(type: ApiMaterial['type']): MaterialType {
  return materialTypeMap[type] ?? 'other';
}
