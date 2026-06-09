/** Agent 任务记录页中文文案（独立文件，避免编码损坏） */
export const agentTypeLabels: Record<string, string> = {
  TITLE: '标题生成 Agent',
  BODY: '正文生成 Agent',
  REWRITE: '平台改写 Agent',
  REVIEW: '审核检查 Agent',
  TAG: '标签生成 Agent',
  SUMMARY: '摘要生成 Agent',
  IMAGE: '图片提示词 Agent',
  VIDEO_SCRIPT: '视频脚本 Agent',
  TOPIC: '选题生成 Agent',
  COVER_COPY: '封面文案 Agent',
  COMPETITOR: '竞品分析 Agent',
};

export const taskTypeOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'TITLE', label: '标题生成' },
  { value: 'BODY', label: '正文生成' },
  { value: 'REWRITE', label: '平台改写' },
  { value: 'REVIEW', label: '审核检查' },
  { value: 'TAG', label: '标签生成' },
  { value: 'SUMMARY', label: '摘要生成' },
];

export const statusOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待执行' },
  { value: 'RUNNING', label: '执行中' },
  { value: 'SUCCESS', label: '已完成' },
  { value: 'FAILED', label: '失败' },
];

export const taskStatusStyles: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: '待执行',
    className: 'bg-[#FFF7E6] text-[#FF7D00]',
  },
  RUNNING: {
    label: '执行中',
    className: 'bg-[#E8F3FF] text-[#1664FF]',
  },
  SUCCESS: {
    label: '已完成',
    className: 'bg-[#E8FFEA] text-[#00B42A]',
  },
  FAILED: {
    label: '失败',
    className: 'bg-[#FFF1F0] text-[#F53F3F]',
  },
};

export const statLabels = {
  pending: '待执行',
  running: '执行中',
  success: '已完成',
  failed: '失败',
};

export const copy = {
  infoTitle: '任务记录 ≠ 生成历史',
  infoBody:
    '此处记录每次 Agent 调用的执行状态、模型与输入输出，数据来自数据库 AgentRun。内容的标题/正文快照与恢复，请打开对应内容详情页左侧的「生成历史」面板。',
  taskType: '任务类型',
  status: '状态',
  reset: '重置',
  query: '查询',
  taskList: '任务列表',
  total: (n: number) => `共 ${n} 条`,
  emptyTitle: '暂无 Agent 运行记录',
  emptyDesc:
    '执行内容一键生成或单独 Agent 改写后，这里会出现真实 AgentRun 记录',
  colTask: '任务名称',
  colContent: '关联内容',
  colPlatform: '目标平台',
  colAccount: '目标账号',
  colAgent: '执行 Agent',
  colStatus: '执行状态',
  colModel: '调用模型',
  colTime: '开始时间',
  colDuration: '耗时',
  colActions: '操作',
  viewDetail: '查看详情',
  retry: '重试',
  cancel: '取消',
  retryOk: '已重新提交执行',
  retryFail: '重试失败',
  cancelOk: '任务已取消',
  cancelFail: '取消失败',
  page: (cur: number, total: number) => `第 ${cur} / ${total} 页`,
  pageSize: (n: string) => `${n}条/页`,
  pageSizePlaceholder: '10条/页',
  emDash: '—',
  sec: (n: number) => `${n} 秒`,
  minSec: (m: number, s: number) => `${m} 分 ${s} 秒`,
};
