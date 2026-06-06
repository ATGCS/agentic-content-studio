import { AlertTriangle, Bot, ShieldAlert, ChevronRight } from 'lucide-react';
import { PlatformBadge } from './platform-badge';

type AlertItem = {
  title: string;
  detail: string;
  time?: string;
  level: 'high' | 'medium' | 'low';
};

const riskAlerts: AlertItem[] = [
  {
    title: '内容"夏日穿搭灵感合集"涉敏感内容...',
    detail: '10:24',
    level: 'high',
  },
  {
    title: '内容"AI工具测评合集"存在敏感信息...',
    detail: '09:47',
    level: 'medium',
  },
  {
    title: '账号"品牌官方号"近期违规风险...',
    detail: '昨天 18:32',
    level: 'medium',
  },
];

const agentAlerts: AlertItem[] = [
  { title: '文案生成 Agent-02 运行失败', detail: '10:15', level: 'high' },
  { title: '配图生成 Agent-03 响应超时', detail: '09:33', level: 'medium' },
  {
    title: '视频剪辑 Agent-01 任务中断',
    detail: '昨天 17:48',
    level: 'medium',
  },
];

const accountAlerts = [
  {
    platform: 'DOUYIN',
    name: '抖音 - 品牌官方号',
    detail: '授权已过期',
    time: '10:05',
  },
  {
    platform: 'XIAOHONGSHU',
    name: '公众号 - 运营研究所',
    detail: '授权失效',
    time: '昨天 16:40',
  },
  {
    platform: 'XIAOHONGSHU',
    name: '小红书 - 种草研究所',
    detail: '授权异常',
    time: '05-22 09:21',
  },
];

const levelStyles = {
  high: 'bg-[#fff1f0] text-[#f53f3f]',
  medium: 'bg-[#fff7ed] text-[#ff6a00]',
  low: 'bg-[#f0f5ff] text-[#1664ff]',
};

const levelLabels = { high: '高危', medium: '中危', low: '低危' };

function AlertSection({
  title,
  icon: Icon,
  iconTone,
  showMore,
  children,
}: {
  title: string;
  icon: typeof AlertTriangle;
  iconTone: string;
  showMore?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex size-6 items-center justify-center rounded-md ${iconTone}`}
          >
            <Icon className="size-4" />
          </div>
          <h4 className="text-sm font-semibold text-[#1D2129]">{title}</h4>
        </div>
        {showMore && (
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] text-[#1664ff]"
          >
            更多 <ChevronRight className="size-3" />
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function DashboardAlertRail() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[280px]">
      <AlertSection
        title="风险提醒"
        icon={ShieldAlert}
        iconTone="bg-[#f53f3f] text-white"
        showMore
      >
        {riskAlerts.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${levelStyles[item.level]}`}
            >
              {levelLabels[item.level]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#1D2129]">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-[#86909c]">{item.detail}</p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="w-full text-center text-xs text-[#1664ff]"
        >
          查看全部风险
        </button>
      </AlertSection>

      <AlertSection
        title="Agent 异常提醒"
        icon={Bot}
        iconTone="bg-[#1664ff] text-white"
        showMore
      >
        {agentAlerts.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${levelStyles[item.level]}`}
            >
              {levelLabels[item.level]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#1D2129]">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-[#86909c]">{item.detail}</p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="w-full text-center text-xs text-[#1664ff]"
        >
          查看全部异常
        </button>
      </AlertSection>

      <AlertSection
        title="账号授权异常提醒"
        icon={AlertTriangle}
        iconTone="bg-[#ff6a00] text-white"
        showMore
      >
        {accountAlerts.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <PlatformBadge platform={item.platform} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#1D2129]">{item.name}</p>
              <p className="mt-0.5 text-[11px] text-[#f53f3f]">
                {item.detail} · {item.time}
              </p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="w-full text-center text-xs text-[#1664ff]"
        >
          查看全部授权异常
        </button>
      </AlertSection>
    </aside>
  );
}
