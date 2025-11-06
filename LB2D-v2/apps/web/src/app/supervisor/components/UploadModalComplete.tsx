'use client';

import React, { useState } from 'react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { Badge } from '@/components/ui/badge';

// Types
interface Course {
  _id: string;
  id?: string;
  title: string;
  level: string;
}

interface Quiz {
  _id: string;
  title: string;
  type: 'quiz' | 'exam' | 'practice';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  questions?: any[];
  totalPoints?: number;
  timeLimit?: number;
  attemptsAllowed?: number;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface Resource {
  _id: string;
  title: string;
  type: 'document' | 'audio';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  fileName: string;
  fileSize: number;
  downloadCount?: number;
  sequenceNumber: number;
  category: string;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  sequenceNumber: number;
  duration?: number;
  viewCount?: number;
  deletionStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  quizzes: Quiz[];
  resources: Resource[];
  videos: Video[];
  onCreateQuiz: (quiz: any) => Promise<void>;
  onSubmitQuiz: (quizId: string) => Promise<void>;
  onResubmitQuiz: (quizId: string) => Promise<void>;
  onDeleteQuiz: (quizId: string, title: string) => void;
  onViewQuiz: (quiz: any) => void;
  onEditQuiz: (quiz: any) => void;
  onUploadResource: (formData: FormData) => Promise<void>;
  onSubmitResource: (resourceId: string) => Promise<void>;
  onResubmitResource: (resourceId: string) => Promise<void>;
  onDeleteResource: (resourceId: string, title: string) => void;
  onUploadVideo: (formData: FormData) => Promise<void>;
  onDeleteVideo: (videoId: string, title: string) => void;
  getNextSequenceNumber: (items: any[]) => number;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, any> = {
    draft: { variant: 'secondary', label: 'Draft' },
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

export default function UploadModalComplete(props: Props) {
  const {
    isOpen,
    onClose,
    course,
    quizzes,
    resources,
    videos,
    onCreateQuiz,
    onSubmitQuiz,
    onResubmitQuiz,
    onDeleteQuiz,
    onViewQuiz,
    onEditQuiz,
    onUploadResource,
    onSubmitResource,
    onResubmitResource,
    onDeleteResource,
    onUploadVideo,
    onDeleteVideo,
    getNextSequenceNumber,
  } = props;

  const [uploadTab, setUploadTab] = useState<'quizzes' | 'resources' | 'videos'>('quizzes');
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  // Quiz form state
  const [quizForm, setQuizForm] = useState({
    title: '',
    type: 'quiz' as 'quiz' | 'exam' | 'practice',
    timeLimit: 30,
    attemptsAllowed: 3,
    sequenceNumber: 1,
    questions: [] as QuizQuestion[],
  });

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1,
  });

  // Resource form state
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    type: 'document' as 'document' | 'audio',
    category: 'lesson' as 'lesson' | 'homework' | 'reference' | 'exercise',
    sequenceNumber: 1,
  });

  // Video form state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    sequenceNumber: 1,
    duration: 0,
    videoUrl: '',
  });

  const resetQuizForm = () => {
    setQuizForm({
      title: '',
      type: 'quiz',
      timeLimit: 30,
      attemptsAllowed: 3,
      sequenceNumber: 1,
      questions: [],
    });
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1,
    });
    setEditingQuiz(null);
  };

  const resetResourceForm = () => {
    setResourceFile(null);
    setResourceForm({
      title: '',
      description: '',
      type: 'document',
      category: 'lesson',
      sequenceNumber: 1,
    });
  };

  const resetVideoForm = () => {
    setVideoFile(null);
    setVideoForm({
      title: '',
      description: '',
      sequenceNumber: 1,
      duration: 0,
      videoUrl: '',
    });
  };

  const handleAddQuestion = () => {
    if (currentQuestion.question && currentQuestion.options.every((opt) => opt.trim() !== '')) {
      setQuizForm({
        ...quizForm,
        questions: [
          ...quizForm.questions,
          {
            id: Date.now().toString(),
            ...currentQuestion,
          },
        ],
      });
      setCurrentQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
      });
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((_, i) => i !== index),
    });
  };

  const handleCreateQuiz = async () => {
    if (!quizForm.title || quizForm.questions.length === 0) return;
    await onCreateQuiz(quizForm);
    resetQuizForm();
    setShowQuizForm(false);
  };

  const handleUploadResource = async () => {
    if (!resourceFile || !resourceForm.title || !course) return;

    const formData = new FormData();
    formData.append('file', resourceFile);
    formData.append('title', resourceForm.title);
    formData.append('description', resourceForm.description);
    formData.append('courseId', course._id || course.id || '');
    formData.append('type', resourceForm.type);
    formData.append('category', resourceForm.category);
    formData.append('sequenceNumber', resourceForm.sequenceNumber.toString());

    await onUploadResource(formData);
    resetResourceForm();
    setShowResourceForm(false);
  };

  const handleUploadVideo = async () => {
    if ((!videoFile && !videoForm.videoUrl) || !videoForm.title || !course) return;

    const formData = new FormData();
    if (videoFile) {
      formData.append('file', videoFile);
    } else if (videoForm.videoUrl) {
      formData.append('videoUrl', videoForm.videoUrl);
    }
    formData.append('title', videoForm.title);
    formData.append('description', videoForm.description);
    formData.append('courseId', course._id || course.id || '');
    formData.append('sequenceNumber', videoForm.sequenceNumber.toString());
    if (videoForm.duration) {
      formData.append('duration', videoForm.duration.toString());
    }

    await onUploadVideo(formData);
    resetVideoForm();
    setShowVideoForm(false);
  };

  const handleViewQuiz = (quiz: any) => {
    setEditingQuiz({ ...quiz, isViewOnly: true });
    setQuizForm({
      title: quiz.title,
      type: quiz.type,
      timeLimit: quiz.timeLimit,
      attemptsAllowed: quiz.attemptsAllowed || 3,
      sequenceNumber: quiz.sequenceNumber,
      questions: quiz.questions || [],
    });
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      type: quiz.type,
      timeLimit: quiz.timeLimit,
      attemptsAllowed: quiz.attemptsAllowed || 3,
      sequenceNumber: quiz.sequenceNumber,
      questions: quiz.questions || [],
    });
    setShowQuizForm(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setShowQuizForm(false);
        setShowResourceForm(false);
        setShowVideoForm(false);
        resetQuizForm();
        resetResourceForm();
        resetVideoForm();
      }}
      title={`Upload Content - ${course?.title || ''}`}
    >
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Tab Navigation */}
        <div className="flex border-b-2 border-gray-200 mb-6 sticky top-0 bg-white z-10 -mx-6 px-6">
          <button
            onClick={() => {
              setUploadTab('quizzes');
              setShowQuizForm(false);
              setShowResourceForm(false);
              setShowVideoForm(false);
            }}
            className={`px-6 py-4 font-bold transition-all ${
              uploadTab === 'quizzes'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📝 Quizzes & Exams
          </button>
          <button
            onClick={() => {
              setUploadTab('resources');
              setShowQuizForm(false);
              setShowResourceForm(false);
              setShowVideoForm(false);
            }}
            className={`px-6 py-4 font-bold transition-all ${
              uploadTab === 'resources'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📄 Documents & Audio
          </button>
          <button
            onClick={() => {
              setUploadTab('videos');
              setShowQuizForm(false);
              setShowResourceForm(false);
              setShowVideoForm(false);
            }}
            className={`px-6 py-4 font-bold transition-all ${
              uploadTab === 'videos'
                ? 'border-b-4 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🎥 Videos
          </button>
        </div>

        {/* QUIZZES TAB */}
        {uploadTab === 'quizzes' && !showQuizForm && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Quizzes & Exams</h3>
              <Button
                onClick={() => {
                  resetQuizForm();
                  setQuizForm({ ...quizForm, sequenceNumber: getNextSequenceNumber(quizzes) });
                  setShowQuizForm(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
              >
                ➕ Create New Quiz
              </Button>
            </div>

            {quizzes.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-600 font-semibold text-lg">No quizzes yet</p>
                <p className="text-gray-500 text-sm mt-2">Create your first quiz to start assessing students!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((quiz) => (
                  <div key={quiz._id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-base mb-2 line-clamp-1">{quiz.title}</h4>
                        <Badge {...getStatusBadge(quiz.status)} />
                      </div>
                      <span className="text-xs bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1 rounded-full ml-2 font-bold">
                        #{quiz.sequenceNumber}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Type:</span>
                        <span className="capitalize font-semibold">{quiz.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Questions:</span>
                        <span className="font-semibold">{quiz.questions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Time:</span>
                        <span className="font-semibold">{quiz.timeLimit} min</span>
                      </div>
                      {quiz.totalPoints && (
                        <div className="flex justify-between">
                          <span className="font-medium">Points:</span>
                          <span className="font-semibold">{quiz.totalPoints}</span>
                        </div>
                      )}
                    </div>

                    {quiz.rejectionReason && (
                      <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="font-bold text-red-900 text-xs mb-1">⚠️ Rejection Reason:</p>
                        <p className="text-red-800 text-xs">{quiz.rejectionReason}</p>
                      </div>
                    )}

                    {quiz.deletionStatus === 'pending' && (
                      <div className="mb-3 p-2 bg-orange-50 border-2 border-orange-300 rounded-lg text-xs text-orange-900 flex items-center font-semibold">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Deletion pending admin approval
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => (quiz.status === 'approved' ? onViewQuiz(quiz) : handleEditQuiz(quiz))}
                        className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold"
                      >
                        {quiz.status === 'approved' ? '👁️ View' : '✏️ Edit'}
                      </Button>

                      {quiz.status === 'draft' && (
                        <Button
                          onClick={() => onSubmitQuiz(quiz._id)}
                          className="flex-1 bg-green-600 text-white hover:bg-green-700 text-sm font-semibold"
                        >
                          📤 Submit
                        </Button>
                      )}

                      {quiz.status === 'rejected' && (
                        <Button
                          onClick={() => onResubmitQuiz(quiz._id)}
                          className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700 text-sm font-semibold"
                        >
                          🔄 Resubmit
                        </Button>
                      )}

                      {quiz.deletionStatus !== 'pending' && (
                        <Button
                          onClick={() => onDeleteQuiz(quiz._id, quiz.title)}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold"
                        >
                          🗑️ Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUIZ FORM (When creating/editing) */}
        {uploadTab === 'quizzes' && showQuizForm && (
          <div>
            <div className="mb-4">
              <Button
                onClick={() => {
                  setShowQuizForm(false);
                  resetQuizForm();
                }}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                ← Back to Quiz List
              </Button>
            </div>

            <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-2xl p-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingQuiz?.isViewOnly ? '👁️ View Quiz' : editingQuiz ? '✏️ Edit Quiz' : '➕ Create New Quiz'}
              </h3>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Quiz Title *"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  disabled={editingQuiz?.isViewOnly}
                  placeholder="e.g., German Grammar Quiz 1"
                  required
                />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type *</label>
                  <select
                    value={quizForm.type}
                    onChange={(e) => setQuizForm({ ...quizForm, type: e.target.value as any })}
                    disabled={editingQuiz?.isViewOnly}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="quiz">📝 Quiz</option>
                    <option value="exam">📋 Exam</option>
                    <option value="practice">🎯 Practice</option>
                  </select>
                </div>

                <Input
                  label="Time Limit (minutes) *"
                  type="number"
                  min="1"
                  value={quizForm.timeLimit}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimit: parseInt(e.target.value) || 30 })}
                  disabled={editingQuiz?.isViewOnly}
                />

                <Input
                  label="Attempts Allowed *"
                  type="number"
                  min="1"
                  max="10"
                  value={quizForm.attemptsAllowed}
                  onChange={(e) => setQuizForm({ ...quizForm, attemptsAllowed: parseInt(e.target.value) || 3 })}
                  disabled={editingQuiz?.isViewOnly}
                />

                <Input
                  label="Sequence Number *"
                  type="number"
                  min="1"
                  value={quizForm.sequenceNumber}
                  onChange={(e) => setQuizForm({ ...quizForm, sequenceNumber: parseInt(e.target.value) || 1 })}
                  disabled={editingQuiz?.isViewOnly}
                />
              </div>

              {/* Question Builder */}
              {!editingQuiz?.isViewOnly && (
                <div className="border-t-2 border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Question
                  </h4>
                  <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-xl space-y-4">
                    <Input
                      label="Question Text *"
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                      placeholder="Enter your question here..."
                    />

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Answer Options *</label>
                      <p className="text-xs text-blue-700 mb-3 font-medium">
                        ⚡ Click the radio button to select the correct answer
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-gray-200">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={currentQuestion.correctAnswer === index}
                              onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                              className="w-5 h-5 text-blue-600 cursor-pointer"
                            />
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...currentQuestion.options];
                                newOptions[index] = e.target.value;
                                setCurrentQuestion({ ...currentQuestion, options: newOptions });
                              }}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Input
                          label="Points *"
                          type="number"
                          min="1"
                          value={currentQuestion.points}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <Button
                        onClick={handleAddQuestion}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 h-[46px] px-6 font-bold"
                      >
                        ➕ Add Question
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Questions List */}
              {quizForm.questions.length > 0 && (
                <div className="border-t-2 border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">
                    📋 Questions ({quizForm.questions.length})
                  </h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {quizForm.questions.map((q, index) => (
                      <div key={q.id || index} className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-bold text-gray-900 flex-1 text-base">
                            Question {index + 1}: {q.question}
                          </h5>
                          {!editingQuiz?.isViewOnly && (
                            <button
                              onClick={() => handleRemoveQuestion(index)}
                              className="text-red-600 hover:text-red-800 font-bold ml-3 hover:bg-red-100 px-3 py-1 rounded-lg transition-all"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg border-2 font-medium ${
                                q.correctAnswer === optIndex
                                  ? 'bg-green-100 border-green-400 text-green-900'
                                  : 'bg-white border-gray-200 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {q.correctAnswer === optIndex && (
                                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                <span>{opt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-blue-800 mt-3 font-bold bg-blue-100 inline-block px-3 py-1 rounded-full">
                          {q.points || 1} {(q.points || 1) === 1 ? 'point' : 'points'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl">
                    <p className="text-lg font-bold">
                      Total Points: {quizForm.questions.reduce((sum, q) => sum + (q.points || 1), 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!editingQuiz?.isViewOnly && (
                <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                  <Button
                    onClick={handleCreateQuiz}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 font-bold text-lg py-4"
                    disabled={!quizForm.title || quizForm.questions.length === 0}
                  >
                    {editingQuiz ? '💾 Update Quiz' : '✅ Create Quiz'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowQuizForm(false);
                      resetQuizForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold text-lg py-4"
                  >
                    ❌ Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {uploadTab === 'resources' && !showResourceForm && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Documents & Audio</h3>
              <Button
                onClick={() => {
                  resetResourceForm();
                  setResourceForm({ ...resourceForm, sequenceNumber: getNextSequenceNumber(resources) });
                  setShowResourceForm(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
              >
                ➕ Upload Resource
              </Button>
            </div>

            {resources.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-purple-50 rounded-2xl border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-600 font-semibold text-lg">No resources yet</p>
                <p className="text-gray-500 text-sm mt-2">Upload documents or audio files for your students!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((resource) => (
                  <div key={resource._id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {resource.type === 'document' ? (
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <h4 className="font-bold text-gray-900 text-base line-clamp-1">{resource.title}</h4>
                        </div>
                        <Badge {...getStatusBadge(resource.status)} />
                      </div>
                      <span className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full ml-2 font-bold">
                        #{resource.sequenceNumber}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-2 mb-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Type:</span>
                        <span className="capitalize font-semibold">{resource.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Category:</span>
                        <span className="capitalize font-semibold">{resource.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Size:</span>
                        <span className="font-semibold">{(resource.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      {resource.downloadCount !== undefined && (
                        <div className="flex justify-between">
                          <span className="font-medium">Downloads:</span>
                          <span className="font-semibold">{resource.downloadCount}</span>
                        </div>
                      )}
                    </div>

                    {resource.rejectionReason && (
                      <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="font-bold text-red-900 text-xs mb-1">⚠️ Rejection Reason:</p>
                        <p className="text-red-800 text-xs">{resource.rejectionReason}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {resource.status === 'draft' && (
                        <Button
                          onClick={() => onSubmitResource(resource._id)}
                          className="flex-1 bg-green-600 text-white hover:bg-green-700 text-sm font-semibold"
                        >
                          📤 Submit
                        </Button>
                      )}

                      {resource.status === 'rejected' && (
                        <Button
                          onClick={() => onResubmitResource(resource._id)}
                          className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700 text-sm font-semibold"
                        >
                          🔄 Resubmit
                        </Button>
                      )}

                      {resource.deletionStatus !== 'pending' && (
                        <Button
                          onClick={() => onDeleteResource(resource._id, resource.title)}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold"
                        >
                          🗑️ Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RESOURCE FORM */}
        {uploadTab === 'resources' && showResourceForm && (
          <div>
            <div className="mb-4">
              <Button
                onClick={() => {
                  setShowResourceForm(false);
                  resetResourceForm();
                }}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                ← Back to Resource List
              </Button>
            </div>

            <div className="bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200 rounded-2xl p-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">📤 Upload New Resource</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Resource Title *"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="e.g., Lesson 1 Vocabulary Sheet"
                  required
                />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type *</label>
                  <select
                    value={resourceForm.type}
                    onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as any })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="document">📄 Document</option>
                    <option value="audio">🎵 Audio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                  <select
                    value={resourceForm.category}
                    onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value as any })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  >
                    <option value="lesson">📚 Lesson</option>
                    <option value="homework">✏️ Homework</option>
                    <option value="reference">📖 Reference</option>
                    <option value="exercise">💪 Exercise</option>
                  </select>
                </div>

                <Input
                  label="Sequence Number *"
                  type="number"
                  min="1"
                  value={resourceForm.sequenceNumber}
                  onChange={(e) => setResourceForm({ ...resourceForm, sequenceNumber: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe this resource..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">File *</label>
                <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-all bg-gradient-to-br from-gray-50 to-blue-50">
                  <div className="space-y-2 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-base text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-lg font-bold text-blue-600 hover:text-blue-700 px-4 py-2 hover:bg-blue-50 transition-all">
                        <span>Choose file</span>
                        <input
                          type="file"
                          onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                          accept={resourceForm.type === 'document' ? '.pdf,.doc,.docx,.ppt,.pptx' : '.mp3,.wav,.m4a'}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-2 py-2">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {resourceForm.type === 'document'
                        ? '📄 PDF, DOC, DOCX, PPT, PPTX (max 50MB)'
                        : '🎵 MP3, WAV, M4A (max 50MB)'}
                    </p>
                  </div>
                </div>
                {resourceFile && (
                  <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{resourceFile.name}</p>
                          <p className="text-xs text-gray-600">{(resourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setResourceFile(null)}
                        className="text-red-600 hover:text-red-800 font-bold hover:bg-red-100 px-3 py-2 rounded-lg transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                <Button
                  onClick={handleUploadResource}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 font-bold text-lg py-4"
                  disabled={!resourceFile || !resourceForm.title}
                >
                  ⬆️ Upload Resource
                </Button>
                <Button
                  onClick={() => {
                    setShowResourceForm(false);
                    resetResourceForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold text-lg py-4"
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* VIDEOS TAB */}
        {uploadTab === 'videos' && !showVideoForm && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Videos</h3>
              <Button
                onClick={() => {
                  resetVideoForm();
                  setVideoForm({ ...videoForm, sequenceNumber: getNextSequenceNumber(videos) });
                  setShowVideoForm(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
              >
                ➕ Upload Video
              </Button>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-red-50 rounded-2xl border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-600 font-semibold text-lg">No videos yet</p>
                <p className="text-gray-500 text-sm mt-2">Upload video lessons for your students!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <div key={video._id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <h4 className="font-bold text-gray-900 text-base line-clamp-1">{video.title}</h4>
                        </div>
                        <Badge {...getStatusBadge(video.status)} />
                      </div>
                      <span className="text-xs bg-gradient-to-r from-red-100 to-pink-100 text-red-800 px-3 py-1 rounded-full ml-2 font-bold">
                        #{video.sequenceNumber}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>

                    {video.rejectionReason && (
                      <div className="mb-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="font-bold text-red-900 text-xs mb-1">⚠️ Rejection Reason:</p>
                        <p className="text-red-800 text-xs">{video.rejectionReason}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {video.status === 'rejected' && (
                        <Button
                          onClick={() => onDeleteVideo(video._id, video.title)}
                          className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700 text-sm font-semibold"
                        >
                          🔄 Resubmit
                        </Button>
                      )}

                      {video.deletionStatus !== 'pending' && (
                        <Button
                          onClick={() => onDeleteVideo(video._id, video.title)}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-semibold"
                        >
                          🗑️ Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIDEO FORM */}
        {uploadTab === 'videos' && showVideoForm && (
          <div>
            <div className="mb-4">
              <Button
                onClick={() => {
                  setShowVideoForm(false);
                  resetVideoForm();
                }}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                ← Back to Video List
              </Button>
            </div>

            <div className="bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-2xl p-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">🎥 Upload New Video</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Video Title *"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="e.g., Introduction to German Greetings"
                  required
                />

                <Input
                  label="Sequence Number *"
                  type="number"
                  min="1"
                  value={videoForm.sequenceNumber}
                  onChange={(e) => setVideoForm({ ...videoForm, sequenceNumber: parseInt(e.target.value) || 1 })}
                />

                <Input
                  label="Duration (seconds)"
                  type="number"
                  min="0"
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm({ ...videoForm, duration: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 300 for 5 minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe what students will learn..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Video File or URL *</label>

                {/* File Upload */}
                <div className="mb-4">
                  <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-all bg-gradient-to-br from-gray-50 to-blue-50">
                    <div className="space-y-2 text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-base text-gray-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-lg font-bold text-blue-600 hover:text-blue-700 px-4 py-2 hover:bg-blue-50 transition-all">
                          <span>Choose video file</span>
                          <input
                            type="file"
                            onChange={(e) => {
                              setVideoFile(e.target.files?.[0] || null);
                              setVideoForm({ ...videoForm, videoUrl: '' });
                            }}
                            accept="video/*"
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-2 py-2">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">🎬 MP4, AVI, MOV (max 500MB)</p>
                    </div>
                  </div>
                  {videoFile && (
                    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{videoFile.name}</p>
                            <p className="text-xs text-gray-600">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setVideoFile(null)}
                          className="text-red-600 hover:text-red-800 font-bold hover:bg-red-100 px-3 py-2 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* OR Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-base">
                    <span className="px-4 bg-white text-gray-600 font-bold">OR</span>
                  </div>
                </div>

                {/* URL Input */}
                <Input
                  label="Video URL (YouTube, Vimeo, etc.)"
                  value={videoForm.videoUrl}
                  onChange={(e) => {
                    setVideoForm({ ...videoForm, videoUrl: e.target.value });
                    setVideoFile(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-2 text-xs text-gray-600 font-medium">
                  💡 You can upload a file OR provide a URL to an external video
                </p>
              </div>

              <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                <Button
                  onClick={handleUploadVideo}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 font-bold text-lg py-4"
                  disabled={(!videoFile && !videoForm.videoUrl) || !videoForm.title}
                >
                  ⬆️ Upload Video
                </Button>
                <Button
                  onClick={() => {
                    setShowVideoForm(false);
                    resetVideoForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold text-lg py-4"
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
