'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { CheckCircle2, XCircle, AlertCircle, Eye, FileText } from 'lucide-react';

interface ContentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => Promise<void> | void;
  onReject?: (id: string, comment?: string) => Promise<void> | void;
  content?: {
    id?: string;
    title?: string;
    author?: string;
    platform?: string;
    submitTime?: string;
  };
}

const reviewActions = [
  { value: 'approve', label: '审核通过', icon: CheckCircle2, color: 'text-[#00B42A]' },
  { value: 'reject', label: '驳回修改', icon: XCircle, color: 'text-[#F53F3F]' },
  { value: 'flag', label: '标记待查', icon: AlertCircle, color: 'text-[#FF7D00]' },
];

export function ContentReviewDialog({ open, onOpenChange, onApprove, onReject, content }: ContentReviewDialogProps) {
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content?.id || submitting) return;

    setSubmitting(true);
    try {
      if (reviewAction === 'approve') {
        await onApprove?.(content.id);
      } else if (reviewAction === 'reject') {
        await onReject?.(content.id, reviewComment || undefined);
      } else {
        return;
      }
      setReviewAction('');
      setReviewComment('');
      setReviewer('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="内容审核"
      description="审核内容合规性，选择审核结果并填写审核意见"
      className="sm:max-w-[720px]"
    >
      <div className="space-y-4">
        {/* 内容摘要 */}
        <div className="rounded-lg border border-[#E5E8EF] bg-[#FAFBFF] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1D2129]">待审核内容</h3>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Eye className="mr-1 size-3.5" />
              预览全文
            </Button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-[#86909C]">标题：</span>
              <span className="font-medium text-[#1D2129]">{content?.title || '618大促活动玩法拆解与案例分享'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#86909C]">作者：</span>
              <span className="text-[#4E5969]">{content?.author || '运营专员'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#86909C]">平台：</span>
              <span className="text-[#4E5969]">{content?.platform || '微信公众号'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#86909C]">提交时间：</span>
              <span className="text-[#4E5969]">{content?.submitTime || '2025-05-24 09:30'}</span>
            </div>
          </div>
        </div>

        {/* AI 预审结果 */}
        <div className="rounded-lg border border-[#E5E8EF] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-[#1664FF]" />
            <span className="text-xs font-semibold text-[#1D2129]">AI 智能预审结果</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#E8FFEA] px-2 py-0.5 text-[#00B42A]">
                <CheckCircle2 className="mr-1 size-3" />
                合规
              </span>
              <span className="text-[#86909C]">内容合规性检测通过</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#FFF7E6] px-2 py-0.5 text-[#FF7D00]">
                <AlertCircle className="mr-1 size-3" />
                建议优化
              </span>
              <span className="text-[#86909C]">检测到 2 处敏感词建议替换</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">审核结果</Label>
            <div className="flex gap-3">
              {reviewActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => setReviewAction(action.value)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-all ${
                      reviewAction === action.value
                        ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                        : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                    }`}
                  >
                    <Icon className={`size-4 ${action.color}`} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">审核意见</Label>
            <Textarea
              className="min-h-[100px] text-sm resize-none"
              placeholder="请填写审核意见（选填）"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">审核人</Label>
            <Select value={reviewer} onValueChange={setReviewer}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="选择审核人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">系统管理员</SelectItem>
                <SelectItem value="manager">运营经理</SelectItem>
                <SelectItem value="editor">内容编辑</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#F2F3F5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
            >
              保存草稿
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
              disabled={!reviewAction || reviewAction === 'flag' || submitting}
            >
              {submitting ? '提交中…' : '提交审核结果'}
            </Button>
          </div>
        </form>
      </div>
    </DialogWrapper>
  );
}
