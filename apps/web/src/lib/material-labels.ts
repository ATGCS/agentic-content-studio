export const materialTypeLabels: Record<string, string> = {
  IMAGE: '图片',
  VIDEO: '视频',
  AUDIO: '音频',
  FILE: '文件',
};

export const materialRoleLabels: Record<string, string> = {
  COVER: '封面',
  BODY: '正文配图',
  ATTACHMENT: '附件',
};

export const materialTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;
export const materialRoles = ['COVER', 'BODY', 'ATTACHMENT'] as const;
