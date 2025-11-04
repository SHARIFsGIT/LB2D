'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api-client';
import { LoadingPage } from '@/components/ui/loading-spinner';
import Button from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (params.id) {
      loadQuiz();
    }
  }, [params.id]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const loadQuiz = async () => {
    try {
      const response = await api.quizzes.getById(params.id as string);
      const data = response.data?.data || response.data;

      setQuiz(data.quiz);

      if (!data.canAttempt) {
        toast.error('Maximum attempts reached');
        router.back();
        return;
      }

      // Start timer if quiz has duration
      if (data.quiz.duration) {
        setTimeLeft(data.quiz.duration * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
      toast.error('Quiz not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    // Check all questions answered
    const unanswered = quiz.questions.filter((q: any) => !answers[q.id]);
    if (unanswered.length > 0 && timeLeft !== 0) {
      if (!confirm(`${unanswered.length} questions unanswered. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await api.quizzes.submit(quiz.id, answers);
      const data = response.data?.data || response.data;

      toast.success(data.message);

      // Redirect to results
      router.push(`/quiz/${quiz.id}/results/${data.attempt.id}`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit quiz';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading quiz..." />;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Quiz Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-gray-600 mt-2">{quiz.description}</p>
              )}
            </div>
            {timeLeft !== null && (
              <div className="text-center">
                <p className="text-sm text-gray-500">Time Remaining</p>
                <p className={`text-3xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span>📝 {quiz.questions.length} questions</span>
            {quiz.duration && <span>⏱️ {quiz.duration} minutes</span>}
            <span>✅ Pass: {quiz.passingScore}%</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {quiz.questions.map((question: any, index: number) => (
            <div key={question.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {question.question}
                  </h3>

                  {/* Multiple Choice */}
                  {question.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-3">
                      {question.options.map((option: string, optionIndex: number) => (
                        <label
                          key={optionIndex}
                          className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {question.type === 'TRUE_FALSE' && (
                    <div className="space-y-3">
                      {['True', 'False'].map((option) => (
                        <label
                          key={option}
                          className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Short Answer */}
                  {question.type === 'SHORT_ANSWER' && (
                    <input
                      type="text"
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Type your answer..."
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {Object.keys(answers).length} of {quiz.questions.length} questions answered
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
