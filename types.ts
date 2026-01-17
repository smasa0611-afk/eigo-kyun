
export interface WordCard {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  exampleSentence: string;
  exampleMeaning: string;
  category: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface TestResult {
  score: number;
  total: number;
  timeTaken: number;
  mode: StudyMode;
  date: string;
  category: string;
}

export interface UserProfile {
  id: string; // 8-digit unique ID
  nickname: string;
  points: number;
  totalPoints: number;
  loginDays: number;
  lastLoginDate: string;
  unlockedRewards: string[];
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  imagePrompt: string;
  description: string;
}

export type AppState = 'LOGIN' | 'HOME' | 'LEARN' | 'QUIZ' | 'REVIEW' | 'TEST';

export type StudyMode = 'EN_TO_JP' | 'JP_TO_EN' | 'EXAMPLE_FILL';

export enum Category {
  SCHOOL = '学校',
  DAILY = '日常生活',
  EMOTION = '気持ち',
  FOOD = 'たべもの',
  NATURE = 'しぜん'
}
