
import React, { useState, useEffect, useRef } from 'react';
import { AppState, WordCard, QuizQuestion, Category, StudyMode, TestResult, UserProfile, Reward } from './types';
import { getWordsByCategory, generateQuiz, generateRewardImage, speakMessage, getAIAdvice, initAudio } from './services/geminiService';
import Navigation from './components/Navigation';

const REWARDS: Reward[] = [
  { id: '1', name: 'ゆるふわパンダ', cost: 50, imagePrompt: 'a round fluffy panda eating a strawberry', description: 'はじめてのなかま！' },
  { id: '2', name: 'おねむなウサギ', cost: 100, imagePrompt: 'a cute sleepy white bunny with a tiny hat', description: 'べんきょう中におねむになっちゃった。' },
  { id: '3', name: 'どや顔のシバ', cost: 150, imagePrompt: 'a proud shiba inu wearing glasses', description: 'インテリなシバくん。' },
  { id: '4', name: '宇宙へ行くネコ', cost: 200, imagePrompt: 'a kitten floating in space with a bubble helmet', description: 'キミの英語力は宇宙レベル！' },
  { id: '5', name: 'もちもちアザラシ', cost: 250, imagePrompt: 'a soft white seal that looks like a mochi ball', description: 'もちもちボディのいやし。' },
  { id: '6', name: '食いしん坊ハム', cost: 300, imagePrompt: 'a hamster with huge cheeks full of sunflower seeds', description: 'ほっぺがパンパン。' },
  { id: '7', name: '読書家のペンギン', cost: 350, imagePrompt: 'a small penguin reading a tiny book under a scarf', description: '英語を勉強してるのかな？' },
  { id: '8', name: 'のんびりラッコ', cost: 400, imagePrompt: 'a sea otter floating with a giant clam shell', description: 'ぷかぷか。' },
  { id: '9', name: 'おめかしアルパカ', cost: 450, imagePrompt: 'a fluffy alpaca wearing a flower crown', description: 'おしゃれ番長。' },
  { id: '10', name: 'くいしんぼキツネ', cost: 500, imagePrompt: 'a round fox holding a hot fried tofu', description: 'おあげ大好き。' },
  { id: '11', name: 'ドクター・フクロウ', cost: 600, imagePrompt: 'a wise small owl wearing a graduation cap and round glasses', description: '英語のことはなんでも聞いて！' },
  { id: '12', name: '虹を渡るユニコーン', cost: 700, imagePrompt: 'a magical baby unicorn with a rainbow mane jumping on clouds', description: 'キミの夢を応援してるよ！' },
  { id: '13', name: 'お月見泥棒タヌキ', cost: 800, imagePrompt: 'a cute tanuki holding a large dango under a full moon', description: 'お月様よりお団子！？' },
  { id: '14', name: '伝説のドラゴンベビー', cost: 900, imagePrompt: 'a tiny glowing golden dragon sitting on a pile of gems', description: '未来の覇者はキミだ！' },
  { id: '15', name: '光り輝く鳳凰のヒナ', cost: 1000, imagePrompt: 'a legendary baby phoenix made of soft golden light and fire petals', description: '英語を極めし者への贈り物。' },
  { id: '16', name: '星詠みの白猫', cost: 1200, imagePrompt: 'a mystical white cat sitting on a crescent moon with glowing stars floating around', description: '未来のキミが見えるニャ。' },
  { id: '17', name: '深海の王女人魚', cost: 1400, imagePrompt: 'a tiny cute mermaid with glowing scales in a beautiful coral kingdom', description: '海の向こうにも言葉があるの。' },
  { id: '18', name: '天空の騎士ペガサス', cost: 1600, imagePrompt: 'a brave baby pegasus with silver wings flying over a castle', description: 'どこまでも飛んでいける！' },
  { id: '19', name: '時を司る銀狼', cost: 1800, imagePrompt: 'a majestic silver wolf with galaxy fur and glowing blue eyes', description: 'キミの努力は永遠に刻まれる。' },
  { id: '20', name: '英知の神龍', cost: 2000, imagePrompt: 'a magnificent green and gold dragon spiraling around a giant floating gemstone', description: '真の英語マスター、誕生。' },
];

