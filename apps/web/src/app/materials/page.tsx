'use client';

import Link from 'next/link';
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
import {
  StudioTable,
  StudioTableBody,
  StudioTableCell,
  StudioTableEmpty,
  StudioTableFrame,
  StudioTableHead,
  StudioTableHeader,
  StudioTableRow,
} from '@/components/studio/studio-table';
import { cn } from '@/lib/utils';

type MaterialListResponse = {
  items: ApiMaterial[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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

const statusConfig = {
  enabled: { label: '已启用', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  disabled: { label: '已禁用', className: 'bg-[#F4F4F5] text-[#9099A6]' },
  reviewing: { label: '审核中', className: 'bg-[#E8F5FF] text-[#1664FF]' },
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

function MaterialThumbnail({
  type,
  index,
  url,
}: {
  type: MaterialType;
  index: number;
  url?: string | null;
}) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;

  if (type === 'image' && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="size-12 rounded-md object-cover shadow-sm"
      />
    );
  }

  if (type === 'image' || type === 'video') {
    const gradients = [
      'from-[#78A8FF] via-[#E8F3FF] to-[#FFB7A8]',
      'from-[#3B1F6D] via-[#5141A0] to-[#FF7D00]',
      'from-[#B9E7FF] via-[#F3F7FF] to-[#FFB66E]',
      'from-[#E8D2B4] via-[#C6E7D8] to-[#9BB8F6]',
      'from-[#111827] via-[#334155] to-[#64748B]',
    ];
    return (
      <div
        className={cn(
          'relative size-12 overflow-hidden rounded-md bg-gradient-to-br shadow-sm',
          gradients[index % gradients.length]
        )}
      >
        {type === 'video' && (
          <span className="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full bg-black/45 text-[8px] text-white">
            ▶
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex size-12 items-center justify-center rounded-md"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <Icon className="size-6" />
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
    <div className="mb-4 flex items-center justify-between">
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

  const [activeTab, setActiveTab] = useState<string>(MATERIAL_TABS[0]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  async function deleteMaterial(id: string) {
    if (!window.confirm('确定删除该素材吗？')) return;
    setActionError(null);
    try {
      await api(`/api/materials/${id}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : '删除失败');
    }
  }

  async function batchDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定删除选中的 ${selectedIds.length} 个素材吗？`))
      return;
    setActionError(null);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api(`/api/materials/${id}`, { method: 'DELETE' })
        )
      );
      await refreshAll();
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : '批量删除失败'
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
      <PageContainer className="max-w-none gap-4 p-6">
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

        <div className="grid grid-cols-[1fr_270px] gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4">
              {dynamicStats.map((item) => {
                const Icon = item.icon;
                return (
                  <StudioCard
                    key={item.label}
                    contentClassName="flex cursor-pointer items-center gap-4 p-5"
                    onClick={() => {
                      setActiveTab(item.label);
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

            <StudioCard contentClassName="p-0">
              <div className="flex border-b border-[#EEF0F5] px-5">
                {MATERIAL_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={cn(
                      'relative px-5 py-4 text-sm font-semibold text-[#4E5969]',
                      activeTab === tab && 'text-[#1664FF]'
                    )}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#1664FF]" />
                    )}
                  </button>
                ))}
              </div>
            </StudioCard>

            <div ref={tableRef}>
              <StudioCard contentClassName="p-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF0F5] px-5 py-4">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 w-36 text-xs">
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

                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A9AEB8]" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-9 w-full rounded-md border border-[#E5E8EF] bg-white pl-9 pr-3 text-xs outline-none placeholder:text-[#A9AEB8]"
                      placeholder="搜索素材名称、标签..."
                    />
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-[#E5E8EF] text-xs"
                      onClick={resetFilters}
                    >
                      重置
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-[#E5E8EF] text-xs"
                      disabled={selectedIds.length === 0}
                      onClick={() => batchDelete()}
                    >
                      批量删除
                      {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                    </Button>
                  </div>
                </div>

                <StudioTable size="compact">
                  <StudioTableHeader>
                    <StudioTableRow className="border-[#EEF0F5]">
                      <StudioTableHead className="w-10 px-5">
                        <input
                          type="checkbox"
                          className="accent-[#1664FF]"
                          checked={
                            materials.length > 0 &&
                            selectedIds.length === materials.length
                          }
                          onChange={toggleSelectAll}
                        />
                      </StudioTableHead>
                      {[
                        '素材名称',
                        '类型',
                        '格式',
                        '大小',
                        '来源',
                        '标签',
                        '上传人',
                        '上传时间',
                        '状态',
                        '操作',
                      ].map((head) => (
                        <StudioTableHead
                          key={head}
                          className="h-10 whitespace-nowrap px-3 text-[11px] font-medium text-[#86909C]"
                        >
                          {head}
                        </StudioTableHead>
                      ))}
                    </StudioTableRow>
                  </StudioTableHeader>
                  <StudioTableBody>
                    {loading ? (
                      <StudioTableRow>
                        <StudioTableCell
                          colSpan={11}
                          className="py-8 text-center text-[#86909C]"
                        >
                          素材加载中…
                        </StudioTableCell>
                      </StudioTableRow>
                    ) : loadError ? (
                      <StudioTableRow>
                        <StudioTableCell
                          colSpan={11}
                          className="py-8 text-center text-[#F53F3F]"
                        >
                          {loadError}
                        </StudioTableCell>
                      </StudioTableRow>
                    ) : materials.length === 0 ? (
                      <StudioTableRow>
                        <StudioTableCell
                          colSpan={11}
                          className="py-8 text-center text-[#86909C]"
                        >
                          暂无素材
                        </StudioTableCell>
                      </StudioTableRow>
                    ) : (
                      materials.map((item, index) => {
                        const cfg = typeConfig[item.type];
                        const status = statusConfig[item.status];
                        return (
                          <StudioTableRow
                            key={item.id}
                            className="border-[#F5F7FA] hover:bg-[#F7F8FA]"
                          >
                            <StudioTableCell className="px-5">
                              <input
                                type="checkbox"
                                className="accent-[#1664FF]"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleSelect(item.id)}
                              />
                            </StudioTableCell>
                            <StudioTableCell className="min-w-[250px] px-3 py-3">
                              <div className="flex items-center gap-3">
                                <MaterialThumbnail
                                  type={item.type}
                                  index={index}
                                  url={item.url}
                                />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    className="truncate text-left text-sm font-semibold text-[#1D2129] hover:text-[#1664FF]"
                                    onClick={() => setPreviewMaterial(item)}
                                  >
                                    {item.name}
                                  </button>
                                  {item.contentId ? (
                                    <Link
                                      href={`/contents/${item.contentId}`}
                                      className="mt-1 block truncate text-[11px] text-[#1664FF] hover:underline"
                                    >
                                      {item.contentTitle ?? '查看所属内容'}
                                    </Link>
                                  ) : (
                                    <p className="mt-1 truncate text-[11px] text-[#86909C]">
                                      {item.file}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </StudioTableCell>
                            <StudioTableCell className="px-3 text-[#4E5969]">
                              {cfg.label}
                            </StudioTableCell>
                            <StudioTableCell className="px-3 font-medium text-[#1D2129]">
                              {item.format}
                            </StudioTableCell>
                            <StudioTableCell className="px-3 text-[#4E5969]">
                              {item.size}
                            </StudioTableCell>
                            <StudioTableCell className="px-3 text-[#4E5969]">
                              {item.source}
                            </StudioTableCell>
                            <StudioTableCell className="min-w-[145px] px-3">
                              <div className="flex flex-wrap gap-1.5">
                                {item.tags.length === 0 ? (
                                  <span className="text-[#A9AEB8]">-</span>
                                ) : (
                                  item.tags.map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      className="rounded bg-[#E8F3FF] px-2 py-1 text-[11px] font-medium text-[#1664FF] hover:bg-[#D6E8FF]"
                                      onClick={() => handleTagClick(tag)}
                                    >
                                      {tag}
                                    </button>
                                  ))
                                )}
                              </div>
                            </StudioTableCell>
                            <StudioTableCell className="px-3">
                              <span className="inline-flex items-center gap-2 text-[#1D2129]">
                                <span className="flex size-6 items-center justify-center rounded-full bg-[#F5D7C8] text-[10px] font-semibold text-[#8A3F2E]">
                                  {item.avatar}
                                </span>
                                {item.uploader}
                              </span>
                            </StudioTableCell>
                            <StudioTableCell className="whitespace-nowrap px-3 text-[#4E5969]">
                              {item.uploadedAt}
                            </StudioTableCell>
                            <StudioTableCell className="px-3">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-1 text-[11px] font-semibold',
                                  status.className
                                )}
                              >
                                {status.label}
                              </span>
                            </StudioTableCell>
                            <StudioTableCell className="px-3">
                              <div className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-[#1664FF]">
                                <button
                                  type="button"
                                  onClick={() => setPreviewMaterial(item)}
                                >
                                  预览
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditMaterial(item)}
                                >
                                  编辑
                                </button>
                                {item.url ? (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    下载
                                  </a>
                                ) : (
                                  <span className="text-[#C9CDD4]">下载</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteMaterial(item.id)}
                                  className="text-[#F53F3F]"
                                >
                                  删除
                                </button>
                              </div>
                            </StudioTableCell>
                          </StudioTableRow>
                        );
                      })
                    )}
                  </StudioTableBody>
                </StudioTable>

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

          <div className="space-y-4">
            <StudioCard contentClassName="p-5">
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
                  stats.recentUploads.map((row, index) => (
                    <button
                      key={row.id}
                      type="button"
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => openRecentUpload(row.id)}
                    >
                      <MaterialThumbnail
                        type={apiTypeToMaterialType(row.type)}
                        index={index}
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
    </StudioLayout>
  );
}
