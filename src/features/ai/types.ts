export type AiAnswerMode = 'deepseek' | 'local_fallback';

export interface AiGroundingSource {
  id: string;
  type: 'place' | 'post' | 'standard';
  entityId: string;
  title: string;
  updatedAt: string;
  status?: string;
  excerpt: string;
}

export interface GroundedAiAnswer {
  summary: string;
  details: string[];
  sourceIds: string[];
  generatedAt: string;
  mode: AiAnswerMode;
  model?: string;
}
