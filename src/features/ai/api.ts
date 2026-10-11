import type { AiGroundingSource, GroundedAiAnswer } from './types';

interface ApiAnswer {
  summary: string;
  details: string[];
  sourceIds: string[];
  generatedAt: string;
  model?: string;
}

export async function askDeepSeek(question: string, sources: AiGroundingSource[], signal: AbortSignal): Promise<GroundedAiAnswer> {
  const response = await fetch('/api/deepseek/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      question,
      sources: sources.map(({ id, type, title, updatedAt, status, excerpt }) => ({
        id, type, title, updatedAt, status, excerpt,
      })),
    }),
  });
  if (!response.ok) throw new Error('DeepSeek 暂时不可用');
  const answer = (await response.json()) as ApiAnswer;
  if (!answer.summary || !Array.isArray(answer.details) || !Array.isArray(answer.sourceIds)) {
    throw new Error('DeepSeek 返回格式无效');
  }
  return { ...answer, mode: 'deepseek' };
}
