// SM-2 spaced-repetition scheduler.
//
// Reference: SuperMemo 2 (1990), Piotr Wozniak.
//   https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
//
// Quality scale, 0..5:
//   0 — complete blackout
//   1 — wrong but the correct answer felt familiar
//   2 — wrong, easy to recall the correct answer
//   3 — correct with serious difficulty
//   4 — correct with hesitation
//   5 — perfect recall
//
// Distill maps the four buttons in the review UI to quality:
//   Again → 0   Hard → 3   Good → 4   Easy → 5

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export type CardScheduleState = {
  ease: number;          // E-Factor, floor 1.3
  intervalDays: number;  // days until next due
  repetitions: number;   // consecutive successful (q ≥ 3) reviews
};

export type CardScheduleResult = CardScheduleState & {
  dueAt: Date;
};

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

export function schedule(
  state: CardScheduleState,
  quality: ReviewQuality,
  now: Date = new Date(),
): CardScheduleResult {
  let ease = state.ease;
  let intervalDays = state.intervalDays;
  let repetitions = state.repetitions;

  if (quality < 3) {
    // Wrong answer — restart the interval, keep the ease (but apply the
    // standard E-Factor adjustment too; canonical SM-2 reduces ease on
    // bad answers).
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(state.intervalDays * ease);
  }

  // E-Factor update — applies to every review, success or fail.
  // E' = E + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  ease = Math.max(MIN_EASE, +(ease + delta).toFixed(4));

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return { ease, intervalDays, repetitions, dueAt };
}

/** Initial state for a brand-new card. */
export function initialState(): CardScheduleState {
  return { ease: DEFAULT_EASE, intervalDays: 0, repetitions: 0 };
}

/**
 * The label the review UI shows for each quality button.
 * Returns the interval the card will get if the user picks that button.
 */
export function previewIntervals(state: CardScheduleState): {
  again: number;
  hard: number;
  good: number;
  easy: number;
} {
  return {
    again: schedule(state, 0).intervalDays,
    hard: schedule(state, 3).intervalDays,
    good: schedule(state, 4).intervalDays,
    easy: schedule(state, 5).intervalDays,
  };
}
