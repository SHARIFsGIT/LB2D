import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Question {
  id: string;
  text: string;
  options: string[];
  competency: string;
  level: string;
}

export interface Answer {
  questionId: string;
  selectedOption: number;
  timeSpent: number;
}

export interface AssessmentState {
  // Test information
  testId: string | null;
  currentStep: number;
  questions: Question[];

  // User progress
  currentQuestionIndex: number;
  answers: Answer[];
  timeRemaining: number;

  // Test status
  isTestActive: boolean;
  isTestCompleted: boolean;

  // Results
  score: number | null;
  certificationLevel: string | null;
  canProceedToNextStep: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const initialState: AssessmentState = {
  testId: null,
  currentStep: 1,
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  timeRemaining: 60,
  isTestActive: false,
  isTestCompleted: false,
  score: null,
  certificationLevel: null,
  canProceedToNextStep: false,
  isLoading: false,
  error: null,
};

const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    startTest: (state, action: PayloadAction<{
      testId: string;
      step: number;
      questions: Question[];
    }>) => {
      state.testId = action.payload.testId;
      state.currentStep = action.payload.step;
      state.questions = action.payload.questions;
      state.currentQuestionIndex = 0;
      state.answers = [];
      state.timeRemaining = 60;
      state.isTestActive = true;
      state.isTestCompleted = false;
      state.score = null;
      state.certificationLevel = null;
      state.canProceedToNextStep = false;
      state.error = null;
    },

    /**
     * Move to next question
     */
    nextQuestion: (state) => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
        state.timeRemaining = 60; // Reset timer for new question
      }
    },

    /**
     * Move to previous question
     */
    previousQuestion: (state) => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex -= 1;
      }
    },

    /**
     * Save answer for current question
     */
    saveAnswer: (state, action: PayloadAction<{
      questionId: string;
      selectedOption: number;
      timeSpent: number;
    }>) => {
      const existingAnswerIndex = state.answers.findIndex(
        a => a.questionId === action.payload.questionId
      );

      if (existingAnswerIndex >= 0) {
        // Update existing answer
        state.answers[existingAnswerIndex] = action.payload;
      } else {
        // Add new answer
        state.answers.push(action.payload);
      }
    },

    /**
     * Update time remaining
     */
    updateTimeRemaining: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },

    /**
     * Submit test and set results
     */
    submitTest: (state, action: PayloadAction<{
      score: number;
      certificationLevel: string;
      canProceedToNextStep: boolean;
    }>) => {
      state.isTestActive = false;
      state.isTestCompleted = true;
      state.score = action.payload.score;
      state.certificationLevel = action.payload.certificationLevel;
      state.canProceedToNextStep = action.payload.canProceedToNextStep;
    },

    /**
     * Reset assessment state
     */
    resetAssessment: (state) => {
      return initialState;
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Navigate to specific question
     */
    goToQuestion: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < state.questions.length) {
        state.currentQuestionIndex = action.payload;
      }
    },
  },
});

// Export actions
export const {
  startTest,
  nextQuestion,
  previousQuestion,
  saveAnswer,
  updateTimeRemaining,
  submitTest,
  resetAssessment,
  setLoading,
  setError,
  goToQuestion,
} = assessmentSlice.actions;

export default assessmentSlice.reducer;
