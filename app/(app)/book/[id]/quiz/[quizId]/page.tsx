import { notFound } from 'next/navigation';
import { getQuiz } from '@/features/quiz/queries';
import { QuizRunner } from '@/features/quiz/quiz-runner';

export const dynamic = 'force-dynamic';

export default async function QuizPage({
  params,
}: {
  params: { id: string; quizId: string };
}) {
  const quiz = await getQuiz(params.quizId);
  if (!quiz || quiz.bookId !== params.id) notFound();
  return <QuizRunner bookId={params.id} quiz={quiz} />;
}
