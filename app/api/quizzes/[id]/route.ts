import { NextResponse } from 'next/server';
import { getQuiz, listQuizzesForBook } from '@/features/quiz/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // `id` is either a quiz id or "by-book/<bookId>" — keep the URL simple.
  if (params.id.startsWith('by-book:')) {
    const bookId = params.id.slice('by-book:'.length);
    const quizzes = await listQuizzesForBook(bookId);
    return NextResponse.json({
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        questionCount: q._count.questions,
        createdAt: q.createdAt.toISOString(),
      })),
    });
  }
  const quiz = await getQuiz(params.id);
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ quiz });
}
