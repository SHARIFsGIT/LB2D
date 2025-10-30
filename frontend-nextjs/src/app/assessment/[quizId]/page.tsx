'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useNotification } from '@/hooks/useNotification';

interface Question {
  _id?: string;
  id?: string;
  questionText: string;
  text?: string;
  options: string[];
  correctAnswer: number;
  points: number;
  questionType: string;
  competency?: string;
  level?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'practice';
  questions: Question[];
  timeLimit?: number;
  attemptLimit: number;
  totalPoints: number;
  courseId: string;
}

interface QuizResults {
  score: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  answers: { questionId: string; answer: number; isCorrect: boolean }[];
}

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const { token } = useSelector((state: RootState) => state.auth);
  const { showSuccess, showError, showWarning } = useNotification();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [testComplete, setTestComplete] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Timer effect
  useEffect(() => {
    if (!testComplete && quiz) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextQuestion();
            return 30;
          }
          return prev - 1;
        });
        setTotalTimeSpent((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [testComplete, currentQuestionIndex, quiz]);

  // Fetch quiz data
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (quizId) {
      fetchQuizData();
    }
  }, [quizId, token]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/${quizId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setQuiz(data.data);
      } else {
        showError('Failed to load quiz', 'Error');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      showError('Failed to load quiz', 'Error');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      if (selectedAnswer !== null && quiz) {
        const questionId = quiz.questions[currentQuestionIndex]._id || quiz.questions[currentQuestionIndex].id || currentQuestionIndex.toString();
        setAnswers({ ...answers, [questionId]: selectedAnswer });
      }

      setCurrentQuestionIndex((prev) => prev - 1);

      const previousQuestion = quiz!.questions[currentQuestionIndex - 1];
      const previousQuestionId = previousQuestion._id || previousQuestion.id || (currentQuestionIndex - 1).toString();
      const previousAnswer = answers[previousQuestionId];
      setSelectedAnswer(previousAnswer !== undefined ? previousAnswer : null);
      setTimeLeft(30);
    }
  }, [currentQuestionIndex, selectedAnswer, quiz, answers]);

  const handleNextQuestion = useCallback(() => {
    if (selectedAnswer !== null && quiz) {
      const questionId = quiz.questions[currentQuestionIndex]._id || quiz.questions[currentQuestionIndex].id || currentQuestionIndex.toString();
      const updatedAnswers = { ...answers, [questionId]: selectedAnswer };
      setAnswers(updatedAnswers);

      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        // Submit quiz
        submitQuiz(updatedAnswers);
      }
    }
  }, [selectedAnswer, currentQuestionIndex, quiz, answers]);

  const submitQuiz = async (finalAnswers: { [key: string]: number }) => {
    try {
      const answersArray = Object.entries(finalAnswers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quizzes/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizId: quizId,
          answers: answersArray,
          completionTime: totalTimeSpent,
          timeLimit: quiz?.timeLimit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const { score, percentage, correctAnswers, totalQuestions } = data.data;
        setQuizResults(data.data);
        setTestComplete(true);

        showSuccess(`Quiz submitted successfully! You scored ${percentage}% (${correctAnswers}/${totalQuestions} correct).`, 'Quiz Complete!', {
          duration: 5000,
        });
      } else {
        showError('Failed to submit quiz. Please try again.', 'Submission Error');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      showError('Failed to submit quiz. Please check your connection and try again.', 'Network Error');
    }
  };

  const handleQuitTest = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuitTest = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (testComplete && quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Quiz Completed!</h1>
            <p className="text-green-100 text-lg">{quiz?.title}</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">{quizResults.percentage}%</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-emerald-600 mb-2">
                  {quizResults.correctAnswers}/{quizResults.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/my-courses')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300"
              >
                View Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quit Quiz?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to quit? Your progress will not be saved.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmQuitTest}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-semibold transition-all"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </p>
            </div>
            <button
              onClick={handleQuitTest}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
            >
              Quit
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Timer */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex justify-between items-center">
            <span className="font-semibold">Time Remaining</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold">{timeLeft}s</span>
            </div>
          </div>

          {/* Question */}
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-6">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm flex-shrink-0">
                  {currentQuestionIndex + 1}
                </span>
                <h2 className="text-xl font-semibold text-gray-900">{currentQuestion.questionText || currentQuestion.text}</h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedAnswer === index
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAnswer === index ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`}
                      >
                        {selectedAnswer === index && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 py-3 px-6 rounded-xl font-semibold transition-all"
              >
                Previous
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
              >
                {currentQuestionIndex === quiz.questions.length - 1 ? 'Submit' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
