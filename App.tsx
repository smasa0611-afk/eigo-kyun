
import React, { useState, useEffect, useRef } from 'react';
import { AppState, WordCard, QuizQuestion, Category, StudyMode, TestResult, UserProfile, Reward } from './types';
import { getWordsByCategory, generateQuiz, generateRewardImage, speakMessage, getAIAdvice } from './services/geminiService';
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

  // きろく画面になったらAIアドバイスを取得
  useEffect(() => {
    if (page === 'REVIEW' && user) {
      getAIAdvice(testHistory, user.nickname).then(setAiAdvice);
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
    setLoading(true);
    setSelectedCategory(category);
    try {
      const fetchedWords = await getWordsByCategory(category);
      setWords(fetchedWords);
      setPage('LEARN');
    } catch (error) {
      alert("単語を読み込めなかったよ...");
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
    if (isSpeaking) return;
    let pool = page === 'LOGIN' ? WELCOME_MESSAGES : KYUN_MESSAGES;
    
    if (page !== 'LOGIN' && user) {
        if (user.points > 1000) pool = [...pool, "You are a legendary master! 🌟"];
        if (testHistory.length > 10) pool = [...pool, "Your study diary is amazing! 📖"];
    }

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
    setLoading(true);
    setStudyMode(mode);
    setShowModeSelect(false);
    try {
      const quizWords = isTest ? await getWordsByCategory(Object.values(Category)[Math.floor(Math.random() * 5)]) : words;
      const generatedQuiz = await generateQuiz(quizWords, mode);
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
      alert("クイズ作成エラー...");
    } finally {
      setLoading(false);
    }
  };

  const unlockReward = async (reward: Reward) => {
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
      };
      saveUserData(updated);
    } catch (e) {
      alert("AIの魔法が届かなかったみたい...再挑戦してね！");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative bg-[#FFF9FB] overflow-hidden shadow-2xl border-x border-pink-50">
      {/* Background Particles Decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-pink-300 animate-pulse">✨</div>
        <div className="absolute top-40 right-10 text-blue-300 animate-pulse delay-700">✨</div>
        <div className="absolute bottom-60 left-20 text-yellow-300 animate-pulse delay-1000">✨</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,_#FFDEE9_10%,_transparent_10%)] [background-size:40px_40px] opacity-10"></div>
      </div>

      {feedback && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className={`px-10 py-5 rounded-full text-white font-black text-3xl shadow-2xl animate-pop-in ${feedback.type === 'correct' ? 'bg-gradient-to-r from-pink-500 to-rose-400' : 'bg-gray-400'}`}>
            {feedback.text}
          </div>
        </div>
      )}

      {page !== 'LOGIN' && (
        <header className="pt-8 px-6 flex justify-between items-center relative z-10">
          <div onClick={() => setPage('HOME')} className="cursor-pointer active:scale-95 transition-transform">
            <h1 className="text-3xl font-black text-pink-500 italic drop-shadow-sm">Eigo-Kyun!</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex bg-yellow-400 text-white px-2 py-0.5 rounded-full font-black text-[10px] items-center gap-1 shadow-sm border border-yellow-200">
                <span>⭐</span> {user?.points} pt
              </div>
              <span className="text-[10px] text-gray-400 font-bold bg-white/70 px-2 py-0.5 rounded-full border border-pink-50 truncate max-w-[80px] shadow-sm">{user?.nickname}</span>
            </div>
          </div>
          <button 
            onClick={() => { if(confirm("ログアウトしますか？")) { setUser(null); setPage('LOGIN'); localStorage.removeItem('eigo_kyun_current_session'); }}}
            className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-pink-50 shadow-sm active:rotate-12 transition-transform"
          >
            <span className="text-xl">🚪</span>
          </button>
        </header>
      )}

      <main className="px-6 mt-6 relative z-10">
        {loading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative mb-6 text-center">
              <div className="w-24 h-24 border-8 border-pink-50 border-t-pink-500 rounded-full animate-spin mx-auto shadow-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">🦄</div>
            </div>
            <p className="font-black text-pink-500 text-xl tracking-widest animate-pulse">Summoning AI Magic...</p>
            <p className="text-[10px] text-pink-300 mt-2 font-bold bg-pink-50 px-4 py-1 rounded-full">特別なごほうびを準備しているよ！</p>
          </div>
        )}

        {page === 'LOGIN' && (
          <div className="h-[80vh] flex flex-col justify-center items-center text-center space-y-10 animate-fadeIn px-4">
            <div className="relative">
              <div 
                onClick={handleCharacterTap}
                className={`text-9xl cursor-pointer hover:scale-110 transition-transform relative ${isSpeaking ? 'animate-bounce' : 'floating'}`}
              >
                🐱
                {isSpeaking && <div className="absolute -top-4 -right-4 text-4xl animate-pulse">🎵</div>}
              </div>
              <div className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-xl border-2 border-pink-100 font-black text-pink-500 animate-bounce">
                Study with me!
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl font-black text-gray-800 tracking-tighter drop-shadow-md">Eigo-Kyun!</h2>
              <p className="text-pink-300 font-bold pt-2 flex items-center justify-center gap-2">
                 <span className="text-xs">✨</span> 中学英語が、もっと好きになる。 <span className="text-xs">✨</span>
              </p>
            </div>
            <div className="w-full space-y-4">
              {loginStep === 'ID' ? (
                <>
                  <input id="userid" type="tel" maxLength={8} placeholder="8桁の数字を入力" 
                    className="w-full p-6 rounded-[32px] border-4 border-pink-50 focus:border-pink-300 outline-none text-center font-black text-3xl tracking-[0.2em] bg-white shadow-inner"
                  />
                  <p className="text-[11px] text-pink-300 font-bold">数字8桁ならなんでもOK！キミだけの魔法のIDだよ。</p>
                  <button onClick={() => handleIdInput((document.getElementById('userid') as HTMLInputElement).value)}
                    className="w-full py-6 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-[32px] font-black shadow-xl active:scale-95 transition-all text-xl"
                  >
                    はじめる 🐾
                  </button>
                </>
              ) : (
                <>
                  <input id="nickname" type="text" placeholder="キミのなまえは？" 
                    className="w-full p-6 rounded-[32px] border-4 border-pink-50 focus:border-pink-300 outline-none text-center font-black text-2xl bg-white shadow-inner"
                  />
                  <button onClick={() => handleNicknameInput((document.getElementById('nickname') as HTMLInputElement).value)}
                    className="w-full py-6 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-[32px] font-black shadow-xl active:scale-95 transition-all text-xl"
                  >
                    これで決定！ ✨
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {page === 'HOME' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="relative flex flex-col items-center pt-4">
               <div className="absolute -top-2 bg-white px-6 py-3 rounded-3xl shadow-xl border-2 border-pink-100 font-black text-gray-700 max-w-[85%] text-center z-10 animate-slide-up">
                 {characterMessage}
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-pink-100 rotate-45"></div>
               </div>
               <div 
                 onClick={handleCharacterTap} 
                 className={`text-9xl cursor-pointer hover:scale-105 transition-transform active:scale-95 mt-12 mb-4 relative ${isSpeaking ? 'animate-bounce' : 'floating'}`}
               >
                 🐱
                 {isSpeaking && <div className="absolute -top-2 -right-2 text-3xl animate-pulse">🎵</div>}
               </div>
            </div>

            <div className="bg-gradient-to-br from-pink-400 to-rose-400 rounded-[40px] p-8 text-white card-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-black mb-1 truncate">Lv.{Math.floor((user?.totalPoints || 0) / 100) + 1} {user?.nickname}</h2>
                    <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full border border-white/20">{user?.loginDays}日連続ログイン！</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                   <div className="bg-white h-full transition-all duration-1000 shadow-sm" style={{ width: `${(user?.totalPoints || 0) % 100}%` }}></div>
                </div>
                <div className="mt-6 flex gap-3">
                  <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black backdrop-blur-md flex items-center gap-1 shadow-sm">⭐ {user?.points} pt</span>
                  <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black backdrop-blur-md flex items-center gap-1 shadow-sm">🏆 {testHistory.length} 回挑戦</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.values(Category).map((cat) => (
                <button
                  key={cat}
                  onClick={() => startLearning(cat as Category)}
                  className="bg-white/80 backdrop-blur-sm border-2 border-pink-50 p-6 rounded-[32px] flex flex-col items-center hover:border-pink-300 transition-all active:scale-95 shadow-sm"
                >
                  <span className="text-4xl mb-3">{cat === Category.SCHOOL ? '🏫' : cat === Category.DAILY ? '🏠' : cat === Category.EMOTION ? '😊' : cat === Category.FOOD ? '🍰' : '🌳'}</span>
                  <span className="text-sm font-black text-gray-800">{cat}</span>
                </button>
              ))}
            </div>

            <div className="bg-pink-50/50 rounded-[32px] p-6 border-2 border-pink-100/50 relative overflow-hidden">
               <div className="absolute right-[-10px] bottom-[-10px] text-4xl opacity-10 rotate-12">📝</div>
               <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                 Today's Mission
               </h3>
               <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm transition-colors ${testHistory.some(h => h.date === new Date().toLocaleDateString()) ? 'bg-pink-500 text-white' : 'bg-white border-2 border-pink-100 text-transparent'}`}>✓</div>
                  <p className="text-xs font-bold text-gray-600">実力テストを一回受ける (+50pt)</p>
               </div>
            </div>
          </div>
        )}

        {page === 'LEARN' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                 <span className="text-xl">📖</span> Study: {selectedCategory}
              </h2>
              <button onClick={() => setPage('HOME')} className="w-8 h-8 flex items-center justify-center bg-gray-100/80 rounded-full text-gray-400 hover:bg-gray-200 transition-colors">×</button>
            </div>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 pb-4 custom-scrollbar">
              {words.map((word, i) => (
                <div key={word.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] border-2 border-pink-50 shadow-sm animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-black text-gray-800">{word.word}</h3>
                    <div className="bg-pink-50 text-pink-500 font-black px-3 py-1 rounded-full text-[10px] border border-pink-100">{word.meaning}</div>
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold mb-4 italic">[{word.pronunciation}]</p>
                  <div className="bg-pink-50/30 p-4 rounded-[24px] border border-pink-50/50">
                    <p className="text-sm text-gray-700 font-bold leading-relaxed italic">"{word.exampleSentence}"</p>
                    <p className="text-[11px] text-pink-400 font-bold mt-2">訳：{word.exampleMeaning}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setPage('HOME')} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black transition-all active:scale-95">戻る</button>
              <button onClick={() => setShowModeSelect(true)} className="flex-[2] py-5 bg-pink-500 text-white rounded-[28px] font-black shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                 <span>Let's Quiz!</span> <span className="text-xl">🚀</span>
              </button>
            </div>
          </div>
        )}

        {(page === 'QUIZ' || page === 'TEST') && quiz.length > 0 && !quizFinished && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center text-[10px] font-black">
              <div className="bg-white/80 px-4 py-2 rounded-full shadow-sm text-pink-400 border border-pink-50 backdrop-blur-sm">
                {currentQuizIndex + 1} / {quiz.length}
              </div>
              {combo >= 2 && <div className="bg-pink-500 text-white px-5 py-2 rounded-full shadow-lg animate-bounce italic ring-4 ring-pink-100">🔥 {combo} COMBO!</div>}
            </div>
            <div className="bg-white p-12 rounded-[48px] border-4 border-pink-50 text-center shadow-xl flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-pink-50/50">
                  <div className="h-full bg-pink-400 transition-all duration-500" style={{ width: `${((currentQuizIndex) / quiz.length) * 100}%` }}></div>
               </div>
               <h2 className="text-2xl font-black text-gray-800 leading-relaxed px-4">{quiz[currentQuizIndex].question}</h2>
            </div>
            <div className="grid gap-4">
              {quiz[currentQuizIndex].options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt)}
                  className="w-full p-6 text-left bg-white/80 border-2 border-pink-50 rounded-[28px] font-black text-gray-700 hover:border-pink-300 transition-all shadow-sm active:scale-[0.98] flex items-center group backdrop-blur-sm"
                >
                  <span className="inline-block w-10 h-10 rounded-full bg-pink-50 text-pink-500 text-center leading-10 mr-6 text-sm font-black group-hover:bg-pink-500 group-hover:text-white transition-colors">{String.fromCharCode(65 + i)}</span>
                  <span className="text-lg">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {quizFinished && (
          <div className="text-center space-y-10 animate-fadeIn py-12">
            <div className="text-9xl animate-bounce">👑</div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-800">{score === quiz.length ? 'Perfect!' : 'Well Done!'}</h2>
                <p className="text-pink-300 font-bold">きゅん！キミの頑張りは最高だよ！</p>
            </div>
            <div className="bg-white p-12 rounded-[56px] border-8 border-pink-50 shadow-2xl inline-block relative">
               <div className="absolute -top-4 -right-4 bg-yellow-400 text-white px-4 py-2 rounded-full font-black text-xs shadow-lg border-2 border-yellow-200">+ {page === 'TEST' ? score * 15 : 30}pt</div>
              <div className="text-8xl font-black text-pink-500 drop-shadow-md">{score}<span className="text-3xl text-pink-200 font-normal"> / {quiz.length}</span></div>
            </div>
            <div className="flex gap-4 px-6">
              <button onClick={() => setPage('HOME')} className="flex-1 py-6 bg-gray-100 text-gray-400 rounded-[32px] font-black active:scale-95 transition-all">Home</button>
              <button onClick={() => setPage('REVIEW')} className="flex-1 py-6 bg-pink-500 text-white rounded-[32px] font-black shadow-xl active:scale-95 transition-all">Result</button>
            </div>
          </div>
        )}

        {page === 'REVIEW' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex bg-gray-100 p-1.5 rounded-[28px]">
              <button onClick={() => setReviewSubTab('REWARDS')} className={`flex-1 py-4 rounded-[22px] text-xs font-black transition-all ${reviewSubTab === 'REWARDS' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400'}`}>ごほうび</button>
              <button onClick={() => setReviewSubTab('HISTORY')} className={`flex-1 py-4 rounded-[22px] text-xs font-black transition-all ${reviewSubTab === 'HISTORY' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400'}`}>学習きろく</button>
            </div>
            <div className="h-[65vh] overflow-y-auto pr-1 pb-16 custom-scrollbar">
              {reviewSubTab === 'REWARDS' ? (
                <div className="grid grid-cols-2 gap-4 pb-10">
                  {REWARDS.map(reward => {
                    const isUnlocked = user?.unlockedRewards.includes(reward.id);
                    const canAfford = (user?.points || 0) >= reward.cost;
                    const isSuperRare = reward.cost >= 1000;
                    return (
                      <div key={reward.id} className={`bg-white/80 backdrop-blur-sm p-5 rounded-[40px] border-2 flex flex-col items-center text-center shadow-sm transition-all hover:scale-[1.02] ${isSuperRare ? 'border-yellow-100' : 'border-gray-50'}`}>
                        <div className={`aspect-square w-full bg-gray-50 rounded-[28px] mb-4 flex items-center justify-center overflow-hidden relative ${!isUnlocked && reward.cost >= 600 ? 'border-2 border-dashed border-yellow-200' : ''}`}>
                          {isUnlocked && rewardImages[reward.id] ? (
                            <img src={rewardImages[reward.id]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center">
                                <span className={`text-5xl ${!isUnlocked ? 'opacity-20 grayscale' : ''}`}>
                                    {reward.cost >= 1500 ? '🐉' : reward.cost >= 1000 ? '🌟' : reward.cost >= 600 ? '💎' : '🎁'}
                                </span>
                                {!isUnlocked && <span className="text-[8px] font-black text-gray-300 mt-2 uppercase tracking-tighter">Locked</span>}
                            </div>
                          )}
                          {!isUnlocked && reward.cost >= 600 && <div className={`absolute top-2 right-2 text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm ${isSuperRare ? 'bg-pink-500 text-white' : 'bg-yellow-400 text-white'}`}>{isSuperRare ? 'LEGEND' : 'RARE'}</div>}
                        </div>
                        <h4 className="text-[12px] font-black text-gray-700 truncate w-full">{reward.name}</h4>
                        <p className="text-[8px] text-gray-400 font-bold mt-1 line-clamp-1">{reward.description}</p>
                        {!isUnlocked && (
                            <button 
                                disabled={!canAfford} 
                                onClick={() => unlockReward(reward)} 
                                className={`mt-3 w-full py-3 rounded-full text-[10px] font-black transition-all active:scale-95 ${canAfford ? 'bg-pink-500 text-white shadow-md shadow-pink-100' : 'bg-gray-100 text-gray-300'}`}
                            >
                                {reward.cost} pt
                            </button>
                        )}
                        {isUnlocked && <div className="mt-3 w-full py-2 bg-pink-50 text-pink-400 rounded-full text-[8px] font-black">Unlocked!</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 pb-10">
                  {testHistory.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="text-6xl opacity-20 mb-4 animate-bounce">📉</div>
                        <p className="text-gray-300 font-bold">まだデータがないよ！<br/>テストに挑戦してみてね！</p>
                    </div>
                  ) : (
                    <>
                    <div className="bg-gradient-to-r from-blue-400 to-indigo-400 p-6 rounded-[32px] text-white shadow-lg mb-6 relative overflow-hidden">
                       <div className="relative z-10">
                          <h3 className="text-xs font-black opacity-80 uppercase mb-2 tracking-widest">AI Study Advice</h3>
                          <p className="text-sm font-black leading-relaxed">
                            {aiAdvice}
                          </p>
                       </div>
                       <div className="absolute right-[-10px] bottom-[-10px] text-6xl opacity-20 rotate-12">💡</div>
                    </div>
                    {testHistory.map((h, i) => (
                      <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] border-2 border-pink-50 flex justify-between items-center shadow-sm hover:border-pink-200 transition-colors">
                        <div>
                          <div className="flex gap-2 mb-2">
                            <span className="bg-pink-100 text-pink-500 text-[9px] px-3 py-1 rounded-full font-black uppercase shadow-sm">{h.date}</span>
                            <span className="bg-blue-100 text-blue-500 text-[9px] px-3 py-1 rounded-full font-black shadow-sm">{h.category}</span>
                          </div>
                          <p className="text-sm font-black text-gray-700 pl-1">{h.mode === 'EN_TO_JP' ? '英和' : h.mode === 'JP_TO_EN' ? '和英' : '穴埋め'}</p>
                        </div>
                        <div className="text-right pr-2">
                          <p className="text-3xl font-black text-pink-500 italic leading-none">{h.score}<span className="text-xs text-pink-200 font-normal ml-0.5">/{h.total}</span></p>
                          <p className="text-[8px] text-gray-300 font-bold mt-1 uppercase">{Math.floor(h.timeTaken / 60)}m {h.timeTaken % 60}s</p>
                        </div>
                      </div>
                    ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {page === 'TEST' && !quizFinished && quiz.length === 0 && (
          <div className="text-center py-20 space-y-10 animate-fadeIn">
            <div className="text-9xl floating">📖</div>
            <div className="space-y-3">
                <h2 className="text-4xl font-black text-gray-800 tracking-tight">実力テスト</h2>
                <div className="inline-block bg-pink-50 text-pink-500 px-6 py-2 rounded-full text-xs font-black border border-pink-100">合格すると大量ポイントGET!</div>
                <p className="text-[11px] text-gray-400 font-bold leading-relaxed px-10">ランダムな単語から5問出題されるよ！<br/>今のキミの力を見せてニャ！</p>
            </div>
            <button onClick={() => setShowModeSelect(true)} className="w-full py-7 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-[40px] font-black shadow-2xl text-xl active:scale-95 transition-all flex items-center justify-center gap-3">
               <span>Challenge Start!</span> <span className="text-2xl">🏁</span>
            </button>
          </div>
        )}

        {showModeSelect && (
          <div className="fixed inset-0 z-[150] flex items-end justify-center px-4 pb-24 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-[56px] p-12 shadow-2xl animate-slide-up relative">
               <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 text-5xl bg-white rounded-full p-2 shadow-xl border-4 border-pink-50">🧭</div>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-gray-800">モード選択</h3>
                <button onClick={() => setShowModeSelect(false)} className="text-gray-300 text-5xl hover:text-pink-300 transition-colors">×</button>
              </div>
              <div className="grid gap-5">
                <button onClick={() => startQuiz('EN_TO_JP', page === 'TEST')} className="w-full py-6 px-8 bg-pink-50 border-2 border-pink-100 rounded-[32px] text-left font-black flex items-center justify-between group transition-all active:scale-95 hover:bg-pink-100/50">
                  <span className="text-lg">🇯🇵 英和クイズ</span>
                  <span className="group-hover:translate-x-2 transition-transform">➡️</span>
                </button>
                <button onClick={() => startQuiz('JP_TO_EN', page === 'TEST')} className="w-full py-6 px-8 bg-blue-50 border-2 border-blue-100 rounded-[32px] text-left font-black flex items-center justify-between group transition-all active:scale-95 hover:bg-blue-100/50">
                  <span className="text-lg">🇺🇸 和英クイズ</span>
                  <span className="group-hover:translate-x-2 transition-transform">➡️</span>
                </button>
                <button onClick={() => startQuiz('EXAMPLE_FILL', page === 'TEST')} className="w-full py-6 px-8 bg-yellow-50 border-2 border-yellow-100 rounded-[32px] text-left font-black flex items-center justify-between group transition-all active:scale-95 hover:bg-yellow-100/50">
                  <span className="text-lg">📝 穴埋めクイズ</span>
                  <span className="group-hover:translate-x-2 transition-transform">➡️</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {page !== 'LOGIN' && <Navigation current={page} setPage={(p) => {
        setPage(p);
        setQuizFinished(false);
        setQuiz([]);
        setFeedback(null);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }} />}
      
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.2, 1, 0.3, 1) both; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop-in {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FFD1DC; border-radius: 10px; }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .floating { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
