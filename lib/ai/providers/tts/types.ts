export type TTSTiming = {
  word: string;
  startMs: number;
  endMs: number;
};

export type TTSSynthesizeOpts = {
  text: string;
  voice: string;
  model?: string;
  confirmed?: boolean;
  bookId?: string | null;
  jobId?: string | null;
};

export type TTSResult = {
  mp3: Buffer;
  durationMs: number;
  timings: TTSTiming[] | null;
  inputChars: number;
  actualUsd: number;
  logId: string;
  model: string;
  voice: string;
  provider: 'openai' | 'elevenlabs';
};

export interface TTSProvider {
  name: 'openai' | 'elevenlabs';
  defaultModel: string;
  defaultVoice: string;
  estimateUsd(chars: number, model?: string): number;
  synthesize(opts: TTSSynthesizeOpts): Promise<TTSResult>;
}
