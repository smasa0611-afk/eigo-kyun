
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AppState, WordCard, QuizQuestion, StudyMode, TestResult, Reward } from './types';
import { initAudio, speakMessage, generateQuizOffline } from './services/geminiService';
import { WORD_BANK } from './constants/wordBank';
import Navigation from './components/Navigation.tsx';

// 🎵 BGMのファイルパス。public/assets/bgm.mp3 を用意してください
const BGM_URL = 'assets/bgm.mp3'; 

const REWARDS: (Reward & { type: string; aura: string; color: string })[] = [
  { id: 'r1', name: 'ひのたま', cost: 50, emoji: '🔥', type: 'fire', aura: 'from-orange-400 to-rose-500', color: '#ffeadb', description: 'やる気がメラメラだニャ！' },
  { id: 'r2', name: 'リボンたま', cost: 100, emoji: '🎀', type: 'ribbon', aura: 'from-pink-300 to-rose-400', color: '#fff0f5', description: 'おしゃれ番長だニャ。' },
  { id: 'r3', name: 'おすしたま', cost: 150, emoji: '🍣', type: 'sushi', aura: 'from-slate-100 to-rose-50', color: '#ffffff', description: '鮮度バツグンの正解ニャ。' },
  { id: 'r4', name: 'ドヤ・メガネたま', cost: 200, emoji: '👓', type: 'glasses', aura: 'from-indigo-400 to-blue-600', color: '#eef2ff', description: '全知全能の風格だニャ。' },
  { id: 'r5', name: 'あめふりたま', cost: 300, emoji: '☔', type: 'rain', aura: 'from-cyan-300 to-blue-500', color: '#e0f7fa', description: '雨音は英語の調べだニャ。' },
  { id: 'r12', name: '王様たま', cost: 1000, emoji: '👑', type: 'king', aura: 'from-amber-400 to-orange-600', color: '#fff9db', description: '英語界のレジェンドだニャ。' },
];

/**
 * サウンドシステムカスタムフック
 * ブラウザの音声制限を回避し、MP3とSEを管理
 */
const useSoundSystem = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const bgmSource = useRef<AudioBufferSourceNode | null>(null);
  const bgmBuffer = useRef<AudioBuffer | null>(null);
  const bgmGainNode = useRef<GainNode | null>(null);
  const [isBGMActive, setIsBGMActive] = useState(false);
  const [isLoadingBGM, setIsLoadingBGM] = useState(false);

  // 重要: ユーザー操作(クリック)の中でこれを呼ぶ必要がある
  const initContext = async () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      await audioCtx.current.resume();
    }
    return audioCtx.current;
  };

  const loadBGM = async () => {
    if (bgmBuffer.current) return;
    setIsLoadingBGM(true);
    try {
      const ctx = await initContext();
      const response = await fetch(BGM_URL);
      if (!response.ok) throw new Error('BGM file not found');
      const arrayBuffer = await response.arrayBuffer();
      bgmBuffer.current = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('BGMロード失敗。ファイルを確認してください:', err);
    } finally {
      setIsLoadingBGM(false);
    }
  };

  const startBGM = async () => {
    const ctx = await initContext();
    if (!bgmBuffer.current) {
      await loadBGM();
    }
    if (!bgmBuffer.current || isBGMActive) return;

    if (bgmSource.current) {
      try { bgmSource.current.stop(); } catch(e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = bgmBuffer.current;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.2); 

    source.connect(gain);
    gain.connect(ctx.destination);

    source.start(0);
    bgmSource.current = source;
    bgmGainNode.current = gain;
    setIsBGMActive(true);
  };

  const stopBGM = () => {
    if (bgmGainNode.current && audioCtx.current) {
      const ctx = audioCtx.current;
      bgmGainNode.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        if (bgmSource.current) {
          try { bgmSource.current.stop(); } catch(e) {}
          bgmSource.current = null;
        }
        setIsBGMActive(false);
      }, 500);
    } else {
      setIsBGMActive(false);
    }
  };

  const playSE = async (type: 'click' | 'correct' | 'wrong' | 'point') => {
    try {
      const ctx = await initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
      } else if (type === 'correct') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + i * 0.08);
          g.gain.setValueAtTime(0.06, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.5);
        });
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
      } else if (type === 'point') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now);
        osc.frequency.exponentialRampToValueAtTime(2349.32, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
      }
    } catch (e) { console.error("SE再生エラー:", e); }
  };

  return { playSE, startBGM, stopBGM, isBGMActive, isLoadingBGM, initContext };
};

const TamaRenderer: React.FC<{ type?: string; scale?: number; emotion?: 'happy' | 'proud' | 'normal' | 'sad'; color?: string }> = ({ type = 'normal', scale = 1, emotion = 'normal', color = '#ffffff' }) => {
  return (
    <div className="relative inline-block" style={{ transform: `scale(${scale})`, width: '150px', height: '150px' }}>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-2 bg-black/5 rounded-full blur-md"></div>
      <div className="absolute bottom-5 -right-1 w-6 h-12 border-[8px] border-[#eee] rounded-full border-t-transparent border-l-transparent rotate-[25deg] animate-tail origin-bottom-left" style={{ borderColor: `transparent transparent ${color} ${color}` }}></div>
      <div className="absolute inset-0 rounded-[55%_55%_45%_45%] shadow-sm border-2 border-white transition-colors duration-500 overflow-hidden" style={{ backgroundColor: color }}>
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-32 h-24 bg-white/20 rounded-full blur-2xl"></div>
      </div>
      <div className="absolute -top-1 left-4 w-10 h-10 bg-white rounded-[70%_30%_30%_30%] -rotate-[28deg] shadow-sm border-t border-white" style={{ backgroundColor: color }}>
        <div className="absolute inset-2 bg-rose-50 rounded-[60%_20%_20%_20%]"></div>
      </div>
      <div className="absolute -top-1 right-4 w-10 h-10 bg-white rounded-[30%_70%_30%_30%] rotate-[28deg] shadow-sm border-t border-white" style={{ backgroundColor: color }}>
        <div className="absolute inset-2 bg-rose-50 rounded-[20%_60%_20%_20%]"></div>
      </div>
      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-full px-8 flex flex-col items-center z-10">
        <div className="flex justify-between w-full mb-1">
          <div className={`w-2 h-2 bg-[#444] rounded-full animate-blink ${emotion === 'happy' ? 'h-0.5 mt-1 border-t-[2px] border-[#444] bg-transparent' : emotion === 'sad' ? 'h-0.5 mt-1 border-b-[2px] border-[#444] bg-transparent' : ''}`}></div>
          <div className={`w-2 h-2 bg-[#444] rounded-full animate-blink ${emotion === 'happy' ? 'h-0.5 mt-1 border-t-[2px] border-[#444] bg-transparent' : emotion === 'sad' ? 'h-0.5 mt-1 border-b-[2px] border-[#444] bg-transparent' : ''}`}></div>
        </div>
        <div className="flex -mt-1 scale-110">
          <div className="w-3 h-3 border-b-[1.5px] border-[#444] rounded-full -mr-[0.2px] opacity-70"></div>
          <div className="w-3 h-3 border-b-[1.5px] border-[#444] rounded-full opacity-70"></div>
        </div>
      </div>
      <div className="absolute bottom-8 left-8 w-3.5 h-3.5 bg-white rounded-full shadow-sm z-10 animate-paw-l" style={{ backgroundColor: color }}></div>
      <div className="absolute bottom-8 right-8 w-3.5 h-3.5 bg-white rounded-full shadow-sm z-10 animate-paw-r" style={{ backgroundColor: color }}></div>
      {type === 'glasses' && (
        <div className="absolute inset-0 z-20 flex justify-center items-center pointer-events-none">
          <div className="mt-[-15px] flex items-center">
            <div className="w-8 h-8 border-[1.5px] border-[#333] rounded-full bg-blue-50/10"></div>
            <div className="w-1.5 h-[1.5px] bg-[#333]"></div>
            <div className="w-8 h-8 border-[1.5px] border-[#333] rounded-full bg-blue-50/10"></div>
          </div>
        </div>
      )}
      {type === 'fire' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl animate-bounce">🔥</div>}
      {type === 'ribbon' && <div className="absolute top-0 right-3 w-6 h-6 bg-rose-400 rounded-full flex items-center justify-center text-base rotate-12 border-2 border-white shadow-sm">🎀</div>}
      {type === 'king' && <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl animate-pulse">👑</div>}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [characterMessage, setCharacterMessage] = useState('たま、応援してるニャ！');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [currentMissionStage, setCurrentMissionStage] = useState(1);
  const [studyMode, setStudyMode] = useState<StudyMode>('EN_TO_JP');

  const { playSE, startBGM, stopBGM, isBGMActive, isLoadingBGM, initContext } = useSoundSystem();

  useEffect(() => {
    // 最初のマウント時に音声ブラウザ初期化（ダミー）
    initAudio();
    const savedHistory = localStorage.getItem('eigo_kyun_history');
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setTestHistory(history);
      const maxCleared = history
        .filter((h: TestResult) => h.score >= 8)
        .map((h: TestResult) => parseInt(h.category.replace('Stage ', '')))
        .reduce((max: number, curr: number) => Math.max(max, curr), 0);
      setCurrentMissionStage(maxCleared + 1);
    }
  }, []);

  const saveUserData = (updated: UserProfile) => {
    setUser(updated);
    const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
    allUsers[updated.id] = updated;
    localStorage.setItem('eigo_kyun_all_users', JSON.stringify(allUsers));
  };

  const navTo = (page: AppState) => {
    playSE('click');
    setCurrentPage(page);
  };

  const handleLogin = async () => {
    // ここでユーザー操作に反応してAudioContextを起動させる（重要！）
    await initContext();
    playSE('click');
    
    const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
    if (isFirstLogin) {
      if (!nickname) return;
      const newUser: UserProfile = { id: loginId, nickname, points: 200, totalPoints: 200, loginDays: 1, lastLoginDate: new Date().toISOString().split('T')[0], unlockedRewards: [] };
      saveUserData(newUser);
      setCurrentPage('HOME');
      startBGM(); 
    } else if (allUsers[loginId]) {
      setUser(allUsers[loginId]);
      setCurrentPage('HOME');
      startBGM();
    } else {
      setIsFirstLogin(true);
    }
  };

  const startQuiz = (mode: StudyMode) => {
    playSE('click');
    const stageStartIndex = (selectedStage - 1) * 50;
    const stageWords = WORD_BANK.slice(stageStartIndex, stageStartIndex + 50);
    const shuffledStage = [...stageWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffledStage.slice(0, 10);
    
    const quiz = generateQuizOffline(selectedWords, mode, WORD_BANK);
    setQuizQuestions(quiz);
    setCurrentQuizIdx(0);
    setCorrectCount(0);
    setLastAnswerFeedback(null);
    setStudyMode(mode);
    setCurrentPage('QUIZ');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'LOGIN':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fdfaf9] page-enter">
            <div className="w-full max-w-xs text-center">
              <div className="mb-4"><TamaRenderer scale={1.1} emotion="happy" /></div>
              <h1 className="text-4xl font-black text-zinc-800 mb-1 italic tracking-tighter">Eigo★Kyun!</h1>
              <p className="text-[9px] font-black text-pink-300 tracking-[0.4em] mb-10 text-center">DAILY ENGLISH MAGIC</p>
              <div className="space-y-3">
                <input type="text" inputMode="numeric" placeholder="8桁のID" maxLength={8} className="w-full bg-white border-2 border-zinc-50 p-4 rounded-3xl text-center text-xl font-bold focus:border-pink-200 outline-none shadow-sm transition-all" value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
                {isFirstLogin && <input type="text" placeholder="なまえを教えてニャ" className="w-full bg-white border-2 border-zinc-50 p-4 rounded-3xl text-center font-bold focus:border-pink-200 outline-none shadow-sm transition-all" value={nickname} onChange={e => setNickname(e.target.value)} />}
                <button onClick={handleLogin} className="w-full bg-zinc-800 text-white py-4 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-all">はじめる！</button>
              </div>
            </div>
          </div>
        );
      case 'HOME':
        const curReward = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-6 pt-10 space-y-10 page-enter pb-32 text-center">
            <div className="flex flex-col items-center">
               <div className="floating-slow mb-4"><TamaRenderer type={curReward?.type} color={curReward?.color} scale={1.3} emotion="happy" /></div>
               <div className="glass p-5 rounded-[2rem] border border-white/60 shadow-lg max-w-[210px] w-full relative">
                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 border-l border-t border-zinc-50 rotate-45"></div>
                 <p className="text-zinc-600 font-bold text-center text-xs leading-snug">"{characterMessage}"</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => navTo('LEARN')} className="bg-white p-6 rounded-[1.8rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-1 active:scale-95 transition-all">
                 <span className="text-3xl">🐾</span><span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Learn</span>
               </button>
               <button onClick={() => navTo('SHOP')} className="bg-white p-6 rounded-[1.8rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-1 active:scale-95 transition-all">
                 <span className="text-3xl">🎀</span><span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Shop</span>
               </button>
            </div>
          </div>
        );
      case 'LEARN':
        return (
          <div className="p-6 pt-10 space-y-8 page-enter pb-32">
            <h2 className="text-3xl font-black text-zinc-800 italic">Stages</h2>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 12 }).map((_, i) => {
                const s = i + 1;
                const isLocked = s > currentMissionStage;
                return (
                  <button key={s} disabled={isLocked} onClick={() => { setSelectedStage(s); navTo('TEST'); }} className={`p-5 rounded-[1.5rem] shadow-sm border-2 transition-all flex flex-col items-center gap-2 ${isLocked ? 'bg-zinc-50 border-zinc-100 opacity-20' : s === currentMissionStage ? 'bg-white border-pink-200 scale-102 shadow-md' : 'bg-white border-white active:scale-95'}`}>
                    <div className="text-3xl">{isLocked ? '🔒' : s < currentMissionStage ? '🏅' : '🐱'}</div>
                    <p className="text-xl font-black text-zinc-700">Stage {s}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'TEST':
        const stageWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 50);
        return (
          <div className="p-6 pt-10 space-y-4 page-enter pb-32 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => navTo('LEARN')} className="text-zinc-400 font-black text-[8px] tracking-widest bg-white px-4 py-1.5 rounded-full border border-zinc-50 shadow-sm">BACK</button>
              <h2 className="text-lg font-black text-zinc-800 italic">Stage {selectedStage}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button onClick={() => startQuiz('EN_TO_JP')} className="bg-pink-400 text-white py-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all">英和クイズ</button>
              <button onClick={() => startQuiz('JP_TO_EN')} className="bg-zinc-800 text-white py-4 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all">和英クイズ</button>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[55vh] pr-1">
              {stageWords.map(w => (
                <div key={w.id} className="bg-white px-4 py-3 rounded-xl flex items-center justify-between shadow-sm border border-zinc-50">
                  <div className="flex-1">
                    <p className="text-base font-black text-zinc-700 leading-none mb-0.5">{w.word}</p>
                    <p className="text-[9px] font-bold text-zinc-300 italic">{w.meaning}</p>
                  </div>
                  <button onClick={() => { playSE('click'); speakMessage(w.word); }} className="bg-zinc-50 p-2 rounded-lg text-sm active:bg-pink-50">🔊</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'QUIZ':
        const q = quizQuestions[currentQuizIdx];
        const curRewardForQuiz = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-6 pt-2 min-h-screen page-enter bg-[#fdfaf9] flex flex-col items-center">
            {lastAnswerFeedback && (
              <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none animate-result-pop">
                <span className={`text-9xl font-black drop-shadow-xl ${lastAnswerFeedback === 'CORRECT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {lastAnswerFeedback === 'CORRECT' ? '○' : '×'}
                </span>
              </div>
            )}
            <div className="mb-1"><TamaRenderer type={curRewardForQuiz?.type} color={curRewardForQuiz?.color} scale={0.8} emotion={lastAnswerFeedback === 'WRONG' ? 'sad' : 'normal'} /></div>
            <div className="w-full max-w-sm space-y-3">
              <div className="text-center bg-white p-5 rounded-[1.8rem] border border-zinc-50 shadow-md relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[7px] px-3 py-1 rounded-full font-black tracking-widest">{currentQuizIdx + 1} / 10</div>
                <h3 className="text-xl font-black text-zinc-700 mt-1 leading-tight">{q?.question}</h3>
              </div>
              <div className="grid gap-2">
                {q?.options.map((opt, i) => (
                  <button key={i} onClick={() => {
                    const isCorrect = opt === q.correctAnswer;
                    playSE(isCorrect ? 'correct' : 'wrong');
                    setLastAnswerFeedback(isCorrect ? 'CORRECT' : 'WRONG');
                    if (isCorrect) setCorrectCount(c => c + 1);
                    setTimeout(() => {
                      if (currentQuizIdx + 1 < 10) {
                        setCurrentQuizIdx(idx => idx + 1);
                        setLastAnswerFeedback(null);
                      } else {
                        const score = isCorrect ? correctCount + 1 : correctCount;
                        const res = { score, total: 10, date: new Date().toLocaleDateString(), timestamp: Date.now(), category: `Stage ${selectedStage}` };
                        setTestHistory(h => [res, ...h].slice(0, 30));
                        if (user) {
                          saveUserData({ ...user, points: user.points + score * 10, totalPoints: user.totalPoints + score * 10 });
                          playSE('point');
                        }
                        setCurrentPage('REVIEW');
                      }
                    }, isCorrect ? 600 : 1800);
                  }} disabled={!!lastAnswerFeedback} className={`bg-white p-3.5 rounded-xl border-2 text-center font-black text-sm transition-all ${lastAnswerFeedback ? (opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-200' : 'opacity-20') : 'border-zinc-50 active:scale-98'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'SHOP':
        return (
          <div className="p-6 pt-10 space-y-6 page-enter pb-48">
             <div className="flex justify-between items-end px-2">
              <h2 className="text-3xl font-black text-zinc-800 italic">Boutique</h2>
              <div className="bg-pink-400 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-sm">{user?.points} PT</div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {REWARDS.map(r => {
                const isUnlocked = user?.unlockedRewards.includes(r.id);
                return (
                  <div key={r.id} className={`bg-white p-5 rounded-2xl border-2 transition-all flex items-center justify-between relative ${isUnlocked ? 'border-zinc-50 opacity-40' : 'border-white shadow-md'}`}>
                    <div className="flex items-center gap-3">
                      <TamaRenderer type={r.type} color={r.color} scale={0.5} />
                      <div className="text-left">
                        <p className="text-base font-black text-zinc-800">{r.name}</p>
                        <p className="text-[7px] font-bold text-zinc-400 italic">"{r.description}"</p>
                      </div>
                    </div>
                    {isUnlocked ? <div className="text-zinc-200 font-black text-[7px] tracking-widest mr-2">OWNED</div> : <button onClick={async () => {
                      if (!user) return;
                      if (user.points < r.cost) {
                        playSE('wrong');
                        return;
                      }
                      playSE('point');
                      const updated = { ...user, points: user.points - r.cost, unlockedRewards: [...user.unlockedRewards, r.id] };
                      saveUserData(updated);
                      setCharacterMessage(`${r.name}、とっても可愛いニャ！`);
                    }} className="bg-zinc-800 text-white px-4 py-2 rounded-xl font-black text-[9px] shadow-sm active:scale-95 transition-all">{r.cost}P</button>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'REVIEW':
        return (
          <div className="p-6 pt-10 space-y-6 page-enter pb-32">
            <h2 className="text-3xl font-black text-zinc-800 italic text-center">Summary</h2>
            <div className="bg-zinc-800 p-6 rounded-3xl text-center shadow-lg">
              <p className="text-[7px] font-black text-pink-300 uppercase tracking-widest mb-1 opacity-80">Accumulated Points</p>
              <p className="text-4xl font-black text-white">{user?.points}<span className="text-[10px] ml-1 text-zinc-500">PT</span></p>
            </div>
            <div className="space-y-2">
              {testHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border-l-4 border-l-pink-300">
                  <div>
                    <span className="text-[7px] font-black text-zinc-300 uppercase leading-none">{h.category}</span>
                    <p className="text-[10px] font-bold text-zinc-700 leading-none mt-1">{h.date}</p>
                  </div>
                  <p className="text-xl font-black text-zinc-800 leading-none">{h.score}<span className="text-[8px] text-zinc-200 ml-0.5">/10</span></p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'RANKING':
        const allUsersArr = Object.values(JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}')).sort((a: any, b: any) => b.totalPoints - a.totalPoints).slice(0, 10);
        return (
          <div className="p-6 pt-10 space-y-6 page-enter pb-32">
            <h2 className="text-3xl font-black text-zinc-800 italic text-center">Hall of Fame</h2>
            <div className="space-y-2.5">
              {allUsersArr.map((u: any, i) => (
                <div key={u.id} className={`bg-white p-3.5 rounded-2xl flex items-center gap-4 border-2 ${u.id === user?.id ? 'border-pink-300 shadow-md' : 'border-zinc-50'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${i===0?'bg-yellow-400 text-white':i===1?'bg-zinc-200 text-zinc-400':i===2?'bg-orange-300 text-white':'bg-zinc-50 text-zinc-200'}`}>{i+1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-zinc-700">{u.nickname}</p>
                    <p className="text-[7px] font-bold text-zinc-300 tracking-widest uppercase">{u.loginDays} Days</p>
                  </div>
                  <p className="text-base font-black text-pink-400">{u.totalPoints}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen relative bg-[#fdfaf9]">
      {currentPage !== 'LOGIN' && (
        <header className="p-4 flex justify-between items-center sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navTo('HOME')}>
            <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center text-base shadow-md">🐱</div>
            <h1 className="text-[7px] font-black text-zinc-800 tracking-widest uppercase italic leading-none">Eigo★Ky!</h1>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => {
                initContext(); // 操作時に再活性化
                isBGMActive ? stopBGM() : startBGM();
              }} 
              disabled={isLoadingBGM}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-sm transition-all ${isLoadingBGM ? 'opacity-50' : ''} ${isBGMActive ? 'bg-pink-100 text-pink-600 font-bold' : 'bg-zinc-100 text-zinc-400'}`}
            >
              {isLoadingBGM ? '⏳' : isBGMActive ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => navTo('RANKING')} className="bg-pink-400 px-3 py-1 rounded-full text-white font-black text-[7px] uppercase tracking-widest shadow-sm">Rank</button>
          </div>
        </header>
      )}
      <main className="max-w-md mx-auto">{renderContent()}</main>
      {currentPage !== 'LOGIN' && <Navigation current={currentPage} setPage={navTo} />}
      <style>{`
        .floating-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tail {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(35deg); }
        }
        @keyframes blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes pawL {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px) rotate(-8deg); }
        }
        @keyframes pawR {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px) rotate(8deg); }
        }
        .animate-tail { animation: tail 2s ease-in-out infinite; }
        .animate-blink { animation: blink 3s infinite; }
        .animate-paw-l { animation: pawL 3s ease-in-out infinite; }
        .animate-paw-r { animation: pawR 3s ease-in-out infinite; delay: 0.15s; }
        .page-enter { animation: fadeIn 0.25s ease-out forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes resultPop {
          0% { transform: scale(0.6); opacity: 0; }
          30% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        .animate-result-pop { animation: resultPop 0.7s ease-out forwards; }
        .scale-102 { transform: scale(1.02); }
        .scale-98 { transform: scale(0.98); }
      `}</style>
    </div>
  );
};

export default App;