const KYUN_MESSAGES = [
  "You can do it! ✨",
  "Let's study together! 🐾",
  "English is so much fun! 😊",
  "You are doing a great job! 📈",
  "Amazing! Your English is shining! 🌟",
  "Don't give up! I'm with you! 📣",
  "Wow! You have so many points! 💰",
  "Your pronunciation is beautiful! 🎤",
  "Believe in yourself! 🌈",
  "Every step counts! 👣"
];

const WELCOME_MESSAGES = [
  "Welcome! Nice to meet you!",
  "Are you ready to study English?",
  "Let's have fun together!",
  "Hi there! Tap me again!",
  "I was waiting for you! 🐱"
];

const App: React.FC = () => {
  const [page, setPage] = useState<AppState>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<WordCard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('EN_TO_JP');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [rewardImages, setRewardImages] = useState<Record<string, string>>({});
  const [reviewSubTab, setReviewSubTab] = useState<'REWARDS' | 'HISTORY'>('REWARDS');
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong', text: string } | null>(null);
  const [characterMessage, setCharacterMessage] = useState<string>("Hello! Let's study English!");
  const [aiAdvice, setAiAdvice] = useState<string>("データ収集中だニャ...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginStep, setLoginStep] = useState<'ID' | 'NICKNAME'>('ID');
  const [tempId, setTempId] = useState('');
  
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  useEffect(() => {
    const savedSession = localStorage.getItem('eigo_kyun_current_session');
    const savedHistory = localStorage.getItem('eigo_kyun_history');
    const savedImages = localStorage.getItem('eigo_kyun_images');
    
    if (savedSession) {
      const parsedUser = JSON.parse(savedSession);
      setUser(parsedUser);
      checkLoginBonus(parsedUser);
      setPage('HOME');
    }
    if (savedHistory) setTestHistory(JSON.parse(savedHistory));
    if (savedImages) setRewardImages(JSON.parse(savedImages));
  }, []);

  useEffect(() => {
    if (page === 'REVIEW' && user) {
      getAIAdvice(testHistory, user.nickname).then(setAiAdvice).catch(console.error);
    }
  }, [page]);

  const saveUserData = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('eigo_kyun_current_session', JSON.stringify(updatedUser));
    localStorage.setItem(`user_data_${updatedUser.id}`, JSON.stringify(updatedUser));
  };

  const checkLoginBonus = (u: UserProfile) => {
    const today = new Date().toLocaleDateString();
    if (u.lastLoginDate !== today) {
      const updatedUser = {
        ...u,
        loginDays: u.loginDays + 1,
        lastLoginDate: today,
        points: u.points + 20,
        totalPoints: u.totalPoints + 20
      };
      saveUserData(updatedUser);
    }
  };

  const handleIdInput = (id: string) => {
    initAudio();
    if (!/^\d{8}$/.test(id)) {
      alert("数字8桁で入力してね！");
      return;
    }
    setTempId(id);
    const stored = localStorage.getItem(`user_data_${id}`);
    if (stored) {
      const existingUser = JSON.parse(stored);
      saveUserData(existingUser);
      setPage('HOME');
    } else {
      setLoginStep('NICKNAME');
    }
  };

  const handleNicknameInput = (nickname: string) => {
    initAudio();
    if (!nickname.trim()) {
      alert("ニックネームを入力してね！");
      return;
    }
    const newUser: UserProfile = {
      id: tempId,
      nickname: nickname.trim(),
      points: 50,
      totalPoints: 50,
      loginDays: 1,
      lastLoginDate: new Date().toLocaleDateString(),
      unlockedRewards: []
    };
    saveUserData(newUser);
    setPage('HOME');
  };

  const startLearning = async (category: Category) => {
    initAudio();
    setLoading(true);
    setSelectedCategory(category);
    try {
      const fetchedWords = await getWordsByCategory(category);
      if (!fetchedWords || fetchedWords.length === 0) throw new Error("empty");
      setWords(fetchedWords);
      setPage('LEARN');
    } catch (error) {
      console.error(error);
      alert("単語を読み込めなかったニャ。もう一回タップしてみてニャ！");
    } finally {
      setLoading(false);
    }
  };

  const addPoints = (amount: number) => {
    if (!user) return;
    const updated = {
      ...user,
      points: user.points + amount,
      totalPoints: user.totalPoints + amount
    };
    saveUserData(updated);
  };

  const handleCharacterTap = async () => {
    initAudio();
    if (isSpeaking) return;
    let pool = page === 'LOGIN' ? WELCOME_MESSAGES : KYUN_MESSAGES;
    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    if (page !== 'LOGIN') setCharacterMessage(randomMsg);
    
    setIsSpeaking(true);
    try {
      await speakMessage(randomMsg);
    } catch (e) {
      console.error("TTS Error", e);
    } finally {
      setIsSpeaking(false);
    }
  };

  const finishQuiz = (finalCorrect: boolean) => {
    const finalScore = score + (finalCorrect ? 1 : 0);
    setQuizFinished(true);
    
    if (page === 'TEST') {
      const basePts = finalScore * 15;
      const bonusPts = finalScore === quiz.length ? 100 : 0;
      addPoints(basePts + bonusPts);
      
      const newResult: TestResult = { 
        score: finalScore, 
        total: quiz.length, 
        timeTaken: timer, 
        mode: studyMode, 
        date: new Date().toLocaleDateString(),
        category: selectedCategory || '実力テスト'
      };
      const newHistory = [newResult, ...testHistory];
      setTestHistory(newHistory);
      localStorage.setItem('eigo_kyun_history', JSON.stringify(newHistory));
    } else {
      addPoints(30); 
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAnswer = (answer: string) => {
    const isCorrect = answer === quiz[currentQuizIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(s => s + 1);
      setCombo(c => c + 1);
      setFeedback({ type: 'correct', text: combo >= 2 ? `${combo + 1} Combo! ✨` : '正解！きゅん！' });
    } else {
      setCombo(0);
      setFeedback({ type: 'wrong', text: '惜しい！どんまい！' });
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentQuizIndex + 1 < quiz.length) {
        setCurrentQuizIndex(currentQuizIndex + 1);
      } else {
        finishQuiz(isCorrect);
      }
    }, 800);
  };

  const startQuiz = async (mode: StudyMode, isTest: boolean = false) => {
    initAudio();
    setLoading(true);
    setStudyMode(mode);
    setShowModeSelect(false);
    try {
      let quizWords = words;
      if (isTest || words.length === 0) {
        const categories = Object.values(Category);
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        quizWords = await getWordsByCategory(randomCat);
      }
      
      const generatedQuiz = await generateQuiz(quizWords, mode);
      if (!generatedQuiz || generatedQuiz.length === 0) throw new Error("Quiz is empty");
      
      setQuiz(generatedQuiz);
      setCurrentQuizIndex(0);
      setScore(0);
      setCombo(0);
      setQuizFinished(false);
      setPage(isTest ? 'TEST' : 'QUIZ');
      if (isTest) {
        setTimer(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => setTimer(prev => prev + 1), 1000);
      }
    } catch (error) {
      console.error(error);
      alert("クイズ作成でエラーが起きたニャ。もう一度試してニャ！");
    } finally {
      setLoading(false);
    }
  };

  const unlockReward = async (reward: Reward) => {
    initAudio();
    if (!user || user.points < reward.cost || user.unlockedRewards.includes(reward.id)) return;
    setLoading(true);
    try {
      const img = await generateRewardImage(reward.imagePrompt);
      if (!img) throw new Error("Image failed");
      const newImages = { ...rewardImages, [reward.id]: img };
      setRewardImages(newImages);
      localStorage.setItem('eigo_kyun_images', JSON.stringify(newImages));
      
      const updated = {
        ...user,
        points: user.points - reward.cost,
        unlockedRewards: [...user.unlockedRewards, reward.id]
      