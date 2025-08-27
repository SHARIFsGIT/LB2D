import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamSecurity } from '../hooks/useExamSecurity';
import ExamSecurityWarning from '../components/ExamSecurityWarning';
import { useNotification } from '../hooks/useNotification';

interface Question {
  id: string;
  text: string;
  options: string[];
  competency: string;
  level: string;
}

const Assessment: React.FC = () => {
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
        const updatedAnswers = { 
          ...answers,
          [questions[currentQuestionIndex].id]: selectedAnswer 
        };
        setAnswers(updatedAnswers);
      }
      
      // Move to previous question
      setCurrentQuestionIndex(prev => prev - 1);
      
      // Load the previous answer if it exists
      const previousQuestion = questions[currentQuestionIndex - 1];
      const previousAnswer = answers[previousQuestion.id];
      setSelectedAnswer(previousAnswer !== undefined ? previousAnswer : null);
      
      // Reset timer
      setTimeLeft(30);
    }
  }, [currentQuestionIndex, selectedAnswer, questions, answers]);

  // Handle quit test
  const handleQuitTest = useCallback(() => {
    if (window.confirm('Are you sure you want to quit this test? Your progress will be lost.')) {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        exitFullscreen();
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    }
  }, [exitFullscreen, navigate]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    if (selectedAnswer !== null && questions.length > 0) {
      // Save the current answer
      const updatedAnswers = { 
        ...answers,
        [questions[currentQuestionIndex].id]: selectedAnswer 
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
        
        console.log('Submitting final test with answers:', answersArray);
        
        const token = sessionStorage.getItem('accessToken');
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
  }, [selectedAnswer, currentQuestionIndex, questions, answers, testId, currentStep, showSuccess, showError, navigate]);

  // Fetch questions from backend
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log(`Fetching questions for Step ${currentStep}...`);
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
        console.log('Questions fetched:', data);
        
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

    if (!testComplete && (loading || questions.length === 0)) {
      fetchQuestions();
    }
  }, [currentStep, testComplete, loading, questions.length, showError, navigate]);

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

  // Download certificate
  const downloadCertificate = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tests/certificate/${testId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificationLevel}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      showError(
        'Failed to download certificate. Please try again.',
        'Download Failed',
        {
          duration: 6000,
          actions: [
            {
              label: 'Try Again',
              onClick: () => downloadCertificate()
            }
          ]
        }
      );
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Results screen
  if (testComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center">
            Assessment Complete!
          </h2>
          
          <div className={`mb-6 p-6 rounded-xl text-center ${
            score >= 75 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 
            score >= 50 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200' : 
            score >= 25 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200' : 
            'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
          }`}>
            <p className="text-5xl font-bold mb-2">{score}%</p>
            <p className="text-2xl font-semibold text-gray-700">
              Certification Level: <span className="text-indigo-600">{certificationLevel}</span>
            </p>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl">
            <h3 className="font-semibold mb-2 text-gray-700">Assessment Summary:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>✅ Total Questions Attempted: {Object.keys(answers).length}</li>
              <li>✅ Final Step Reached: Step {currentStep}</li>
              <li>✅ Time Taken: {formatTimeSpent(totalTimeSpent)}</li>
            </ul>
          </div>

          {!certificationLevel.includes('Failed') && (
            <button 
              onClick={downloadCertificate}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg mb-4 border border-blue-400"
            >
              Download Certificate (PDF)
            </button>
          )}
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg border border-emerald-400"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if we have questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <p className="text-center text-gray-600">No questions available</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Assessment screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8">
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Step {currentStep} Assessment
              </h2>
              <p className="text-gray-600 font-medium mt-1">Level: {currentQuestion.level}</p>
            </div>
            <div className={`text-xl font-bold px-5 py-3 rounded-xl ${
              timeLeft <= 10 
                ? 'bg-red-50 text-red-600 animate-pulse border-2 border-red-200' 
                : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200'
            }`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="font-medium">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 leading-relaxed">
              {currentQuestion.text}
            </h3>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedAnswer === index
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                      selectedAnswer === index
                        ? 'border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {selectedAnswer === index && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`text-gray-700 ${selectedAnswer === index ? 'font-semibold text-gray-900' : ''}`}>
                      {option}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium"><strong>Competency:</strong> {currentQuestion.competency}</p>
                <p className="font-medium"><strong>Step:</strong> {currentStep} of 3</p>
              </div>
              
              <button
                onClick={handleQuitTest}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg border border-red-400"
              >
                Quit Test
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`px-6 py-3 rounded-xl font-bold shadow-lg ${
                  currentQuestionIndex === 0
                    ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                    : 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg border border-orange-400'
                }`}
              >
                ← Previous
              </button>
              
              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className={`px-8 py-3 rounded-xl font-bold shadow-lg ${
                  selectedAnswer === null
                    ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-400 cursor-not-allowed shadow-none border border-gray-200'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg border border-green-400'
                }`}
              >
                {currentQuestionIndex < questions.length - 1 
                  ? 'Next →' 
                  : `Complete Step ${currentStep}`}
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Select one answer and click Next. 
              Each question has a 30-second timer.
              <br />
              <strong>Scoring:</strong> +1 point for correct answer, -0.5 points for wrong or unanswered questions.
              {currentStep === 1 && ' Score below 25% means no retake allowed.'}
              {currentStep === 2 && ' Score 75% or higher to proceed to Step 3.'}
              {currentStep === 3 && ' This is your final step!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessment;