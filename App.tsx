
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, AppState, WordCard, QuizQuestion, StudyMode, TestResult, Reward } from './types';
import { initAudio, speakMessage, generateQuizOffline } from './services/geminiService';
import { WORD_BANK } from './constants/wordBank';
import Navigation from './components/Navigation.tsx';

const BGM_URL = '/assets/bgm.mp3'; 

const REWARDS: (Reward & { type: string; aura: string; color: string })[] = [
  { id: 'r1', name: 'ひのたま', cost: 50, emoji: '🔥', type: 'fire', aura: 'from-orange-400 to-rose-500', color: '#ffeadb', description: 'やる気がメラメラだニャ！' },
  { id: 'r2', name: 'リボンたま', cost: 100, emoji: '🎀', type: 'ribbon', aura: 'from-pink-300 to-rose-400', color: '#fff0f5', description: 'おしゃれ番長だニャ。' },
  { id: 'r3', name: 'おすしたま', cost: 300, emoji: '🍣', type: 'sushi', aura: 'from-slate-100 to-rose-50', color: '#ffffff', description: '鮮度バツグンの正解ニャ。' },
  { id: 'r4', name: 'ドヤ・メガネたま', cost: 500, emoji: '👓', type: 'glasses', aura: 'from-indigo-400 to-blue-600', color: '#eef2ff', description: '全知全能の風格だニャ。' },
  { id: 'r12', name: '王様たま', cost: 1000, emoji: '👑', type: 'king', aura: 'from-amber-400 to-orange-600', color: '#fff9db', description: '英語界のレジェンドだニャ。' },
  { id: 'r13', name: '宇宙たま', cost: 2000, emoji: '🚀', type: 'space', aura: 'from-purple-600 to-blue-900', color: '#e0e7ff', description: '銀河一の英単語力ニャ！' },
  { id: 'r14', name: '宝石たま', cost: 3500, emoji: '💎', type: 'gem', aura: 'from-cyan-300 to-teal-400', color: '#f0fdfa', description: '輝きが止まらないニャ。' },
  { id: 'r15', name: '虹たま', cost: 5000, emoji: '🌈', type: 'rainbow', aura: 'from-red-400 via-green-400 to-blue-400', color: '#fff', description: '奇跡の猫たま誕生ニャ！' },
];

const useSoundSystem = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const bgmSource = useRef<AudioBufferSourceNode | null>(null);
  const bgmBuffer = useRef<AudioBuffer | null>(null);
  const bgmGainNode = useRef<GainNode | null>(null);
  const [isBGMActive, setIsBGMActive] = useState(false);
  const [isLoadingBGM, setIsLoadingBGM] = useState(false);

  const initContext = async () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    }
    if (audioCtx.current.state === 'suspended') {
      await audioCtx.current.resume();
    }
    initAudio(); 
    return audioCtx.current;
  };

  const loadBGM = async () => {
    if (bgmBuffer.current) return;
    setIsLoadingBGM(true);
    try {
      const ctx = await initContext();
      const response = await fetch(BGM_URL);
      if (!response.ok) throw new Error('BGM not found');
      const arrayBuffer = await response.arrayBuffer();
      bgmBuffer.current = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('BGM load failed:', err);
    } finally {
      setIsLoadingBGM(false);
    }
  };

  const startBGM = async () => {
    const ctx = await initContext();
    if (!bgmBuffer.current) await loadBGM();
    if (!bgmBuffer.current || isBGMActive) return;

    if (bgmSource.current) try { bgmSource.current.stop(); } catch(e) {}
    const source = ctx.createBufferSource();
    source.buffer = bgmBuffer.current;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.2); 
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
        if (bgmSource.current) { try { bgmSource.current.stop(); } catch(e) {} bgmSource.current = null; }
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
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
      } else if (type === 'correct') {
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.setValueAtTime(f, now + i * 0.08); g.gain.setValueAtTime(0.06, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.4);
        });
      } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
      } else if (type === 'point') {
        osc.frequency.setValueAtTime(1200, now); gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
      }
    } catch (e) {}
  };

  return { playSE, startBGM, stopBGM, isBGMActive, isLoadingBGM, initContext };
};

