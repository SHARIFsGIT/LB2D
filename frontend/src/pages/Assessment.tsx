import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExamSecurity } from '../hooks/useExamSecurity';
import ExamSecurityWarning from '../components/ExamSecurityWarning';
import { useNotification } from '../hooks/useNotification';
import ConfirmModal from '../components/common/ConfirmModal';

interface Question {
  _id?: string;
  id?: string;
  questionText: string;
  text?: string; // for backward compatibility
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

const Assessment: React.FC = () => {
  const { quizId } = useParams<{ quizId?: string }>();
  const { showSuccess, showError, showWarning } = useNotification();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [testComplete, setTestComplete] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [timeTrackingStarted, setTimeTrackingStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [certificationLevel, setCertificationLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testId, setTestId] = useState<string>('');
  const [violations, setViolations] = useState<string[]>([]);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string>('');
  const [quizResults, setQuizResults] = useState<any>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [completedAttemptData, setCompletedAttemptData] = useState<any>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const navigate = useNavigate();
  
  // Initialize exam security
  const { isSafeExamBrowser, requestFullscreen, exitFullscreen } = useExamSecurity(
    !testComplete, // Only active during test
    {
      preventRightClick: true,
      preventCopy: true,
      preventPrint: true,
      preventDevTools: true,
      preventTabSwitch: true,
      onViolation: (type: string) => {
        setViolations(prev => [...prev, type]);
        setShowSecurityWarning(true);
      }
    }
  );
  
  // Handle exam termination due to violations
  useEffect(() => {
    if (violations.length >= 3 && !testComplete) {
      showError(
        'Exam terminated due to multiple security violations. Redirecting to dashboard...',
        'Security Violation',
        {
          duration: 8000,
          actions: [
            {
              label: 'Go to Dashboard',
              onClick: () => navigate('/dashboard')
            }
          ]
        }
      );
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  }, [violations, testComplete, navigate, showError]);
  
  // Disabled fullscreen - removed automatic fullscreen activation

  // Handle previous question
  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      // Save the current answer if one is selected
      if (selectedAnswer !== null && questions.length > 0) {
        const questionId = questions[currentQuestionIndex]._id || questions[currentQuestionIndex].id || currentQuestionIndex.toString();
        const updatedAnswers = { 
          ...answers,
          [questionId]: selectedAnswer 
        };
        setAnswers(updatedAnswers);
      }
      
      // Move to previous question
      setCurrentQuestionIndex(prev => prev - 1);
      
      // Load the previous answer if it exists
      const previousQuestion = questions[currentQuestionIndex - 1];
      const previousQuestionId = previousQuestion._id || previousQuestion.id || (currentQuestionIndex - 1).toString();
      const previousAnswer = answers[previousQuestionId];
      setSelectedAnswer(previousAnswer !== undefined ? previousAnswer : null);
      
      // Reset timer
      setTimeLeft(30);
    }
  }, [currentQuestionIndex, selectedAnswer, questions, answers]);

  // Handle quit test
  const handleQuitTest = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const confirmQuitTest = useCallback(() => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      exitFullscreen();
    }

