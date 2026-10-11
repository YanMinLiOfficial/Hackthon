export interface PublishValidationInput {
  isFacility: boolean;
  photo: string;
  hasPlace: boolean;
  newPlaceName: string;
  hasCoordinates: boolean;
  locationDirty: boolean;
  title: string;
  description: string;
  capturedAt: string;
  hasAnalysis: boolean;
  confirmed: boolean;
}

/** 同一套逐步校验供“下一步”和最终发布使用，返回真实缺失项。 */
export function validatePublish(input: PublishValidationInput, throughStep: number, now = Date.now()): { step: number; message: string } | null {
  if (input.isFacility && !input.photo) return { step: 1, message: '请先添加现场照片或选择示例照片。' };
  if (throughStep < 2) return null;
  if (input.isFacility) {
    if (!input.hasPlace && !input.newPlaceName.trim()) return { step: 2, message: '请填写新地点名称，或选择一个已有地点。' };
    if (input.locationDirty || (!input.hasPlace && !input.hasCoordinates)) return { step: 2, message: '位置已调整但尚未确认，请点击“确认观察位置”。' };
    const captureTime = Date.parse(input.capturedAt);
    if (!Number.isFinite(captureTime) || captureTime > now + 60000) return { step: 2, message: '请填写有效的拍摄时间，不能晚于当前时间。' };
  } else if (input.title.trim().length < 2) return { step: 2, message: '请填写至少 2 字的标题。' };
  if (input.description.trim().length < 10) return { step: 2, message: '请填写至少 10 字的正文，说明现场情况或分享内容。' };
  if (throughStep < 3) return null;
  if (input.isFacility && !input.hasAnalysis) return { step: 3, message: '请先运行 AI 模拟分析，再检查分析结果。' };
  if (input.isFacility && !input.confirmed) return { step: 3, message: '位置已就绪；请勾选下方“我已人工检查本帖”，完成最终确认。' };
  return null;
}
