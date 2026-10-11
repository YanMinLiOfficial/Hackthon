import type { SimulatedRole } from '../../types';

/** 展示层格式化：时间、置信度、模拟角色文案 */

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDateTime(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '时间未知' : dateTimeFormatter.format(time);
}

export function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '时间未知' : dateFormatter.format(time);
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(Math.min(1, Math.max(0, confidence)) * 100)}%`;
}

export const ROLE_LABELS: Record<SimulatedRole, string> = {
  disabled_person: '残障人士',
  volunteer: '志愿者',
  lead_volunteer: '志愿者',
  institution: '官方人士',
};