const TamaRenderer: React.FC<{ type?: string; scale?: number; emotion?: 'happy' | 'proud' | 'normal' | 'sad'; color?: string }> = ({ type = 'normal', scale = 1, emotion = 'normal', color = '#ffffff' }) => {
  return (
    <div className="relative inline-flex items-center justify-center aspect-square" style={{ transform: `scale(${scale})`, width: '120px' }}>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-20 h-2 bg-black/15 rounded-full blur-md"></div>
      <div className="absolute bottom-5 -right-1 w-5 h-10 border-[6px] border-[#ccc] rounded-full border-t-transparent border-l-transparent rotate-[25deg] animate-tail origin-bottom-left" style={{ borderColor: `transparent transparent ${color} ${color}`, filter: 'drop-shadow(0px 1.5px 1.5px rgba(0,0,0,0.3))' }}></div>
      <div className="absolute inset-0 rounded-[55%_55%_45%_45%] border-[4px] border-zinc-400 transition-colors duration-500 overflow-hidden" style={{ backgroundColor: color }}>
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-full h-1/2 bg-white/20 rounded-full blur-2xl"></div>
      </div>
      <div className="absolute -top-1 left-3 w-8 h-8 bg-white rounded-[70%_30%_30%_30%] -rotate-[28deg] border-[4px] border-zinc-400" style={{ backgroundColor: color }}>
        <div className="absolute inset-1.5 bg-rose-50 rounded-[60%_20%_20%_20%]"></div>
      </div>
      <div className="absolute -top-1 right-3 w-8 h-8 bg-white rounded-[30%_70%_30%_30%] rotate-[28deg] border-[4px] border-zinc-400" style={{ backgroundColor: color }}>
        <div className="absolute inset-1.5 bg-rose-50 rounded-[20%_60%_20%_20%]"></div>
      </div>
      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-full px-6 flex flex-col items-center z-10">
        <div className="flex justify-between w-full mb-1 px-1">
          <div className={`w-2 h-2 bg-[#111] rounded-full animate-blink ${emotion === 'happy' ? 'h-0.5 mt-1 border-t-[3px] border-[#111] bg-transparent' : emotion === 'sad' ? 'h-0.5 mt-1 border-b-[3px] border-[#111] bg-transparent' : ''}`}></div>
          <div className={`w-2 h-2 bg-[#111] rounded-full animate-blink ${emotion === 'happy' ? 'h-0.5 mt-1 border-t-[3px] border-[#111] bg-transparent' : emotion === 'sad' ? 'h-0.5 mt-1 border-b-[3px] border-[#111] bg-transparent' : ''}`}></div>
        </div>
        <div className="flex -mt-0.5 scale-100">
          <div className="w-3.5 h-3.5 border-b-[2.5px] border-[#111] rounded-full -mr-[0.1px]"></div>
          <div className="w-3.5 h-3.5 border-b-[2.5px] border-[#111] rounded-full"></div>
        </div>
      </div>
      <div className="absolute bottom-6 left-6 w-4 h-4 bg-white rounded-full shadow-sm z-10 animate-paw-l border-[3px] border-zinc-300" style={{ backgroundColor: color }}></div>
      <div className="absolute bottom-6 right-6 w-4 h-4 bg-white rounded-full shadow-sm z-10 animate-paw-r border-[3px] border-zinc-300" style={{ backgroundColor: color }}></div>
      {type === 'glasses' && <div className="absolute inset-0 z-20 flex justify-center items-center pointer-events-none"><div className="mt-[-12px] flex items-center"><div className="w-7 h-7 border-[3px] border-[#111] rounded-full bg-blue-50/10"></div><div className="w-1 h-[3px] bg-[#111]"></div><div className="w-7 h-7 border-[3px] border-[#111] rounded-full bg-blue-50/10"></div></div></div>}
      {type === 'fire' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🔥</div>}
      {type === 'ribbon' && <div className="absolute top-0 right-2 w-7 h-7 bg-rose-400 rounded-full flex items-center justify-center text-sm rotate-12 border-2 border-white shadow-sm">🎀</div>}
      {type === 'king' && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl animate-pulse">👑</div>}
      {type === 'space' && <div className="absolute inset-0 bg-indigo-500/40 rounded-full blur-xl animate-pulse"></div>}
      {type === 'rainbow' && <div className="absolute -top-6 w-full h-8 flex justify-center text-3xl animate-bounce">🌈</div>}
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
  const [studyMode, setStudyMode] = useState<StudyMode>('EN_TO_JP');
  const [rankPeriod, setRankPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');

  const { playSE, startBGM, stopBGM, isBGMActive, isLoadingBGM, initContext } = useSoundSystem();

  useEffect(() => {
    const savedHistory = localStorage.getItem('eigo_kyun_history');
    if (savedHistory) setTestHistory(JSON.parse(savedHistory));
  }, []);

  const saveUserData = (updated: UserProfile) => {
    setUser(updated);
    const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
    allUsers[updated.id] = { ...updated, lastUpdate: Date.now() }; 
    localStorage.setItem('eigo_kyun_all_users', JSON.stringify(allUsers));
  };

  const navTo = async (page: AppState) => {
    await initContext();
    playSE('click');
    setCurrentPage(page);
  };

  const handleLogin = async () => {
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

  const startQuiz = async (mode: StudyMode) => {
    await initContext();
    playSE('click');
    const stageStartIndex = (selectedStage - 1) * 50;
    const stageWords = WORD_BANK.slice(stageStartIndex, stageStartIndex + 50);
    const selectedWordsForQuiz = [...stageWords].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuizQuestions(generateQuizOffline(selectedWordsForQuiz, mode, WORD_BANK));
    setCurrentQuizIdx(0); setCorrectCount(0); setLastAnswerFeedback(null); setStudyMode(mode);
    setCurrentPage('QUIZ');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'LOGIN':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#f5f1ef] page-enter overflow-hidden">
            <div className="w-full max-w-xs text-center flex flex-col items-center">
              <div className="mb-8 flex justify-center w-full"><TamaRenderer scale={1.2} emotion="happy" /></div>
              <h1 className="text-4xl font-black text-zinc-800 mb-1 italic tracking-tighter">Eigo★Kyun!</h1>
              <p className="text-[12px] font-black text-pink-700 tracking-[0.4em] mb-12 uppercase leading-none">Daily English Magic</p>
              <div className="space-y-4 w-full">
                <input type="text" inputMode="numeric" placeholder="8桁のID" maxLength={8} className="w-full bg-white border-2 border-zinc-300 p-4.5 rounded-3xl text-center text-xl font-bold focus:border-pink-400 outline-none shadow-sm transition-all text-zinc-800" value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
                {isFirstLogin && <input type="text" placeholder="なまえを教えてニャ" className="w-full bg-white border-2 border-zinc-300 p-4.5 rounded-3xl text-center font-bold focus:border-pink-400 outline-none shadow-sm transition-all text-zinc-800" value={nickname} onChange={e => setNickname(e.target.value)} />}
                <button onClick={handleLogin} className="w-full bg-zinc-800 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">はじめる！</button>
              </div>
            </div>
          </div>
        );
      case 'HOME':
        const curReward = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-6 pt-12 space-y-12 page-enter pb-32 text-center flex flex-col items-center overflow-x-hidden">
            <div className="flex flex-col items-center w-full">
               <div className="floating-slow mb-10 flex justify-center"><TamaRenderer type={curReward?.type} color={curReward?.color} scale={1.5} emotion="happy" /></div>
               <div className="bg-white p-7 rounded-[2.5rem] border-[4px] border-zinc-300 shadow-2xl max-w-[280px] w-full relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-l-[4px] border-t-[4px] border-zinc-300 rotate-45"></div>
                 <p className="text-zinc-800 font-bold text-center text-base leading-relaxed">"{characterMessage}"</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
               <button onClick={() => navTo('LEARN')} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-[3px] border-zinc-200 flex flex-col items-center gap-2 active:scale-95 transition-all hover:border-pink-300">
                 <span className="text-4xl">🐾</span><span className="text-[11px] font-black text-zinc-600 tracking-widest uppercase">Learn</span>
               </button>
               <button onClick={() => navTo('SHOP')} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-[3px] border-zinc-200 flex flex-col items-center gap-2 active:scale-95 transition-all hover:border-pink-300">
                 <span className="text-4xl">🎁</span><span className="text-[11px] font-black text-zinc-600 tracking-widest uppercase">Shop</span>
               </button>
            </div>
          </div>
        );
      case 'LEARN':
        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32 overflow-x-hidden">
            <h2 className="text-3xl font-black text-zinc-800 italic">Stages</h2>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <button key={i} onClick={() => { setSelectedStage(i+1); navTo('TEST'); }} className="p-6 bg-white rounded-[2.5rem] shadow-sm border-[4px] border-zinc-200 transition-all flex flex-col items-center gap-3 active:scale-95 hover:border-pink-300">
                  <div className="text-4xl">🐱</div>
                  <p className="text-xl font-black text-zinc-800 leading-none">Stage {i+1}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 'TEST':
        const stageWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 50);
        return (
          <div className="p-4 pt-10 space-y-5 page-enter pb-32 overflow-hidden flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-sm mb-2">
              <button onClick={() => navTo('LEARN')} className="text-zinc-700 font-black text-[10px] tracking-widest bg-white px-5 py-2.5 rounded-full border-[3px] border-zinc-300 shadow-sm active:bg-zinc-100">BACK</button>
              <h2 className="text-xl font-black text-zinc-800 italic">Stage {selectedStage}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-2">
              <button onClick={() => startQuiz('EN_TO_JP')} className="bg-pink-600 text-white py-4 rounded-[1.8rem] font-black text-sm shadow-lg active:scale-95">英和クイズ</button>
              <button onClick={() => startQuiz('JP_TO_EN')} className="bg-zinc-800 text-white py-4 rounded-[1.8rem] font-black text-sm shadow-lg active:scale-95">和英クイズ</button>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] w-full max-w-sm pr-1 custom-scrollbar">
              {stageWords.map((w, idx) => (
                <div key={w.id} className="bg-white px-5 py-5 rounded-[1.8rem] flex items-center justify-between shadow-sm border-[4px] border-zinc-100 hover:border-pink-300">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-[11px] font-black text-pink-600 w-10 flex-shrink-0">No.{((selectedStage-1)*50) + idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-zinc-800 leading-none mb-1.5 truncate">{w.word}</p>
                      <p className="text-[10px] font-bold text-zinc-500 italic truncate">{w.meaning}</p>
                    </div>
                  </div>
                  <button onClick={async () => { await initContext(); speakMessage(w.word); }} className="bg-zinc-100 p-3 rounded-2xl text-xl flex-shrink-0 ml-2">🔊</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'QUIZ':
        const q = quizQuestions[currentQuizIdx];
        const curR = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-4 pt-4 min-h-screen page-enter bg-[#f5f1ef] flex flex-col items-center overflow-x-hidden">
            {lastAnswerFeedback && <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none animate-result-pop"><span className={`text-[12rem] font-black drop-shadow-2xl ${lastAnswerFeedback === 'CORRECT' ? 'text-emerald-600' : 'text-rose-600'}`}>{lastAnswerFeedback === 'CORRECT' ? '○' : '×'}</span></div>}
            <div className="mb-4 flex justify-center w-full"><TamaRenderer type={curR?.type} color={curR?.color} scale={1.0} emotion={lastAnswerFeedback === 'WRONG' ? 'sad' : 'normal'} /></div>
            <div className="w-full max-w-sm space-y-4 px-2">
              <div className="text-center bg-white p-6 rounded-[2.5rem] border-[5px] border-zinc-400 shadow-xl relative min-h-[140px] flex flex-col justify-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-5 py-2 rounded-full font-black tracking-widest shadow-lg">{currentQuizIdx + 1} / 10</div>
                <h3 className="text-2xl font-black text-zinc-800 mt-2 leading-tight break-words">{q?.question}</h3>
              </div>
              <div className="grid gap-3">
                {q?.options.map((opt, i) => (
                  <button key={i} onClick={() => {
                    const isCorrect = opt === q.correctAnswer;
                    playSE(isCorrect ? 'correct' : 'wrong');
                    setLastAnswerFeedback(isCorrect ? 'CORRECT' : 'WRONG');
                    if (isCorrect) setCorrectCount(c => c + 1);
                    setTimeout(() => {
                      if (currentQuizIdx + 1 < 10) { setCurrentQuizIdx(idx => idx + 1); setLastAnswerFeedback(null); }
                      else {
                        const score = isCorrect ? correctCount + 1 : correctCount;
                        if (user) saveUserData({ ...user, points: user.points + score, totalPoints: user.totalPoints + score });
                        const updatedHistory = [{ score, total: 10, date: new Date().toLocaleDateString(), timestamp: Date.now(), category: `Stage ${selectedStage}` }, ...testHistory].slice(0, 30);
                        setTestHistory(updatedHistory);
                        localStorage.setItem('eigo_kyun_history', JSON.stringify(updatedHistory));
                        setCurrentPage('REVIEW');
                      }
                    }, isCorrect ? 600 : 1500);
                  }} disabled={!!lastAnswerFeedback} className={`bg-white p-5 rounded-[2rem] border-[4px] text-center font-black text-xl shadow-md transition-all ${lastAnswerFeedback ? (opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-none' : 'opacity-20 grayscale border-zinc-200 shadow-none') : 'border-zinc-300 active:scale-95 break-words'}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'SHOP':
        return (
          <div className="p-6 pt-10 space-y-8 page-enter pb-48 overflow-x-hidden flex flex-col items-center">
             <div className="flex justify-between items-end w-full max-w-sm px-2">
              <h2 className="text-3xl font-black text-zinc-800 italic">Shop</h2>
              <div className="bg-pink-600 text-white px-5 py-2.5 rounded-full font-black text-base shadow-lg">{user?.points} PT</div>
            </div>
            <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
              {REWARDS.map(r => {
                const owned = user?.unlockedRewards.includes(r.id);
                return (
                  <div key={r.id} className={`bg-white p-5 rounded-[2.5rem] border-[4px] flex items-center justify-between relative transition-all ${owned ? 'opacity-40 border-zinc-200 grayscale' : 'border-zinc-100 shadow-xl'}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-16 aspect-square flex items-center justify-center"><TamaRenderer type={r.type} color={r.color} scale={0.55} /></div>
                      <div className="text-left min-w-0 flex-1 ml-2">
                        <p className="text-xl font-black text-zinc-800 leading-tight truncate">{r.name}</p>
                        <p className="text-[10px] font-bold text-zinc-500 italic mt-0.5 leading-snug break-words">"{r.description}"</p>
                      </div>
                    </div>
                    {owned ? <div className="text-zinc-500 font-black text-[11px] mr-2 flex-shrink-0">OWNED</div> : <button onClick={() => {
                      if (!user || user.points < r.cost) { playSE('wrong'); return; }
                      playSE('point');
                      saveUserData({ ...user, points: user.points - r.cost, unlockedRewards: [...user.unlockedRewards, r.id] });
                      setCharacterMessage(`${r.name}、お似合いニャ！`);
                    }} className="bg-zinc-800 text-white px-5 py-3 rounded-2xl font-black text-[11px] shadow-lg active:scale-95 flex-shrink-0">{r.cost}P</button>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'RANKING':
        const allUsersMap = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
        const now = Date.now();
        const periodMs = rankPeriod === 'DAY' ? 24 * 60 * 60 * 1000 : rankPeriod === 'WEEK' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const ranking = Object.values(allUsersMap)
          .filter((u: any) => u.lastUpdate && (now - u.lastUpdate) < periodMs)
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
          .slice(0, 10);

        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32 overflow-x-hidden flex flex-col items-center">
            <h2 className="text-3xl font-black text-zinc-800 italic text-center">Hall of Fame</h2>
            <div className="flex bg-white p-2 rounded-[1.8rem] border-[3px] border-zinc-300 shadow-md w-full max-w-sm">
              {(['DAY', 'WEEK', 'MONTH'] as const).map(p => (
                <button key={p} onClick={() => setRankPeriod(p)} className={`flex-1 py-3 rounded-2xl text-[11px] font-black tracking-widest transition-all ${rankPeriod === p ? 'bg-pink-600 text-white shadow-lg' : 'text-zinc-400'}`}>
                  {p === 'DAY' ? '今日' : p === 'WEEK' ? '今週' : '今月'}
                </button>
              ))}
            </div>
            <div className="space-y-4 w-full max-w-sm">
              {ranking.length > 0 ? ranking.map((u: any, i) => (
                <div key={u.id} className={`bg-white p-5 rounded-[2.2rem] flex items-center gap-5 border-[4px] transition-all ${u.id === user?.id ? 'border-pink-500 shadow-xl' : 'border-zinc-100'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner flex-shrink-0 ${i===0?'bg-yellow-400 text-white':i===1?'bg-zinc-300 text-white':i===2?'bg-orange-400 text-white':'bg-zinc-100 text-zinc-500'}`}>{i+1}</div>
                  <div className="flex-1 min-w-0"><p className="text-lg font-black text-zinc-800 truncate">{u.nickname}</p><p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{u.loginDays} Days</p></div>
                  <p className="text-xl font-black text-pink-600 flex-shrink-0">{u.totalPoints}<span className="text-[9px] ml-1">PT</span></p>
                </div>
              )) : <div className="text-center py-20 text-zinc-400 font-black italic">No records...</div>}
            </div>
          </div>
        );
      case 'REVIEW':
        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32 overflow-x-hidden flex flex-col items-center">
            <h2 className="text-3xl font-black text-zinc-800 italic text-center">History</h2>
            <div className="bg-zinc-800 p-10 rounded-[3rem] text-center shadow-2xl border-[6px] border-zinc-700 w-full max-w-sm flex flex-col items-center justify-center">
              <p className="text-[11px] font-black text-pink-400 tracking-widest mb-3 opacity-95 uppercase">Points</p>
              <p className="text-6xl font-black text-white leading-none">{user?.points}<span className="text-sm ml-2 text-zinc-500">PT</span></p>
            </div>
            <div className="space-y-4 w-full max-w-sm">
              {testHistory.slice(0, 10).map((h, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl border-l-[8px] border-l-pink-600 border-2 border-zinc-100">
                  <div className="min-w-0 flex-1"><span className="text-[10px] font-black text-zinc-400 uppercase leading-none tracking-widest">{h.category}</span><p className="text-base font-bold text-zinc-800 mt-1.5 truncate">{h.date}</p></div>
                  <p className="text-3xl font-black text-zinc-800 ml-4 flex-shrink-0">{h.score}<span className="text-xs text-zinc-300 ml-1">/10</span></p>
                </div>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen relative bg-[#f5f1ef] overflow-x-hidden">
      {currentPage !== 'LOGIN' && (
        <header className="px-5 py-5 flex justify-between items-center sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b-2 border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navTo('HOME')}>
            <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-zinc-700">🐱</div>
            <h1 className="text-[11px] font-black text-zinc-800 tracking-[0.25em] uppercase italic leading-none hidden sm:block">Eigo★Ky!</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await initContext(); isBGMActive ? stopBGM() : startBGM(); }} disabled={isLoadingBGM} className={`px-4 py-2.5 rounded-full flex items-center justify-center text-[10px] shadow-lg border-2 transition-all font-black tracking-widest ${isBGMActive ? 'bg-pink-100 border-pink-400 text-pink-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
              {isLoadingBGM ? '⏳' : isBGMActive ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => navTo('RANKING')} className="bg-pink-600 px-4 py-2.5 rounded-full text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-4 border-pink-800">Rank</button>
          </div>
        </header>
      )}
      <main className="max-w-md mx-auto w-full">{renderContent()}</main>
      {currentPage !== 'LOGIN' && <Navigation current={currentPage} setPage={navTo} />}
      <style>{`
        .floating-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes tail { 0%, 100% { transform: rotate(25deg); } 50% { transform: rotate(45deg); } }
        @keyframes blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
        @keyframes pawL { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px) rotate(-10deg); } }
        @keyframes pawR { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px) rotate(10deg); } }
        .animate-tail { animation: tail 2.5s ease-in-out infinite; }
        .animate-blink { animation: blink 4s infinite; }
        .animate-paw-l { animation: pawL 3s ease-in-out infinite; }
        .animate-paw-r { animation: pawR 3s ease-in-out infinite; delay: 0.15s; }
        .page-enter { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes resultPop { 0% { transform: scale(0.4); opacity: 0; } 15% { transform: scale(1); opacity: 1; } 85% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(1.2); opacity: 0; } }
        .animate-result-pop { animation: resultPop 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
