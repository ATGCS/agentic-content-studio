'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  FileText,
  FileVideo,
  FolderPlus,
  Image as ImageIcon,
  Music,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { EditMaterialDialog } from '@/components/dialogs/edit-material-dialog';
import { MaterialPreviewDialog } from '@/components/dialogs/material-preview-dialog';
import { UploadMaterialDialog } from '@/components/dialogs/upload-material-dialog';
import { MaterialGridCard } from '@/components/studio/material-grid-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { api, ApiError } from '@/lib/api';
import {
  apiTypeToMaterialType,
  formatBytes,
  formatDateTime,
  mapApiMaterial,
  MATERIAL_TABS,
  tabToMaterialType,
  type ApiMaterial,
  type MaterialItem,
  type MaterialStats,
  type MaterialType,
} from '@/lib/material-mappers';
import { cn } from '@/lib/utils';

type MaterialListResponse = {
  items: ApiMaterial[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const statCardConfig = [
  {
    label: '全部素材',
    key: 'total' as const,
    icon: ImageIcon,
    bg: '#E8F3FF',
    color: '#1664FF',
  },
  {
    label: '图片',
    key: 'IMAGE' as const,
    icon: ImageIcon,
    bg: '#F3E8FF',
    color: '#8B5CF6',
  },
  {
    label: '视频',
    key: 'VIDEO' as const,
    icon: FileVideo,
    bg: '#E8F3FF',
    color: '#3B82F6',
  },
  {
    label: '文档',
    key: 'FILE' as const,
    icon: FileText,
    bg: '#E8FFF3',
    color: '#10B981',
  },
  {
    label: '音频',
    key: 'AUDIO' as const,
    icon: FileAudio,
    bg: '#F7E8FF',
    color: '#A855F7',
  },
  {
    label: '其他',
    key: 'other' as const,
    icon: FolderPlus,
    bg: '#E8FBFF',
    color: '#06B6D4',
  },
];

const typeConfig: Record<
  MaterialType,
  { label: string; bg: string; color: string; icon: typeof ImageIcon }
> = {
  image: { label: '图片', bg: '#E8F3FF', color: '#1664FF', icon: ImageIcon },
  video: { label: '视频', bg: '#F0E8FF', color: '#7C3AED', icon: FileVideo },
  document: { label: '文档', bg: '#FFF0F0', color: '#F53F3F', icon: FileText },
  audio: { label: '音频', bg: '#E8FFF3', color: '#10B981', icon: Music },
  other: { label: '其他', bg: '#F5F7FA', color: '#4E5969', icon: FolderPlus },
};

const storageColors: Record<string, string> = {
  IMAGE: '#1664FF',
  VIDEO: '#14C9C9',
  FILE: '#FF7D00',
  AUDIO: '#FFB400',
};

const storageLabels: Record<string, string> = {
  IMAGE: '图片',
  VIDEO: '视频',
  FILE: '文档',
  AUDIO: '音频',
};

function RecentUploadThumb({
  type,
  url,
}: {
  type: MaterialType;
  url?: string | null;
}) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;

  if (type === 'image' && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="size-12 rounded-md object-cover" />
    );
  }

  if (type === 'video' && url) {
    return (
      <div className="relative size-12 overflow-hidden rounded-md bg-[#111827]">
        <video
          src={url}
          className="size-full object-cover"
          muted
          preload="metadata"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] text-white">
          ▶
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex size-12 items-center justify-center rounded-md"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <Icon className="size-5" />
    </div>
  );
}

