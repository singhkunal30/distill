export type JobKind =
  | 'summary'
  | 'section_regenerate'
  | 'embedding'
  | 'tts'
  | 'quiz'
  | 'flashcards'
  | 'recommendation_index';

export type JobStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'paused';

export type JobUpdate = {
  progress?: number;
  progressNote?: string;
  completedSteps?: string[];
};

export interface JobContext {
  jobId: string;
  bookId: string | null;
  params: unknown;
  completedSteps: string[];
  // Streams progress updates to the GenerationJob row.
  setProgress: (u: JobUpdate) => Promise<void>;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;
