import { prisma } from '@/lib/db';

export type QuizQuestionForUI = {
  id: string;
  prompt: string;
  kind: string;
  choices: { text: string; correct: boolean }[];
  explanation: string | null;
  position: number;
};

export async function getQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { position: 'asc' } } },
  });
  if (!quiz) return null;
  const questions: QuizQuestionForUI[] = quiz.questions.map((q) => {
    let choices: { text: string; correct: boolean }[] = [];
    try {
      const parsed = JSON.parse(q.payload) as {
        choices?: { text: string; correct: boolean }[];
      };
      choices = parsed.choices ?? [];
    } catch {
      /* malformed quiz payload — surface as empty choices */
    }
    return {
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      choices,
      explanation: q.explanation,
      position: q.position,
    };
  });
  return { id: quiz.id, bookId: quiz.bookId, title: quiz.title, questions };
}

export async function listQuizzesForBook(bookId: string) {
  return prisma.quiz.findMany({
    where: { bookId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  });
}