function UsageDonut({ stats }: { stats: MaterialStats | null }) {
  if (!stats || stats.total === 0) {
    return <p className="text-xs text-[#86909C]">暂无素材数据</p>;
  }

  const segments = [
    { label: '图片', count: stats.byType.IMAGE, color: '#1664FF' },
    { label: '视频', count: stats.byType.VIDEO, color: '#14C9C9' },
    { label: '文档', count: stats.byType.FILE, color: '#FFB400' },
    { label: '音频', count: stats.byType.AUDIO, color: '#8B5CF6' },
  ].filter((s) => s.count > 0);

  let cursor = 0;
  const gradientParts = segments.map((seg) => {
    const pct = (seg.count / stats.total) * 100;
    const start = cursor;
    cursor += pct;
    return `${seg.color} ${start}% ${cursor}%`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative size-24 rounded-full"
        style={{
          background:
            gradientParts.length > 0
              ? `conic-gradient(${gradientParts.join(', ')})`
              : '#EEF0F5',
        }}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-base font-bold text-[#1D2129]">
            {stats.total}
          </span>
          <span className="text-[9px] text-[#86909C]">素材总数</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex justify-between gap-3">
            <span className="text-[#86909C]">{seg.label}</span>
            <span className="font-medium text-[#1D2129]">
              {seg.count} ({((seg.count / stats.total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StorageUsage({ stats }: { stats: MaterialStats | null }) {
  if (!stats) return <p className="text-xs text-[#86909C]">加载中…</p>;

  const rows = (['IMAGE', 'VIDEO', 'FILE', 'AUDIO'] as const)
    .map((type) => ({
      type,
      label: storageLabels[type],
      bytes: stats.byTypeSize[type],
      color: storageColors[type],
    }))
    .filter((row) => row.bytes > 0);

  const maxBytes = Math.max(...rows.map((r) => r.bytes), 1);
  const usedLabel = formatBytes(stats.totalSizeBytes);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-[#4E5969]">已记录 {usedLabel}</p>
          <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-[#E5E8EF]">
            <div
              className="h-full rounded-full bg-[#1664FF]"
              style={{
                width: `${Math.min(100, (stats.totalSizeBytes / (500 * 1024 * 1024 * 1024)) * 100)}%`,
              }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-[#4E5969]">
          {stats.total} 个
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-[#86909C]">暂无大小元数据</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.type}
              className="grid grid-cols-[42px_1fr_58px] items-center gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 text-[#4E5969]">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF0F5]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.bytes / maxBytes) * 100}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="text-right font-medium text-[#1D2129]">
                {formatBytes(row.bytes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagRanking({
  stats,
  onTagClick,
}: {
  stats: MaterialStats | null;
  onTagClick?: (tag: string) => void;
}) {
  if (!stats || stats.topTags.length === 0) {
    return <p className="text-xs text-[#86909C]">暂无标签数据</p>;
  }

  const maxCount = stats.topTags[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {stats.topTags.map(({ tag, count }) => (
        <div
          key={tag}
          className="grid grid-cols-[58px_1fr_44px] items-center gap-2 text-xs"
        >
          <button
            type="button"
            className="truncate text-left font-medium text-[#1664FF] hover:underline"
            onClick={() => onTagClick?.(tag)}
          >
            {tag}
          </button>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8F3FF]">
            <div
              className="h-full rounded-full bg-[#1664FF]"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-right text-[#4E5969]">
            {count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function SidebarTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-bold text-[#1D2129]">{title}</h3>
      {action && (
        <button
          type="button"
          className="text-xs font-medium text-[#1664FF]"
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default function MaterialsPage() {
  const tableRef = useRef<HTMLDivElement>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [stats, setStats] = useState<MaterialStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<
    { type: 'single'; id: string } | { type: 'batch' } | null
  >(null);

  const [activeTab, setActiveTab] = useState<string>(MATERIAL_TABS[0]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(
    null
  );
  const [editMaterial, setEditMaterial] = useState<MaterialItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, sourceFilter, keyword, pageSize]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const type = tabToMaterialType(activeTab);
    if (type) params.set('type', type);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (keyword) params.set('keyword', keyword);
    return params.toString();
  }, [activeTab, keyword, page, pageSize, sourceFilter]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api<MaterialStats>('/api/materials/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await api<MaterialListResponse>(
        `/api/materials?${buildQuery()}`
      );
      setMaterials(res.data.items.map(mapApiMaterial));
      setTotal(res.data.total);
      setSelectedIds([]);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError(
        error instanceof ApiError ? error.message : '素材加载失败，请稍后重试'
      );
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadMaterials(), loadStats()]);
  }, [loadMaterials, loadStats]);

  useEffect(() => {
    loadMaterials().catch(console.error);
  }, [loadMaterials]);

  useEffect(() => {
    loadStats().catch(console.error);
  }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const dynamicStats = useMemo(() => {
    const otherCount = stats
      ? Math.max(
          0,
          stats.total -
            stats.byType.IMAGE -
            stats.byType.VIDEO -
            stats.byType.FILE -
            stats.byType.AUDIO
        )
      : 0;

    return statCardConfig.map((item) => {
      let value = 0;
      if (item.key === 'total') value = stats?.total ?? total;
      else if (item.key === 'other') value = otherCount;
      else value = stats?.byType[item.key] ?? 0;

      return { ...item, value: String(value) };
    });
  }, [stats, total]);

  const sourceOptions = useMemo(() => {
    const sources = stats?.sources ?? [];
    return [
      { value: 'all', label: '全部来源' },
      ...sources.map((s) => ({ value: s, label: s })),
    ];
  }, [stats?.sources]);

  function resetFilters() {
    setActiveTab(MATERIAL_TABS[0]);
    setSourceFilter('all');
    setSearchInput('');
    setKeyword('');
    setPage(1);
  }

  function scrollToTable() {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === materials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(materials.map((m) => m.id));
    }
  }

  function deleteMaterial(id: string) {
    setDeleteDialog({ type: 'single', id });
  }

  function batchDelete() {
    if (selectedIds.length === 0) return;
    setDeleteDialog({ type: 'batch' });
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    const dialog = deleteDialog;
    setDeleteDialog(null);
    setActionError(null);
    try {
      if (dialog.type === 'single') {
        await api(`/api/materials/${dialog.id}`, { method: 'DELETE' });
      } else {
        await Promise.all(
          selectedIds.map((id) =>
            api(`/api/materials/${id}`, { method: 'DELETE' })
          )
        );
      }
      await refreshAll();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : dialog.type === 'batch'
            ? '批量删除失败'
            : '删除失败'
      );
    }
  }

  function handleTagClick(tag: string) {
    setSearchInput(tag);
    setActiveTab(MATERIAL_TABS[0]);
    scrollToTable();
  }

  function openRecentUpload(id: string) {
    const item = materials.find((m) => m.id === id);
    if (item) {
      setPreviewMaterial(item);
      return;
    }
    void api<ApiMaterial>(`/api/materials/${id}`)
      .then((res) => setPreviewMaterial(mapApiMaterial(res.data)))
      .catch(console.error);
  }

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-2 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button
              className="h-10 gap-2 bg-[#1664FF] px-6 text-sm hover:bg-[#0E55E8]"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="size-4" />
              上传素材
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 border-[#E5E8EF] px-5 text-sm text-[#C9CDD4]"
              disabled
              title="后端暂无文件夹功能"
            >
              <Plus className="size-4" />
              新建文件夹
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-2 border-[#E5E8EF] px-5 text-sm text-[#1664FF]"
                >
                  更多操作 <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => refreshAll()}>
                  <RefreshCw className="size-3.5" />
                  刷新列表
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedIds.length === 0}
                  onClick={() => batchDelete()}
                >
                  批量删除
                  {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {actionError && (
          <div className="rounded-md border border-[#FFECE8] bg-[#FFF1F0] px-4 py-2 text-sm text-[#F53F3F]">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-[1fr_270px] gap-2">
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2">
              {dynamicStats.map((item) => {
                const Icon = item.icon;
                return (
                  <StudioCard
                    key={item.label}
                    contentClassName="flex cursor-pointer items-center gap-3 p-4"
                    onClick={() => {
                      if (item.key === 'other') return;
                      setActiveTab(
                        item.key === 'total' ? '全部素材' : item.label
                      );
                      scrollToTable();
                    }}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[#4E5969]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold leading-none text-[#1D2129]">
                        {statsLoading ? '…' : item.value}
                      </p>
                    </div>
                  </StudioCard>
                );
              })}
            </div>

            <div ref={tableRef}>
              <StudioCard contentClassName="p-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F5] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {MATERIAL_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          activeTab === tab
                            ? 'bg-[#E8F3FF] text-[#1664FF]'
                            : 'text-[#4E5969] hover:bg-[#F5F7FA]'
                        )}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="hidden h-5 w-px shrink-0 bg-[#E5E8EF] md:block" />

                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-8 w-[min(160px,28vw)] text-xs">
                      <SelectValue placeholder="全部来源" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative min-w-[180px] flex-1 md:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#A9AEB8]" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-8 w-full rounded-md border border-[#E5E8EF] bg-white pl-8 pr-3 text-xs outline-none placeholder:text-[#A9AEB8]"
                      placeholder="搜索素材名称、标签..."
                    />
                  </div>

                  <div className="flex items-center gap-2 md:ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-[#E5E8EF] px-3 text-xs"
                      onClick={resetFilters}
                    >
                      重置
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-[#E5E8EF] px-3 text-xs"
                      disabled={selectedIds.length === 0}
                      onClick={() => batchDelete()}
                    >
                      批量删除
                      {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-[#EEF0F5] px-5 py-2">
                  <label className="flex items-center gap-2 text-xs text-[#4E5969]">
                    <input
                      type="checkbox"
                      className="accent-[#1664FF]"
                      checked={
                        materials.length > 0 &&
                        selectedIds.length === materials.length
                      }
                      onChange={toggleSelectAll}
                    />
                    全选本页
                  </label>
                  <span className="text-xs text-[#86909C]">
                    {activeTab === '全部素材'
                      ? '显示全部类型'
                      : `仅显示：${activeTab}`}
                  </span>
                </div>

                {loading ? (
                  <div className="px-5 py-16 text-center text-sm text-[#86909C]">
                    素材加载中…
                  </div>
                ) : loadError ? (
                  <div className="px-5 py-16 text-center text-sm text-[#F53F3F]">
                    {loadError}
                  </div>
                ) : materials.length === 0 ? (
                  <div className="px-5 py-16 text-center text-sm text-[#86909C]">
                    {activeTab === '全部素材'
                      ? '暂无素材，可点击「上传素材」添加'
                      : `暂无「${activeTab}」类素材`}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {materials.map((item) => (
                      <MaterialGridCard
                        key={item.id}
                        item={item}
                        selected={selectedIds.includes(item.id)}
                        onSelect={toggleSelect}
                        onPreview={setPreviewMaterial}
                        onEdit={setEditMaterial}
                        onDelete={deleteMaterial}
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] px-5 py-4 text-xs text-[#4E5969]">
                  <span>
                    共 <b className="text-[#1D2129]">{total}</b> 条
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem
                            key={size}
                            value={String(size)}
                            className="text-xs"
                          >
                            {size}条/页
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-md border border-[#E5E8EF] disabled:opacity-40"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {pageNumbers.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={cn(
                          'size-8 rounded-md text-xs font-semibold',
                          p === page
                            ? 'bg-[#1664FF] text-white'
                            : 'text-[#4E5969]'
                        )}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-md border border-[#E5E8EF] disabled:opacity-40"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <span>
                      第 {page} / {totalPages} 页
                    </span>
                  </div>
                </div>
              </StudioCard>
            </div>
          </div>

          <div className="space-y-2">
            <StudioCard contentClassName="p-4">
              <SidebarTitle title="素材类型分布" />
              <UsageDonut stats={stats} />
            </StudioCard>
            <StudioCard contentClassName="p-5">
              <SidebarTitle title="存储空间使用" />
              <StorageUsage stats={stats} />
            </StudioCard>
            <StudioCard contentClassName="p-5">
              <SidebarTitle title="热门标签 TOP10" />
              <TagRanking stats={stats} onTagClick={handleTagClick} />
            </StudioCard>
            <StudioCard contentClassName="p-5">
              <SidebarTitle
                title="最近上传"
                action="查看全部"
                onAction={() => {
                  resetFilters();
                  scrollToTable();
                }}
              />
              <div className="space-y-4">
                {!stats || stats.recentUploads.length === 0 ? (
                  <p className="text-xs text-[#86909C]">暂无上传记录</p>
                ) : (
                  stats.recentUploads.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => openRecentUpload(row.id)}
                    >
                      <RecentUploadThumb
                        type={apiTypeToMaterialType(row.type)}
                        url={row.url}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#1D2129]">
                          {row.name}
                        </p>
                        <p className="mt-1 text-xs text-[#86909C]">
                          {formatDateTime(row.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </StudioCard>
          </div>
        </div>
      </PageContainer>

      <UploadMaterialDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={refreshAll}
      />
      <MaterialPreviewDialog
        open={!!previewMaterial}
        onOpenChange={(open) => !open && setPreviewMaterial(null)}
        material={previewMaterial}
      />
      <EditMaterialDialog
        open={!!editMaterial}
        onOpenChange={(open) => !open && setEditMaterial(null)}
        material={editMaterial}
        onSuccess={refreshAll}
      />
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === 'batch'
                ? `确定删除选中的 ${selectedIds.length} 个素材吗？删除后不可恢复。`
                : '确定删除该素材吗？删除后不可恢复。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#F53F3F] hover:bg-[#D92E2E]"
              onClick={confirmDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudioLayout>
  );
}