    // Navigate to dashboard
    navigate('/dashboard');
  }, [exitFullscreen, navigate]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    if (selectedAnswer !== null && questions.length > 0) {
      // Save the current answer
      const questionId = questions[currentQuestionIndex]._id || questions[currentQuestionIndex].id || currentQuestionIndex.toString();
      const updatedAnswers = { 
        ...answers,
        [questionId]: selectedAnswer 
      };
      setAnswers(updatedAnswers);

      if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(30);
      } else {
        const answersArray = Object.entries(updatedAnswers).map(([questionId, answer]) => ({
          questionId,
          answer
        }));
        
        const token = sessionStorage.getItem('accessToken');
        
        if (quizId) {
          // Handle quiz submission
          fetch(`${process.env.REACT_APP_API_URL}/quizzes/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              quizId: quizId,
              answers: answersArray,
              completionTime: totalTimeSpent,
              timeLimit: quiz?.timeLimit
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Use backend-calculated scores
              const { score, percentage, correctAnswers, totalQuestions } = data.data;
              
              setScore(percentage);
              setCertificationLevel('Quiz Completed');
              setQuizResults(data.data); // Store complete results
              setTestComplete(true);
              
              showSuccess(
                `Quiz submitted successfully! You scored ${percentage}% (${correctAnswers}/${totalQuestions} correct).`,
                'Quiz Complete!',
                {
                  duration: 5000,
                  actions: [
                    {
                      label: 'Return to Course',
                      onClick: () => navigate(-1)
                    }
                  ]
                }
              );
            } else {
              showError('Failed to submit quiz. Please try again.', 'Submission Error');
            }
          })
          .catch(error => {
            console.error('Error submitting quiz:', error);
            showError('Failed to submit quiz. Please check your connection and try again.', 'Network Error');
          });
        } else {
          // Handle original assessment submission
          fetch(`${process.env.REACT_APP_API_URL}/tests/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              testId,
              answers: answersArray,
              totalCompletionTime: totalTimeSpent
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setScore(data.data.score);
              setCertificationLevel(data.data.certificationLevel);
              
              if (data.data.proceedToNextStep && currentStep < 3) {
                showSuccess(
                `Great job! You scored ${data.data.score}% and achieved ${data.data.certificationLevel} certification. Proceeding to Step ${currentStep + 1}...`,
                'Step Complete!',
                {
                  duration: 5000,
                  actions: [
                    {
                      label: 'Continue to Next Step',
                      onClick: () => {}
                    }
                  ]
                }
              );
              
              // Reset state for next step
              setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                setCurrentQuestionIndex(0);
                setAnswers({});
                setSelectedAnswer(null);
                setTimeLeft(30);
                setQuestions([]);
                setTestComplete(false);
                setLoading(true);
                setTimeTrackingStarted(false); // Reset time tracking for next step
              }, 2000);
              } else {
                setTestComplete(true);
              }
            }
          })
          .catch(error => {
            console.error('Failed to submit test:', error);
            showError(
              'Failed to submit test. Please try again.',
              'Submission Failed',
              {
                duration: 8000,
                actions: [
                  {
                    label: 'Try Again',
                    onClick: () => handleNextQuestion()
                  },
                  {
                    label: 'Go to Dashboard',
                    onClick: () => navigate('/dashboard'),
                    variant: 'secondary'
                  }
                ]
              }
            );
          });
        }
      }
    }
  }, [selectedAnswer, currentQuestionIndex, questions, answers, testId, currentStep, showSuccess, showError, navigate]);

  // Fetch questions from backend
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) return;
      
      try {
        setLoading(true);
        const token = sessionStorage.getItem('accessToken');
        
        // Fetch quiz details
        const quizResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          const fetchedQuiz = quizData.data || quizData;
          
          // Check if student has already submitted this quiz
          const attemptsResponse = await fetch(`${process.env.REACT_APP_API_URL}/quizzes/my-attempts/${quizId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (attemptsResponse.ok) {
            const attemptsData = await attemptsResponse.json();
            if (attemptsData.success && attemptsData.data.length > 0) {
              const completedAttempt = attemptsData.data.find((attempt: any) =>
                attempt.status === 'submitted' || attempt.status === 'graded'
              );

              if (completedAttempt) {
                // Instead of redirecting, enter review mode
                setReviewMode(true);
                setCompletedAttemptData(completedAttempt);
                setQuiz(fetchedQuiz);
                setQuestions(fetchedQuiz.questions || []);
                setQuizResults({
                  score: completedAttempt.score || 0,
                  percentage: completedAttempt.percentage || 0,
                  correctAnswers: completedAttempt.correctAnswers || 0,
                  totalQuestions: fetchedQuiz.questions?.length || 0
                });

                // Set the user's answers from the completed attempt
                if (completedAttempt.answers) {
                  const answersMap: { [key: string]: number } = {};
                  completedAttempt.answers.forEach((answer: any, index: number) => {
                    answersMap[index.toString()] = answer.answer;
                  });
                  setAnswers(answersMap);
                }

                setTestComplete(true); // Show results view
                setLoading(false);

                return;
              }
            }
          }
          
          setQuiz(fetchedQuiz);
          setQuestions(fetchedQuiz.questions || []);
          setTimeLeft(fetchedQuiz.timeLimit ? fetchedQuiz.timeLimit * 60 : 30 * 60); // Convert minutes to seconds
          setTestId(fetchedQuiz._id);
          setLoading(false);
          return;
        } else {
          throw new Error('Failed to fetch quiz');
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        showError('Failed to load quiz. Please try again.', 'Error');
        setLoading(false);
        navigate('/dashboard');
        return;
      }
    };

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem('accessToken');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/tests/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ step: currentStep })
        });

        const data = await response.json();
        if (data.success) {
          setQuestions(data.data.questions);
          setTestId(data.data.testId);
          setTimeLeft(30);
        } else {
          console.error('Failed to fetch questions:', data.message);
          showError(
            'Failed to load questions. Please try again.',
            'Loading Failed',
            {
              duration: 8000,
              actions: [
                {
                  label: 'Retry',
                  onClick: () => window.location.reload()
                },
                {
                  label: 'Go to Dashboard',
                  onClick: () => navigate('/dashboard'),
                  variant: 'secondary'
                }
              ]
            }
          );
        }
      } catch (error) {
        console.error('Failed to fetch questions:', error);
        showError(
          'Failed to load questions. Please check your connection.',
          'Connection Error',
          {
            duration: 10000,
            actions: [
              {
                label: 'Retry',
                onClick: () => window.location.reload()
              },
              {
                label: 'Go to Dashboard',
                onClick: () => navigate('/dashboard'),
                variant: 'secondary'
              }
            ]
          }
        );
      } finally {
        setLoading(false);
      }
    };

    if (!testComplete && (loading || questions.length === 0) && !alreadyCompleted) {
      if (quizId) {
        fetchQuizData();
      } else {
        fetchQuestions();
      }
    }
  }, [currentStep, testComplete, loading, questions.length, showError, navigate, quizId, alreadyCompleted]);

  // Start time tracking when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !loading && !testComplete && !timeTrackingStarted) {
      setTimeTrackingStarted(true);
    }
  }, [questions.length, loading, testComplete, timeTrackingStarted]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !testComplete && !loading && timeTrackingStarted) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
        setTotalTimeSpent(prev => prev + 1); // Track total time spent
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !testComplete && !loading && questions.length > 0) {
      if (selectedAnswer === null) {
        setSelectedAnswer(0);
      }
      handleNextQuestion();
    }
  }, [timeLeft, testComplete, loading, questions.length, selectedAnswer, handleNextQuestion, timeTrackingStarted]);

  // Format time display
  const formatTimeSpent = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  };

  // Load existing answer when question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      const currentQuestionId = currentQuestion._id || currentQuestion.id || currentQuestionIndex.toString();
      const existingAnswer = answers[currentQuestionId];
      setSelectedAnswer(existingAnswer !== undefined ? existingAnswer : null);
    }
  }, [currentQuestionIndex, questions, answers]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Results screen
  if (testComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center">
            {reviewMode ? 'Quiz Review' : 'Assessment Complete!'}
          </h2>
          
          {!reviewMode && (
            <div className={`mb-4 sm:mb-6 p-4 sm:p-6 rounded-lg sm:rounded-xl text-center ${
              score >= 75 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' :
              score >= 50 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200' :
              score >= 25 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200' :
              'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
            }`}>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{score}%</p>
              <p className="text-base sm:text-xl md:text-2xl font-semibold text-gray-700">
                Certification Level: <span className="text-indigo-600">{certificationLevel}</span>
              </p>
            </div>
          )}

          {!reviewMode && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg sm:rounded-xl">
              <h3 className="text-sm sm:text-base font-semibold mb-2 text-gray-700">{quizId ? 'Quiz Summary:' : 'Assessment Summary:'}</h3>
              <ul className="text-xs sm:text-sm space-y-1 text-gray-600">
                <li>Total Questions Attempted: {Object.keys(answers).length}</li>
                {!quizId && <li>Final Step Reached: Step {currentStep}</li>}
                <li>Time Taken: {formatTimeSpent(totalTimeSpent)}</li>
                {quizId && quiz && <li>{quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1)} Completed</li>}
              </ul>
            </div>
          )}

          {/* Quiz Results with Correct Answers */}
          {quizId && quizResults && quiz && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
              <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-blue-800">Quiz Review</h3>
              <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {quiz.questions.map((question: any, index: number) => {
                  const userAnswer = answers[index.toString()];
                  const correctAnswerIndex = question.options?.indexOf(question.correctAnswer) ?? -1;
                  const isCorrect = userAnswer === correctAnswerIndex;

                  return (
                    <div key={index} className={`p-3 sm:p-4 rounded-lg border-2 ${
                      isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h4 className="text-sm sm:text-base font-medium text-gray-900">Question {index + 1}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-700 mb-3">{question.questionText}</p>

                      <div className="space-y-2">
                        {question.options?.map((option: string, optIndex: number) => (
                          <div key={optIndex} className={`p-2 rounded text-xs sm:text-sm ${
                            optIndex === correctAnswerIndex && optIndex === userAnswer
                              ? 'bg-green-200 text-green-900 font-medium' // Correct answer selected
                            : optIndex === correctAnswerIndex
                              ? 'bg-green-100 text-green-800 font-medium' // Correct answer not selected
                            : optIndex === userAnswer
                              ? 'bg-red-200 text-red-900' // Wrong answer selected
                              : 'bg-gray-100 text-gray-700' // Not selected
                          }`}>
                            <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                            {option}
                            {optIndex === correctAnswerIndex && (
                              <span className="ml-2 text-green-600 font-medium hidden sm:inline">← Correct Answer</span>
                            )}
                            {optIndex === userAnswer && optIndex !== correctAnswerIndex && (
                              <span className="ml-2 text-red-600 font-medium hidden sm:inline">← Your Answer</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg border border-blue-400 text-sm sm:text-base min-h-[44px]"
            >
              {reviewMode ? 'Back to Course' : 'Return to Course'}
            </button>
            {!reviewMode && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg border border-emerald-400 text-sm sm:text-base min-h-[44px]"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check if we have questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl">
          <p className="text-center text-sm sm:text-base text-gray-600">No questions available</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Assessment screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 sm:p-6 md:p-8">
      {showSecurityWarning && (
        <ExamSecurityWarning
          violations={violations}
          onAcknowledge={() => setShowSecurityWarning(false)}
          maxViolations={3}
          onMaxViolationsExceeded={() => {
            setTestComplete(true);
            navigate('/dashboard');
          }}
        />
      )}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {quizId ? quiz?.title || 'Quiz' : `Step ${currentStep} Assessment`}
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium mt-1">
                {quizId ?
                  `${quiz?.type ? quiz.type.charAt(0).toUpperCase() + quiz.type.slice(1) : 'Quiz'} • ${questions.length} Questions` :
                  `Level: ${currentQuestion.level || 'N/A'}`
                }
              </p>
            </div>
            <div className={`text-base sm:text-lg md:text-xl font-bold px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-lg sm:rounded-xl flex-shrink-0 ${
              timeLeft <= 10
                ? 'bg-red-50 text-red-600 animate-pulse border-2 border-red-200'
                : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200'
            }`}>
              Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
              <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="font-medium">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-6 text-gray-800 leading-relaxed">
              {currentQuestion.questionText || currentQuestion.text}
            </h3>

            <div className="space-y-2 sm:space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  className={`p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-200 min-h-[44px] flex items-center ${
                    selectedAnswer === index
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center w-full">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-3 sm:mr-4 flex items-center justify-center transition-all flex-shrink-0 ${
                      selectedAnswer === index
                        ? 'border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {selectedAnswer === index && (
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm sm:text-base text-gray-700 ${selectedAnswer === index ? 'font-semibold text-gray-900' : ''}`}>
                      {option}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:pt-6 border-t border-gray-200">
            {!quizId && (
              <div className="text-xs sm:text-sm text-gray-600">
                <p className="font-medium"><strong>Competency:</strong> {currentQuestion.competency}</p>
                <p className="font-medium"><strong>Step:</strong> {currentStep} of 3</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <button
                onClick={handleQuitTest}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg border border-red-400 text-sm sm:text-base min-h-[44px] order-3 sm:order-1"
              >
                Quit Test
              </button>

              <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg text-sm sm:text-base min-h-[44px] ${
                    currentQuestionIndex === 0
                      ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                      : 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg border border-orange-400'
                  }`}
                >
                  <span className="hidden sm:inline">← Previous</span>
                  <span className="sm:hidden">← Prev</span>
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswer === null}
                  className={`flex-1 sm:flex-initial px-4 sm:px-8 py-3 rounded-lg sm:rounded-xl font-bold shadow-lg text-sm sm:text-base min-h-[44px] ${
                    selectedAnswer === null
                      ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg border border-green-400'
                  }`}
                >
                  {currentQuestionIndex < questions.length - 1
                    ? <><span className="hidden sm:inline">Next →</span><span className="sm:hidden">Next</span></>
                    : quizId ? <><span className="hidden sm:inline">Submit Quiz</span><span className="sm:hidden">Submit</span></> : <><span className="hidden sm:inline">{`Complete Step ${currentStep}`}</span><span className="sm:hidden">Complete</span></>}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              {quizId ? (
                <>
                  <strong>Instructions:</strong> Select one answer and click Next to proceed through the quiz.
                  {quiz?.timeLimit && ` You have ${quiz.timeLimit} minutes to complete this ${quiz.type || 'quiz'}.`}
                  <br />
                  <strong>Note:</strong> Make sure to submit your quiz before the time runs out. You can navigate between questions using Previous and Next buttons.
                </>
              ) : (
                <>
                  <strong>Instructions:</strong> Select one answer and click Next.
                  Each question has a 30-second timer.
                  <br />
                  <strong>Scoring:</strong> +1 point for correct answer, -0.5 points for wrong or unanswered questions.
                  {currentStep === 1 && ' Score below 25% means no retake allowed.'}
                  {currentStep === 2 && ' Score 75% or higher to proceed to Step 3.'}
                  {currentStep === 3 && ' This is your final step!'}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quit Confirmation Modal */}
      <ConfirmModal
        isOpen={showQuitConfirm}
        onClose={() => setShowQuitConfirm(false)}
        onConfirm={confirmQuitTest}
        title="Quit Test"
        message="Are you sure you want to quit this test? Your progress will be lost."
        confirmText="Quit Test"
        cancelText="Continue Test"
        type="danger"
      />
    </div>
  );
};

export default Assessment;