// Distill seed.
// Populates the library with 10 sample books spread across genres,
// pre-fills summaries/highlights/flashcards JSON fixtures that demo
// mode will surface in later phases, and seeds a few achievements.
//
// Run via: npm run seed
// Safe to re-run; uses upsert by `title`.

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

type SeedBook = {
  title: string;
  subtitle?: string;
  authors: string[];
  publishedYear: number;
  pageCount?: number;
  isbn?: string;
  openLibraryId?: string;
  coverUrl?: string;
  description: string;
  genres: string[];
  status: 'to_read' | 'reading' | 'finished' | 'archived';
  rating?: number;
  // Pre-baked AI artefacts that demo mode returns.
  blink: { heading: string; body: string }[];
  insights: string[];
  applications: string[];
  highlights: string[];
  flashcards: { front: string; back: string }[];
};

const BOOKS: SeedBook[] = [
  {
    title: 'Atomic Habits',
    subtitle: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    authors: ['James Clear'],
    publishedYear: 2018,
    pageCount: 320,
    isbn: '0735211299',
    openLibraryId: '/works/OL19815839W',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0735211299-L.jpg',
    description:
      'Tiny changes, remarkable results. A practical framework for building habits one percent at a time.',
    genres: ['Self-help', 'Productivity'],
    status: 'finished',
    rating: 5,
    blink: [
      {
        heading: 'The 1% mindset',
        body: 'Improvement compounds. A 1% daily gain leaves you 37x better over a year; a 1% loss leaves you near zero.',
      },
      {
        heading: 'Identity over outcomes',
        body: 'Aim to become the kind of person who does the thing, not just to achieve a result.',
      },
      {
        heading: 'Four laws',
        body: 'Make it obvious, attractive, easy, and satisfying. Invert to break bad habits.',
      },
      {
        heading: 'Environment design',
        body: 'Change your context and behaviour follows. Friction is the lever — not willpower.',
      },
    ],
    insights: [
      'Habits are the compound interest of self-improvement.',
      'Goals set direction; systems drive progress.',
      'Your habits cast votes for the person you’re becoming.',
    ],
    applications: [
      'Stack a new habit onto an existing routine (habit stacking).',
      'Make the cue visible: lay out gear, place books on the pillow.',
      'Use a two-minute version of any habit to get started.',
    ],
    highlights: [
      'You do not rise to the level of your goals. You fall to the level of your systems.',
      'Every action is a vote for the type of person you wish to become.',
    ],
    flashcards: [
      { front: 'What are the Four Laws of Behaviour Change?', back: 'Make it obvious, attractive, easy, and satisfying.' },
      { front: 'Identity vs. outcome goals?', back: 'Identity goals focus on who you want to become; outcome goals focus on what you want to achieve.' },
    ],
  },
  {
    title: 'Meditations',
    authors: ['Marcus Aurelius'],
    publishedYear: 180,
    pageCount: 304,
    isbn: '0140449337',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0140449337-L.jpg',
    description:
      'Personal notes of a Roman emperor on Stoic philosophy — duty, mortality, and the discipline of perception.',
    genres: ['Philosophy', 'Classics'],
    status: 'reading',
    blink: [
      {
        heading: 'The dichotomy of control',
        body: 'Distinguish what is up to you (judgment, action) from what is not (outcomes, others). Spend your effort accordingly.',
      },
      {
        heading: 'Memento mori',
        body: 'Remembering death is not morbid — it clarifies what to do today.',
      },
      {
        heading: 'The view from above',
        body: 'Zoom out: your problem is a speck on a continent on a planet on a rock in space.',
      },
    ],
    insights: [
      'You have power over your mind — not outside events.',
      'Waste no more time arguing about what a good person is. Be one.',
    ],
    applications: [
      'Each morning, name what you cannot control today and let it go.',
      'Re-read one Meditation passage at lunch to anchor the day.',
    ],
    highlights: [
      'The impediment to action advances action. What stands in the way becomes the way.',
    ],
    flashcards: [
      { front: 'Dichotomy of control?', back: 'Some things are within our control; some are not. Focus only on the former.' },
    ],
  },
  {
    title: 'The Beginning of Infinity',
    subtitle: 'Explanations That Transform the World',
    authors: ['David Deutsch'],
    publishedYear: 2011,
    pageCount: 487,
    isbn: '0143121359',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0143121359-L.jpg',
    description:
      'A wide-ranging argument that good explanations — hard-to-vary, error-correcting — are the engine of unbounded progress.',
    genres: ['Science', 'Philosophy of Science'],
    status: 'reading',
    blink: [
      {
        heading: 'Hard-to-vary explanations',
        body: 'Good explanations resist trivial modifications. Myths are easy to alter; science isn’t.',
      },
      {
        heading: 'The reach of knowledge',
        body: 'Once you understand a deep regularity, it applies to places you’ve never been.',
      },
      {
        heading: 'Problems are soluble',
        body: 'All evils are caused by insufficient knowledge — and knowledge is creatable.',
      },
    ],
    insights: [
      'Problems are inevitable. Problems are soluble. That’s the human story.',
      'Optimism is a stance about the future, not a forecast.',
    ],
    applications: [
      'When stuck, ask: what is the bad explanation here, and what is the hard-to-vary alternative?',
    ],
    highlights: ['All evils are caused by insufficient knowledge.'],
    flashcards: [
      { front: 'What makes a good explanation?', back: 'It is hard to vary while still accounting for what it claims to account for.' },
    ],
  },
  {
    title: 'Sapiens',
    subtitle: 'A Brief History of Humankind',
    authors: ['Yuval Noah Harari'],
    publishedYear: 2011,
    pageCount: 464,
    isbn: '0062316095',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0062316095-L.jpg',
    description:
      'How Homo sapiens went from forgettable ape to planetary-scale organism — through cognitive, agricultural, and scientific revolutions.',
    genres: ['History', 'Anthropology'],
    status: 'finished',
    rating: 4,
    blink: [
      {
        heading: 'Shared fictions',
        body: 'Money, nations, corporations — they exist because we collectively believe in them. That’s our superpower.',
      },
      {
        heading: 'The luxury trap',
        body: 'Convenience accrues; expectations creep upward; we never return to the simpler version.',
      },
    ],
    insights: [
      'There’s no such thing as a free luxury.',
      'We didn’t domesticate wheat. Wheat domesticated us.',
    ],
    applications: ['Audit shared fictions you participate in — money, status, ideology.'],
    highlights: ['You could never convince a monkey to give you a banana by promising him limitless bananas after death.'],
    flashcards: [
      { front: 'Why did Sapiens dominate over other hominids?', body: 'Through shared fictions that enabled flexible cooperation at scale.', back: 'Shared fictions enabled flexible, large-scale cooperation.' },
    ] as never,
  },
  {
    title: 'Thinking, Fast and Slow',
    authors: ['Daniel Kahneman'],
    publishedYear: 2011,
    pageCount: 499,
    isbn: '0374533555',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0374533555-L.jpg',
    description:
      'Two systems, one mind: how the fast, intuitive System 1 and slow, deliberate System 2 produce our judgments — and our biases.',
    genres: ['Psychology', 'Behavioural Economics'],
    status: 'finished',
    rating: 5,
    blink: [
      {
        heading: 'Two systems',
        body: 'System 1 is fast, automatic, lazy. System 2 is slow, deliberate, effortful — and easy to fatigue.',
      },
      {
        heading: 'Anchors everywhere',
        body: 'Arbitrary numbers shape estimates. Naming a price first matters.',
      },
    ],
    insights: ['What you see is all there is (WYSIATI).'],
    applications: ['Slow down on decisions over $1k — System 1 has opinions it can’t justify.'],
    highlights: ['Nothing in life is as important as you think it is, while you are thinking about it.'],
    flashcards: [
      { front: 'WYSIATI?', back: '“What you see is all there is” — System 1 builds a coherent story from limited information and treats it as complete.' },
    ],
  },
  {
    title: 'The Three-Body Problem',
    authors: ['Liu Cixin'],
    publishedYear: 2008,
    pageCount: 400,
    isbn: '0765382032',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0765382032-L.jpg',
    description:
      'A Chinese physicist makes first contact — and unleashes consequences across centuries and civilisations.',
    genres: ['Fiction', 'Science Fiction'],
    status: 'finished',
    rating: 5,
    blink: [
      {
        heading: 'First contact, made dangerous',
        body: 'A signal sent without diplomacy invites whoever is listening — including those with no incentive to be kind.',
      },
    ],
    insights: ['Civilisations are darker forests than we want them to be.'],
    applications: [],
    highlights: ['In nature, nothing exists alone.'],
    flashcards: [{ front: 'What is the “dark forest” hypothesis?', back: 'A game-theoretic answer to the Fermi paradox: civilisations stay silent because contact is dangerous.' }],
  },
  {
    title: 'Deep Work',
    subtitle: 'Rules for Focused Success in a Distracted World',
    authors: ['Cal Newport'],
    publishedYear: 2016,
    pageCount: 304,
    isbn: '1455586692',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/1455586692-L.jpg',
    description:
      'A case — and a system — for cultivating long, undistracted hours on cognitively demanding work.',
    genres: ['Productivity', 'Business'],
    status: 'to_read',
    blink: [
      {
        heading: 'Deep work is a superpower',
        body: 'In a knowledge economy, the ability to focus on hard things without distraction is rare and rapidly valuable.',
      },
    ],
    insights: ['Schedule depth. Default state is shallow.'],
    applications: ['Block a 90-minute deep-work session before opening any communication app.'],
    highlights: ['Clarity about what matters provides clarity about what does not.'],
    flashcards: [{ front: 'Deep vs shallow work?', back: 'Deep work is cognitively demanding focus. Shallow work is logistical/communication tasks easily reproduced by anyone.' }],
  },
  {
    title: 'The Selfish Gene',
    authors: ['Richard Dawkins'],
    publishedYear: 1976,
    pageCount: 360,
    isbn: '0198788606',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/0198788606-L.jpg',
    description:
      'Why the gene, not the organism, is the unit of natural selection — and why that perspective rewrites biology.',
    genres: ['Science', 'Biology'],
    status: 'to_read',
    blink: [
      {
        heading: 'The gene’s-eye view',
        body: 'Bodies are vehicles built by genes to survive into the next generation. Reframe behaviour from here.',
      },
      {
        heading: 'The meme',
        body: 'Cultural ideas replicate too — and may not optimise for our benefit.',
      },
    ],
    insights: ['We are survival machines — robot vehicles blindly programmed to preserve the selfish molecules known as genes.'],
    applications: [],
    highlights: ['We, alone on earth, can rebel against the tyranny of the selfish replicators.'],
    flashcards: [{ front: 'What is a meme, in Dawkins’ sense?', back: 'A unit of cultural transmission — an idea, behaviour, or style that spreads by replication.' }],
  },
  {
    title: 'How to Take Smart Notes',
    authors: ['Sönke Ahrens'],
    publishedYear: 2017,
    pageCount: 178,
    isbn: '1542866502',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/1542866502-L.jpg',
    description:
      'A practical introduction to the Zettelkasten method — turning notes into a writing system that thinks alongside you.',
    genres: ['Productivity', 'Learning'],
    status: 'reading',
    blink: [
      {
        heading: 'Notes are the work',
        body: 'Don’t collect notes; write them in your own words, and link them to existing thinking.',
      },
      {
        heading: 'Atomic, linked, evergreen',
        body: 'One idea per note. Link liberally. Treat the slipbox as a thinking partner.',
      },
    ],
    insights: ['Writing isn’t what you do after thinking. Writing is thinking.'],
    applications: ['Spend 5 minutes after each book session writing one permanent note in your own words.'],
    highlights: ['The only thing that matters is whether the new note can be linked to a context.'],
    flashcards: [{ front: 'What is a permanent note?', back: 'An idea written in your own words, atomic in scope, linked into your knowledge base.' }],
  },
  {
    title: 'Man’s Search for Meaning',
    authors: ['Viktor E. Frankl'],
    publishedYear: 1946,
    pageCount: 200,
    isbn: '080701429X',
    coverUrl: 'https://covers.openlibrary.org/b/isbn/080701429X-L.jpg',
    description:
      'A psychiatrist’s account of survival in Nazi concentration camps, and the meaning-centred therapy he developed afterward.',
    genres: ['Psychology', 'Memoir', 'Philosophy'],
    status: 'finished',
    rating: 5,
    blink: [
      {
        heading: 'The last freedom',
        body: 'Everything can be taken from a person but one thing: the freedom to choose one’s attitude in any given set of circumstances.',
      },
      {
        heading: 'Meaning, three ways',
        body: 'Through work, love, and the courage we summon in unavoidable suffering.',
      },
    ],
    insights: ['He who has a why to live for can bear almost any how.'],
    applications: ['When suffering is unavoidable, ask: what is this trying to teach me?'],
    highlights: ['Between stimulus and response there is a space. In that space is our power to choose our response.'],
    flashcards: [{ front: 'What are the three sources of meaning according to Frankl?', back: 'Work, love, and the attitude we take toward unavoidable suffering.' }],
  },
];

