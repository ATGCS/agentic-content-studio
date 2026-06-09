'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/studio/empty-state';

type StudioTableSize = 'default' | 'compact';

const StudioTableContext = React.createContext<{ size: StudioTableSize }>({
  size: 'default',
});

export type StudioTableFrameProps = {
  children: React.ReactNode;
  className?: string;
  /** 嵌入 StudioCard 时可去掉外层边框 */
  bare?: boolean;
  size?: StudioTableSize;
  toolbar?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  loading?: boolean;
  loadingRows?: number;
  loadingColumns?: number;
  isEmpty?: boolean;
  empty?: {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
};

function StudioTableSkeleton({
  rows = 6,
  columns = 5,
  compact = false,
}: {
  rows?: number;
  columns?: number;
  compact?: boolean;
}) {
  return (
    <div className="studio-table-scroll">
      <div className="studio-table-skeleton">
        <div className="studio-table-skeleton-head">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`head-${i}`}
              className={cn('h-3.5', i === 0 ? 'w-24' : 'w-16')}
            />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={`row-${row}`}
            className={cn(
              'studio-table-skeleton-row',
              compact && 'studio-table-skeleton-row-compact'
            )}
          >
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={`cell-${row}-${col}`}
                className={cn(
                  'h-4',
                  col === 0 ? 'w-full max-w-[220px]' : 'w-20'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 表格外壳：工具栏、加载态、空态 */
export function StudioTableFrame({
  children,
  className,
  bare = false,
  size = 'default',
  toolbar,
  toolbarExtra,
  loading = false,
  loadingRows = 6,
  loadingColumns = 5,
  isEmpty = false,
  empty,
}: StudioTableFrameProps) {
  const showToolbar = toolbar || toolbarExtra;

  if (loading) {
    return (
      <div
        className={cn(
          'studio-table-shell',
          bare && 'studio-table-shell-bare',
          className
        )}
        data-size={size}
      >
        {showToolbar && (
          <div className="studio-table-toolbar">
            <div>{toolbar}</div>
            <div>{toolbarExtra}</div>
          </div>
        )}
        <StudioTableSkeleton
          rows={loadingRows}
          columns={loadingColumns}
          compact={size === 'compact'}
        />
      </div>
    );
  }

  if (isEmpty && empty) {
    return (
      <div
        className={cn(
          'studio-table-shell',
          bare && 'studio-table-shell-bare',
          className
        )}
        data-size={size}
      >
        {showToolbar && (
          <div className="studio-table-toolbar">
            <div>{toolbar}</div>
            <div>{toolbarExtra}</div>
          </div>
        )}
        <EmptyState {...empty} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'studio-table-shell',
        bare && 'studio-table-shell-bare',
        className
      )}
      data-size={size}
    >
      {showToolbar && (
        <div className="studio-table-toolbar">
          <div>{toolbar}</div>
          <div>{toolbarExtra}</div>
        </div>
      )}
      <StudioTableContext.Provider value={{ size }}>
        {children}
      </StudioTableContext.Provider>
    </div>
  );
}

export function StudioTable({
  className,
  size,
  ...props
}: React.ComponentProps<'table'> & { size?: StudioTableSize }) {
  const ctx = React.useContext(StudioTableContext);
  const resolvedSize = size ?? ctx.size;

  return (
    <div className="studio-table-scroll">
      <table
        data-slot="studio-table"
        data-size={resolvedSize}
        className={cn('studio-table w-full caption-bottom', className)}
        {...props}
      />
    </div>
  );
}

export function StudioTableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="studio-table-header"
      className={cn('studio-table-header', className)}
      {...props}
    />
  );
}

export function StudioTableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="studio-table-body"
      className={cn('studio-table-body', className)}
      {...props}
    />
  );
}

export function StudioTableFooter({
  className,
  ...props
}: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="studio-table-footer"
      className={cn('studio-table-footer', className)}
      {...props}
    />
  );
}

export function StudioTableRow({
  className,
  ...props
}: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="studio-table-row"
      className={cn('studio-table-row', className)}
      {...props}
    />
  );
}

export function StudioTableHead({
  className,
  align,
  ...props
}: React.ComponentProps<'th'> & { align?: 'left' | 'center' | 'right' }) {
  return (
    <th
      data-slot="studio-table-head"
      className={cn(
        'studio-table-head',
        align === 'right' && 'studio-table-align-right',
        align === 'center' && 'studio-table-align-center',
        className
      )}
      {...props}
    />
  );
}

export function StudioTableCell({
  className,
  align,
  variant = 'default',
  ...props
}: React.ComponentProps<'td'> & {
  align?: 'left' | 'center' | 'right';
  variant?: 'default' | 'primary' | 'muted' | 'actions';
}) {
  return (
    <td
      data-slot="studio-table-cell"
      className={cn(
        'studio-table-cell',
        variant === 'primary' && 'studio-table-cell-primary',
        variant === 'muted' && 'studio-table-cell-muted',
        variant === 'actions' && 'studio-table-cell-actions',
        align === 'right' && 'studio-table-align-right',
        align === 'center' && 'studio-table-align-center',
        className
      )}
      {...props}
    />
  );
}

export function StudioTableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="studio-table-caption"
      className={cn('studio-table-caption', className)}
      {...props}
    />
  );
}

export function StudioTableEmpty({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <StudioTableRow className="studio-table-row-empty hover:bg-transparent">
      <StudioTableCell
        colSpan={colSpan}
        className={cn('studio-table-empty', className)}
      >
        {children}
      </StudioTableCell>
    </StudioTableRow>
  );
}