async function upsertGenre(name: string): Promise<string> {
  const row = await prisma.genre.upsert({
    where: { name },
    create: { name },
    update: {},
  });
  return row.id;
}

async function main() {
  console.log('🌱 Seeding Distill…');

  // Wipe synthetic data only — keep settings.
  await prisma.bookGenre.deleteMany();
  await prisma.book.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.readingEvent.deleteMany();
  await prisma.apiUsageLog.deleteMany({ where: { demoMode: true } });

  // Fixtures dir for demo-mode AI responses.
  const fixturesDir = path.join(process.cwd(), 'lib', 'demo', 'fixtures');
  if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true });

  for (const b of BOOKS) {
    const genreIds = await Promise.all(b.genres.map(upsertGenre));
    const book = await prisma.book.create({
      data: {
        title: b.title,
        subtitle: b.subtitle ?? null,
        authors: JSON.stringify(b.authors),
        coverUrl: b.coverUrl ?? null,
        description: b.description,
        publishedYear: b.publishedYear,
        pageCount: b.pageCount ?? null,
        isbn: b.isbn ?? null,
        openLibraryId: b.openLibraryId ?? null,
        status: b.status,
        rating: b.rating ?? null,
        sourceType: 'metadata-only',
        startedAt: b.status === 'reading' || b.status === 'finished' ? new Date() : null,
        finishedAt: b.status === 'finished' ? new Date() : null,
        genres: {
          create: genreIds.map((id) => ({ genreId: id })),
        },
      },
    });

    // Write the AI fixture file — Phase 2's demo mode will read these
    // instead of calling Claude.
    writeFileSync(
      path.join(fixturesDir, `${book.id}.json`),
      JSON.stringify(
        {
          bookId: book.id,
          title: b.title,
          blink: b.blink,
          insights: b.insights,
          applications: b.applications,
          highlights: b.highlights,
          flashcards: b.flashcards,
        },
        null,
        2,
      ),
    );
  }

  // Achievements scaffold — locked until Phase 6 logic unlocks them.
  const achievements: { slug: string; title: string; description: string; icon: string }[] = [
    { slug: 'first-book', title: 'First Drop', description: 'Add your first book to Distill.', icon: '💧' },
    { slug: 'first-summary', title: 'First Distillation', description: 'Generate your first summary.', icon: '🧪' },
    { slug: 'streak-7', title: '7-Day Streak', description: 'Read on Distill seven days in a row.', icon: '🔥' },
    { slug: 'streak-30', title: '30-Day Streak', description: 'A month of consistency.', icon: '🌋' },
    { slug: 'fifty-finished', title: 'Half a Hundred', description: 'Finish 50 books.', icon: '📚' },
    { slug: 'deep-reader', title: 'Deep Reader', description: 'Spend 10 hours listening or reading in a week.', icon: '🧠' },
    { slug: 'genre-explorer', title: 'Cross-Genre', description: 'Read in five different genres.', icon: '🧭' },
  ];
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      create: a,
      update: {},
    });
  }

  console.log(`✓ Seeded ${BOOKS.length} books and ${achievements.length} achievements.`);
  console.log(`✓ Wrote demo fixtures to lib/demo/fixtures/`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
