
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, AppState, WordCard, QuizQuestion, StudyMode, TestResult, Reward } from './types';
import { initAudio, speakMessage, generateQuizOffline } from './services/geminiService';
import { WORD_BANK } from './constants/wordBank';
import Navigation from './components/Navigation.tsx';

const BGM_URL = '/assets/bgm.mp3'; 

interface ExtendedUserProfile extends UserProfile {
  equippedRewardId: string | null;
  charType: 'DOG' | 'CAT';
  mastery: Record<string, number>; 
}

const REWARDS: (Reward & { type: string; color: string; imagePath: string; rewardImagePath: string })[] = [
  { id: 'r1', name: 'ひのたま', cost: 50, emoji: '🔥', type: 'fire', color: '#ffeadb', description: 'やる気がメラメラだ！', imagePath: 'fire.png', rewardImagePath: '/assets/rewards/r1_fire.png' },
  { id: 'r2', name: 'リボン', cost: 100, emoji: '🎀', type: 'ribbon', color: '#fff0f5', description: 'おしゃれ番長だ。', imagePath: 'ribbon.png', rewardImagePath: '/assets/rewards/r2_ribbon.png' },
  { id: 'r3', name: 'おすし', cost: 300, emoji: '🍣', type: 'sushi', color: '#ffffff', description: '鮮度バツグンの正解。', imagePath: 'sushi.png', rewardImagePath: '/assets/rewards/r3_sushi.png' },
  { id: 'r4', name: 'ドヤ・メガネ', cost: 500, emoji: '👓', type: 'glasses', color: '#eef2ff', description: '全知全能の風格だ。', imagePath: 'glasses.png', rewardImagePath: '/assets/rewards/r4_glasses.png' },
  { id: 'r12', name: '王様', cost: 1000, emoji: '👑', type: 'king', color: '#fff9db', description: '英語界のレジェンドだ。', imagePath: 'king.png', rewardImagePath: '/assets/rewards/r12_king.png' },
  { id: 'r13', name: '宇宙', cost: 2000, emoji: '🚀', type: 'space', color: '#e0e7ff', description: '銀河一の英単語力！', imagePath: 'space.png', rewardImagePath: '/assets/rewards/r13_space.png' },
];

const useSoundSystem = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const bgmSource = useRef<AudioBufferSourceNode | null>(null);
  const bgmBuffer = useRef<AudioBuffer | null>(null);
  const bgmGainNode = useRef<GainNode | null>(null);
  const [isBGMActive, setIsBGMActive] = useState(false);

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
    try {
      const ctx = await initContext();
      const response = await fetch(BGM_URL);
      if (!response.ok) throw new Error('BGM not found');
      const arrayBuffer = await response.arrayBuffer();
      bgmBuffer.current = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn('BGM load failed:', err);
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
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.2); 
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

  return { playSE, startBGM, stopBGM, isBGMActive, initContext };
};

const TamaRenderer: React.FC<{ 
  charType?: 'DOG' | 'CAT';
  rewardType?: string; 
  accessoryPath?: string;
  scale?: number; 
  emotion?: 'happy' | 'proud' | 'normal' | 'sad'; 
}> = ({ charType = 'DOG', accessoryPath, scale = 1, emotion = 'normal' }) => {
  const [baseImgError, setBaseImgError] = useState(false);
  const [accessoryImgError, setAccessoryImgError] = useState(false);

  if (baseImgError) {
    return (
      <div className="relative inline-flex items-center justify-center rounded-full border-4 border-zinc-200 bg-white shadow-sm" style={{ transform: `scale(${scale})`, width: '100px', height: '100px', fontSize: '3rem' }}>
        {charType === 'CAT' ? '🐱' : '🐶'}
      </div>
    );
  }

  const charDir = charType === 'CAT' ? 'cat' : 'dog';
  const basePaths = {
    normal: `/assets/${charDir}/base.png`,
    happy: `/assets/${charDir}/happy.png`,
    proud: `/assets/${charDir}/happy.png`,
    sad: `/assets/${charDir}/sad.png`,
  };
  const finalBasePath = basePaths[emotion];
  const finalAccessoryPath = accessoryPath ? `/assets/${charDir}/${accessoryPath}` : null;

  return (
    <div className="relative inline-flex items-center justify-center aspect-square" style={{ transform: `scale(${scale})`, width: '120px', height: '120px' }}>
      <img 
        src={finalBasePath} 
        alt="char-base" 
        className="w-full h-full object-contain block absolute inset-0 z-10"
        onError={() => setBaseImgError(true)}
      />
      {finalAccessoryPath && !accessoryImgError && (
        <img 
          src={finalAccessoryPath} 
          alt="accessory" 
          className="w-full h-full object-contain block absolute inset-0 z-20 pointer-events-none"
          onError={() => setAccessoryImgError(true)}
        />
      )}
    </div>
  );
};

const MasteryStars: React.FC<{ level: number }> = ({ level }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={`text-sm ${i <= level ? 'text-yellow-400' : 'text-zinc-200'}`}>
          ★
        </span>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [charSelection, setCharSelection] = useState<'DOG' | 'CAT'>('DOG');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [studyMode, setStudyMode] = useState<StudyMode>('EN_TO_JP');
  const [rankingPeriod, setRankingPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [sessionCorrectIds, setSessionCorrectIds] = useState<string[]>([]);
  const [newlyMasteredCount, setNewlyMasteredCount] = useState(0);

  const { playSE, startBGM, stopBGM, isBGMActive, initContext } = useSoundSystem();

  const kyunMsg = (msg: string) => {
    const characterType = user?.charType || charSelection;
    const suffix = characterType === 'CAT' ? 'ニャ！' : 'ワン！';
    return msg.replace(/[！。]/g, '') + suffix;
  };

  const saveUserData = (updated: ExtendedUserProfile) => {
    setUser(updated);
    try {
      const allUsersStr = localStorage.getItem('eigo_kyun_all_users');
      const allUsers = allUsersStr ? JSON.parse(allUsersStr) : {};
      allUsers[updated.id] = updated; 
      localStorage.setItem('eigo_kyun_all_users', JSON.stringify(allUsers));
    } catch (e) {
      console.error('Failed to save user data', e);
    }
  };

  const navTo = async (page: AppState) => {
    await initContext();
    playSE('click');
    setCurrentPage(page);
  };

  const handleLogin = async () => {
    if (!loginId) return;
    await initContext();
    playSE('click');
    
    let allUsers: Record<string, any> = {};
    try {
      const stored = localStorage.getItem('eigo_kyun_all_users');
      allUsers = stored ? JSON.parse(stored) : {};
    } catch (e) {
      allUsers = {};
    }

    const existing = allUsers[loginId];
    
    if (existing) {
      const validatedUser: ExtendedUserProfile = {
        id: existing.id || loginId,
        nickname: existing.nickname || 'Guest',
        points: typeof existing.points === 'number' ? existing.points : 0,
        totalPoints: typeof existing.totalPoints === 'number' ? existing.totalPoints : 0,
        loginDays: existing.loginDays || 1,
        lastLoginDate: existing.lastLoginDate || new Date().toISOString().split('T')[0],
        charType: existing.charType === 'CAT' ? 'CAT' : 'DOG',
        equippedRewardId: existing.equippedRewardId || null,
        unlockedRewards: Array.isArray(existing.unlockedRewards) ? existing.unlockedRewards : [],
        mastery: existing.mastery || {}
      };
      setUser(validatedUser);
      const savedHistory = localStorage.getItem(`eigo_kyun_history_${loginId}`);
      setTestHistory(savedHistory ? JSON.parse(savedHistory) : []);
      setCurrentPage('HOME');
      startBGM();
    } else {
      if (!isFirstLogin) {
        setIsFirstLogin(true);
      } else if (nickname.trim()) {
        const newUser: ExtendedUserProfile = { 
          id: loginId, 
          nickname: nickname.trim(), 
          points: 200, 
          totalPoints: 200, 
          loginDays: 1, 
          lastLoginDate: new Date().toISOString().split('T')[0], 
          unlockedRewards: [],
          equippedRewardId: null, 
          charType: charSelection,
          mastery: {}
        };
        saveUserData(newUser);
        setTestHistory([]);
        localStorage.setItem(`eigo_kyun_history_${loginId}`, JSON.stringify([]));
        setCurrentPage('HOME');
        startBGM();
      }
    }
  };

  const startQuiz = async (mode: StudyMode) => {
    if (!user) return;
    await initContext();
    playSE('click');
    
    const stageStartIndex = (selectedStage - 1) * 50;
    const stageWords = WORD_BANK.slice(stageStartIndex, stageStartIndex + 50);
    
    const sortedWords = [...stageWords].sort((a, b) => {
      const masteryA = user.mastery[a.id] || 0;
      const masteryB = user.mastery[b.id] || 0;
      if (masteryA !== masteryB) return masteryA - masteryB;
      return Math.random() - 0.5; 
    });

    const selectedWordsForQuiz = sortedWords.slice(0, 10);
    
    setQuizQuestions(generateQuizOffline(selectedWordsForQuiz, mode, WORD_BANK));
    setCurrentQuizIdx(0); 
    setCorrectCount(0); 
    setLastAnswerFeedback(null); 
    setStudyMode(mode);
    setSessionCorrectIds([]); 
    setNewlyMasteredCount(0);
    setCurrentPage('QUIZ');
  };

  const getEquippedReward = () => {
    if (!user) return null;
    return REWARDS.find(r => r.id === user.equippedRewardId) || null;
  };

  const computedRanking = useMemo(() => {
    let allUsersMap: Record<string, any> = {};
    try {
      const stored = localStorage.getItem('eigo_kyun_all_users');
      allUsersMap = stored ? JSON.parse(stored) : {};
    } catch (e) { return []; }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const threshold = rankingPeriod === 'DAY' ? dayMs : rankingPeriod === 'WEEK' ? dayMs * 7 : dayMs * 30;

    const rankings = Object.values(allUsersMap).map((u: any) => {
      let periodPoints = 0;
      try {
        const historyStr = localStorage.getItem(`eigo_kyun_history_${u.id}`);
        if (historyStr) {
          const history: TestResult[] = JSON.parse(historyStr);
          periodPoints = history
            .filter(h => (now - h.timestamp) < threshold)
            .reduce((sum, h) => sum + h.score, 0);
        }
      } catch (e) {}

      return {
        id: u.id,
        nickname: u.nickname,
        displayPoints: periodPoints,
        charType: u.charType
      };
    });

    return rankings.sort((a, b) => b.displayPoints - a.displayPoints).slice(0, 20);
  }, [rankingPeriod, currentPage]);

  const getStageProgress = (stageNum: number) => {
    if (!user) return 0;
    const stageStartIndex = (stageNum - 1) * 50;
    const stageWords = WORD_BANK.slice(stageStartIndex, stageStartIndex + 50);
    const masteredCount = stageWords.filter(w => (user.mastery[w.id] || 0) >= 3).length;
    return (masteredCount / 50) * 100;
  };

  const renderContent = () => {
    if (currentPage === 'LOGIN') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#f5f1ef] page-enter overflow-hidden text-center">
          <div className="w-full max-w-sm text-center flex flex-col items-center">
            <div className="mb-6 flex justify-center w-full min-h-[140px]">
              <img 
                src="/assets/common/title_pair.png" 
                alt="Eigo-Kyun Partners" 
                className="w-full h-auto max-w-[280px] object-contain block floating-slow"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) parent.innerHTML = '<div class="text-6xl py-10">🐶🐱</div>';
                }}
              />
            </div>
            
            <h1 className="text-4xl font-black text-zinc-800 mb-1 italic tracking-tighter">Eigo★Kyun!</h1>
            <p className="text-[10px] font-black text-pink-700 tracking-[0.4em] mb-10 uppercase leading-none">English is Magic</p>
            
            <div className="space-y-4 w-full">
              <input type="text" inputMode="numeric" placeholder="8桁のIDを入力" maxLength={8} className="w-full bg-white border-2 border-zinc-300 p-4 rounded-3xl text-center text-xl font-bold focus:border-pink-400 outline-none shadow-sm transition-all text-zinc-800" value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
              
              {isFirstLogin && (
                <div className="space-y-4 animate-fadeIn">
                  <input type="text" placeholder="なまえを教えてね！" className="w-full bg-white border-2 border-zinc-300 p-4 rounded-3xl text-center font-bold focus:border-pink-400 outline-none shadow-sm transition-all text-zinc-800" value={nickname} onChange={e => setNickname(e.target.value)} />
                  <p className="text-[11px] font-black text-zinc-400 tracking-widest uppercase mt-2">Partner Choose</p>
                  <div className="flex gap-4">
                    <button onClick={() => setCharSelection('DOG')} className={`flex-1 p-5 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center ${charSelection === 'DOG' ? 'bg-white border-pink-500 shadow-xl scale-105' : 'bg-zinc-100 border-zinc-200 opacity-60'}`}>
                      <div className="text-3xl mb-1">🐶</div>
                      <div className="text-[10px] font-black tracking-widest uppercase">Dog</div>
                    </button>
                    <button onClick={() => setCharSelection('CAT')} className={`flex-1 p-5 rounded-[2rem] border-4 transition-all flex flex-col items-center justify-center ${charSelection === 'CAT' ? 'bg-white border-pink-500 shadow-xl scale-105' : 'bg-zinc-100 border-zinc-200 opacity-60'}`}>
                      <div className="text-3xl mb-1">🐱</div>
                      <div className="text-[10px] font-black tracking-widest uppercase">Cat</div>
                    </button>
                  </div>
                </div>
              )}
              
              <button onClick={handleLogin} className="w-full bg-zinc-800 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all mt-4">
                {isFirstLogin ? '勉強をはじめる！' : 'ログイン'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!user) return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1ef]">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-zinc-400 italic">Connecting...</p>
         </div>
      </div>
    );

    switch (currentPage) {
      case 'HOME':
        const equippedR = getEquippedReward();
        return (
          <div className="p-6 pt-12 space-y-12 page-enter pb-32 text-center flex flex-col items-center">
            <div className="floating-slow mb-10">
               <TamaRenderer 
                  charType={user.charType}
                  accessoryPath={equippedR?.imagePath}
                  scale={1.5} 
                  emotion="happy" 
               />
            </div>
            <div className="bg-white p-7 rounded-[2.5rem] border-[4px] border-zinc-300 shadow-2xl max-w-[280px] w-full relative">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-l-[4px] border-t-[4px] border-zinc-300 rotate-45"></div>
               <p className="text-zinc-800 font-bold text-center text-base leading-relaxed">"{user.nickname}、{kyunMsg('お帰り！')}"</p>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
               <button onClick={() => navTo('LEARN')} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-[3px] border-zinc-200 flex flex-col items-center gap-2 active:scale-95 transition-all">
                 <span className="text-4xl">📖</span><span className="text-[11px] font-black text-zinc-600 tracking-widest uppercase">Learn</span>
               </button>
               <button onClick={() => navTo('SHOP')} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-[3px] border-zinc-200 flex flex-col items-center gap-2 active:scale-95 transition-all">
                 <span className="text-4xl">🎁</span><span className="text-[11px] font-black text-zinc-600 tracking-widest uppercase">Shop</span>
               </button>
            </div>
          </div>
        );
      case 'LEARN':
        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32">
            <h2 className="text-3xl font-black text-zinc-800 italic">Stages</h2>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 12 }).map((_, i) => {
                const stageNum = i + 1;
                const progress = getStageProgress(stageNum);
                return (
                  <button key={i} onClick={() => { setSelectedStage(stageNum); navTo('TEST'); }} className="p-6 bg-white rounded-[2.5rem] shadow-sm border-[4px] border-zinc-200 transition-all flex flex-col items-center gap-3 active:scale-95 relative overflow-hidden group">
                    <div className="text-4xl group-hover:scale-110 transition-transform">🐾</div>
                    <div className="text-center">
                      <p className="text-xl font-black text-zinc-800 leading-none">Stage {stageNum}</p>
                      <p className="text-[9px] font-black text-pink-500 mt-1 uppercase tracking-tighter">{progress === 100 ? 'Complete!' : `${Math.floor(progress)}% Mastery`}</p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-zinc-100">
                      <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'TEST':
        const stageWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 50);
        return (
          <div className="p-4 pt-10 space-y-5 page-enter pb-32 flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-sm mb-2">
              <button onClick={() => navTo('LEARN')} className="text-zinc-700 font-black text-[10px] bg-white px-5 py-2.5 rounded-full border-[3px] border-zinc-300 shadow-sm active:bg-zinc-100 uppercase tracking-widest">Back</button>
              <h2 className="text-xl font-black text-zinc-800 italic">Stage {selectedStage}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-2">
              <button onClick={() => startQuiz('EN_TO_JP')} className="bg-pink-600 text-white py-4 rounded-[1.8rem] font-black text-sm shadow-lg active:scale-95">英和クイズ</button>
              <button onClick={() => startQuiz('JP_TO_EN')} className="bg-zinc-800 text-white py-4 rounded-[1.8rem] font-black text-sm shadow-lg active:scale-95">和英クイズ</button>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] w-full max-w-sm pr-1 custom-scrollbar">
              {stageWords.map((w, idx) => {
                const masteryLevel = user.mastery[w.id] || 0;
                // 習得度に応じて背景色を変える
                const bgClass = masteryLevel >= 3 ? 'bg-emerald-50 border-emerald-100' : masteryLevel >= 1 ? 'bg-yellow-50 border-yellow-100' : 'bg-white border-zinc-100';
                return (
                  <div key={w.id} className={`px-5 py-5 rounded-[1.8rem] flex items-center justify-between shadow-sm border-[4px] transition-colors ${bgClass}`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-center w-10 flex-shrink-0">
                        <span className="text-[10px] font-black text-pink-600 leading-none mb-1">No.{((selectedStage-1)*50) + idx + 1}</span>
                        <MasteryStars level={masteryLevel} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-black text-zinc-800 leading-none mb-1.5 truncate">{w.word}</p>
                        <p className="text-[10px] font-bold text-zinc-500 italic truncate">{w.meaning}</p>
                      </div>
                    </div>
                    <button onClick={() => speakMessage(w.word)} className="bg-white/60 p-3 rounded-2xl text-xl flex-shrink-0 ml-2 active:bg-white shadow-sm">🔊</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'QUIZ':
        const q = quizQuestions[currentQuizIdx];
        const equippedRQuiz = getEquippedReward();
        return (
          <div className="p-4 pt-4 min-h-screen page-enter bg-[#f5f1ef] flex flex-col items-center text-center">
            {lastAnswerFeedback && <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none animate-result-pop"><span className={`text-[12rem] font-black drop-shadow-2xl ${lastAnswerFeedback === 'CORRECT' ? 'text-emerald-600' : 'text-rose-600'}`}>{lastAnswerFeedback === 'CORRECT' ? '○' : '×'}</span></div>}
            <div className="mb-4">
              <TamaRenderer 
                charType={user.charType}
                accessoryPath={equippedRQuiz?.imagePath}
                scale={1.0} 
                emotion={lastAnswerFeedback === 'WRONG' ? 'sad' : 'normal'} 
              />
            </div>
            <div className="w-full max-w-sm space-y-4 px-2">
              <div className="text-center bg-white p-6 rounded-[2.5rem] border-[5px] border-zinc-400 shadow-xl relative min-h-[140px] flex flex-col justify-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-5 py-2 rounded-full font-black tracking-widest shadow-lg">{currentQuizIdx + 1} / 10</div>
                <h3 className="text-2xl font-black text-zinc-800 mt-2 break-words">{q?.question}</h3>
              </div>
              <div className="grid gap-3">
                {q?.options.map((opt, i) => (
                  <button key={i} onClick={() => {
                    if (lastAnswerFeedback) return;
                    const isCorrect = opt === q.correctAnswer;
                    playSE(isCorrect ? 'correct' : 'wrong');
                    setLastAnswerFeedback(isCorrect ? 'CORRECT' : 'WRONG');
                    
                    if (isCorrect) {
                      setCorrectCount(c => c + 1);
                      const targetWord = WORD_BANK.find(w => 
                        studyMode === 'EN_TO_JP' ? w.meaning === q.correctAnswer : w.word === q.correctAnswer
                      );
                      if (targetWord) {
                        setSessionCorrectIds(prev => [...prev, targetWord.id]);
                      }
                    }

                    setTimeout(() => {
                      if (currentQuizIdx + 1 < 10) { setCurrentQuizIdx(idx => idx + 1); setLastAnswerFeedback(null); }
                      else {
                        const finalScore = isCorrect ? correctCount + 1 : correctCount;
                        const newMastery = { ...user.mastery };
                        let masteredInThisSession = 0;

                        sessionCorrectIds.concat(isCorrect ? [WORD_BANK.find(w => studyMode === 'EN_TO_JP' ? w.meaning === q.correctAnswer : w.word === q.correctAnswer)?.id || ''] : [])
                          .filter(id => id !== '')
                          .forEach(id => {
                            const oldLevel = newMastery[id] || 0;
                            newMastery[id] = Math.min(oldLevel + 1, 3);
                            if (oldLevel < 3 && newMastery[id] === 3) masteredInThisSession++;
                          });

                        setNewlyMasteredCount(masteredInThisSession);
                        const updated = { ...user, points: user.points + finalScore, totalPoints: user.totalPoints + finalScore, mastery: newMastery };
                        saveUserData(updated);
                        const updatedHistory = [{ score: finalScore, total: 10, date: new Date().toLocaleDateString(), timestamp: Date.now(), category: `Stage ${selectedStage}` }, ...testHistory].slice(0, 30);
                        setTestHistory(updatedHistory);
                        localStorage.setItem(`eigo_kyun_history_${user.id}`, JSON.stringify(updatedHistory));
                        setCurrentPage('REVIEW');
                      }
                    }, isCorrect ? 600 : 1500);
                  }} disabled={!!lastAnswerFeedback} className={`bg-white p-5 rounded-[2rem] border-[4px] text-center font-black text-xl shadow-md transition-all ${lastAnswerFeedback ? (opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-900 scale-[1.05]' : 'opacity-20 grayscale border-zinc-200') : 'border-zinc-300 active:scale-95 break-words'}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'SHOP':
        return (
          <div className="p-6 pt-10 space-y-8 page-enter pb-48 flex flex-col items-center">
             <div className="flex justify-between items-end w-full max-w-sm px-2">
              <h2 className="text-3xl font-black text-zinc-800 italic">Shop & Settings</h2>
              <div className="bg-pink-600 text-white px-5 py-2.5 rounded-full font-black text-base shadow-lg">{user.points} PT</div>
            </div>

            <div className="w-full max-w-sm bg-white p-6 rounded-[2.5rem] border-[4px] border-zinc-100 shadow-sm space-y-4">
              <p className="text-[11px] font-black text-zinc-400 tracking-widest uppercase text-center">Switch Partner</p>
              <div className="flex gap-4">
                <button onClick={() => saveUserData({...user, charType: 'DOG'})} className={`flex-1 p-4 rounded-[1.8rem] border-4 transition-all flex items-center justify-center gap-2 ${user.charType === 'DOG' ? 'bg-pink-50 border-pink-500 shadow-md' : 'bg-zinc-50 border-zinc-100 grayscale opacity-60'}`}><span className="text-2xl">🐶</span><span className="font-black text-xs uppercase">Dog</span></button>
                <button onClick={() => saveUserData({...user, charType: 'CAT'})} className={`flex-1 p-4 rounded-[1.8rem] border-4 transition-all flex items-center justify-center gap-2 ${user.charType === 'CAT' ? 'bg-pink-50 border-pink-500 shadow-md' : 'bg-zinc-50 border-zinc-100 grayscale opacity-60'}`}><span className="text-2xl">🐱</span><span className="font-black text-xs uppercase">Cat</span></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
              <p className="text-[11px] font-black text-zinc-400 tracking-widest uppercase text-center mt-4">Rewards</p>
              {REWARDS.map(r => (
                <div key={r.id} className="bg-white p-5 rounded-[2.5rem] border-[4px] flex items-center justify-between border-zinc-100">
                  <div className="flex items-center gap-4"><div className="text-3xl">{r.emoji}</div><div className="text-left"><p className="text-xl font-black text-zinc-800">{r.name}</p><p className="text-[10px] font-bold text-zinc-500 italic">"{kyunMsg(r.description)}"</p></div></div>
                  {user.unlockedRewards.includes(r.id) ? (user.equippedRewardId === r.id ? (<span className="bg-pink-50 text-pink-600 px-4 py-2 rounded-2xl font-black text-[10px]">装備中</span>) : (<button onClick={() => saveUserData({...user, equippedRewardId: r.id})} className="bg-zinc-100 px-4 py-2 rounded-2xl font-black text-[10px]">着替える</button>)) : (<button onClick={() => { if (user.points >= r.cost) { playSE('point'); saveUserData({...user, points: user.points - r.cost, unlockedRewards: [...user.unlockedRewards, r.id], equippedRewardId: r.id}); } else { playSE('wrong'); } }} className="bg-zinc-800 text-white px-4 py-2 rounded-2xl font-black text-[10px]">{r.cost}P</button>)}
                </div>
              ))}
              <button onClick={() => saveUserData({...user, equippedRewardId: null})} className="text-[10px] font-black text-zinc-400 mt-4 underline italic">デフォルトに戻す</button>
            </div>
          </div>
        );
      case 'REVIEW':
        const lastResult = testHistory[0];
        const equippedRReview = getEquippedReward();
        let reviewEmotion: 'happy' | 'sad' | 'normal' = 'normal';
        let reviewMessage = kyunMsg("お疲れ様！次はもっといけるはず！");
        if (lastResult) {
          if (lastResult.score === 10) { reviewEmotion = 'happy'; reviewMessage = kyunMsg("パーフェクト！きみは天才！"); }
          else if (lastResult.score <= 7) { reviewEmotion = 'sad'; reviewMessage = kyunMsg("少し難しかったかな？一緒に頑張るニャ！"); }
        }
        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32 flex flex-col items-center text-center">
            <div className="floating-slow mb-10">
               <TamaRenderer charType={user.charType} accessoryPath={equippedRReview?.imagePath} scale={1.5} emotion={reviewEmotion} />
            </div>
            <div className="bg-white p-7 rounded-[2.5rem] border-[4px] border-zinc-300 shadow-2xl max-w-[280px] w-full relative mb-8">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-l-[4px] border-t-[4px] border-zinc-300 rotate-45"></div>
               <p className="text-zinc-800 font-bold text-center text-base leading-relaxed">"{reviewMessage}"</p>
               {newlyMasteredCount > 0 && (
                 <div className="mt-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-2xl text-xs font-black animate-bounce">
                   ✨ {newlyMasteredCount}個の単語をマスターしたよ！ ★★★
                 </div>
               )}
            </div>
            <h2 className="text-3xl font-black text-zinc-800 italic text-center">History</h2>
            <div className="bg-zinc-800 p-10 rounded-[3rem] text-center shadow-2xl border-[6px] border-zinc-700 w-full max-w-sm mb-12">
              <p className="text-[11px] font-black text-pink-400 tracking-widest mb-3 opacity-95 uppercase">Current Points</p>
              <p className="text-6xl font-black text-white leading-none">{user.points}<span className="text-sm ml-2 text-zinc-500">PT</span></p>
            </div>
            <div className="space-y-4 w-full max-w-sm">
              {testHistory.length > 0 ? testHistory.slice(0, 10).map((h, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl border-l-[8px] border-l-pink-600 border-2 border-zinc-100">
                  <div className="min-w-0 flex-1 text-left">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{h.category}</span>
                    <p className="text-base font-bold text-zinc-800 mt-1 truncate">{h.date}</p>
                  </div>
                  <p className="text-3xl font-black text-zinc-800 ml-4 flex-shrink-0">{h.score}<span className="text-xs text-zinc-300 ml-1">/10</span></p>
                </div>
              )) : <div className="text-center py-10 text-zinc-400 font-black italic">記録がまだない。</div>}
            </div>
          </div>
        );
      case 'RANKING':
        const myRankInfo = computedRanking.find(r => r.id === user.id);
        const myRankIndex = computedRanking.findIndex(r => r.id === user.id);
        return (
          <div className="p-6 pt-12 space-y-8 page-enter pb-32 flex flex-col items-center text-center">
            <h2 className="text-4xl font-black text-zinc-800 italic mb-2 tracking-tighter">Ranking</h2>
            <div className="flex bg-white/50 p-1.5 rounded-[2rem] border-2 border-zinc-200 w-full max-w-sm mb-2 shadow-sm">
              {(['DAY', 'WEEK', 'MONTH'] as const).map(p => (
                <button key={p} onClick={() => { setRankingPeriod(p); playSE('click'); }} className={`flex-1 py-3 rounded-[1.5rem] font-black text-[11px] tracking-widest transition-all ${rankingPeriod === p ? 'bg-pink-600 text-white shadow-lg scale-[1.03]' : 'text-zinc-400 hover:text-zinc-600'}`}>{p === 'DAY' ? '今日' : p === 'WEEK' ? '今週' : '今月'}</button>
              ))}
            </div>
            {myRankInfo && (
               <div className="w-full max-w-sm bg-zinc-800 text-white p-4 rounded-3xl mb-4 flex items-center justify-between px-6 shadow-xl border-b-4 border-zinc-950 animate-fadeIn">
                 <div className="text-left"><p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Your Rank</p><p className="text-2xl font-black italic">No.{myRankIndex + 1}</p></div>
                 <div className="text-right"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Points</p><p className="text-2xl font-black text-white">{myRankInfo.displayPoints}<span className="text-xs ml-1">PT</span></p></div>
               </div>
            )}
            <div className="space-y-4 w-full max-w-sm">
              {computedRanking.length > 0 ? computedRanking.map((u, i) => (
                <div key={u.id} className={`bg-white p-5 rounded-[2.2rem] flex items-center gap-4 border-[4px] transition-all relative overflow-hidden ${u.id === user.id ? 'border-pink-500 shadow-xl scale-[1.02] z-10' : 'border-zinc-100 shadow-sm opacity-90'}`}>
                  {u.id === user.id && <div className="absolute top-0 right-0 bg-pink-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">You</div>}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-sm ${i === 0 ? 'bg-yellow-400 text-white ring-4 ring-yellow-100' : i === 1 ? 'bg-zinc-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{i + 1}</div>
                  <div className="flex items-center justify-center w-10 h-10 bg-zinc-50 rounded-xl text-xl flex-shrink-0 grayscale-[0.2]">{u.charType === 'CAT' ? '🐱' : '🐶'}</div>
                  <div className="flex-1 min-w-0 text-left"><p className={`text-lg font-black truncate ${u.id === user.id ? 'text-zinc-800' : 'text-zinc-600'}`}>{u.nickname}</p></div>
                  <p className={`text-2xl font-black flex-shrink-0 flex items-baseline ${u.id === user.id ? 'text-pink-600' : 'text-zinc-500'}`}>{u.displayPoints}<span className="text-[10px] ml-1 opacity-40">PT</span></p>
                </div>
              )) : (<div className="bg-white/50 p-12 rounded-[2.5rem] border-4 border-dashed border-zinc-200 flex flex-col items-center gap-4"><span className="text-5xl opacity-40">🏁</span><p className="font-black text-zinc-400 italic">まだ記録がないニャ！</p></div>)}
            </div>
            <p className="text-[10px] font-bold text-zinc-400 italic mt-8 max-w-[280px] leading-relaxed">※ポイントはテスト終了時に自動更新されるワン！<br/>{rankingPeriod === 'DAY' ? '毎日夜中にリセットされるよ！' : rankingPeriod === 'WEEK' ? '直近7日間の合計で競おう！' : '直近30日間の英語マスターは誰だ！？'}</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen relative bg-[#f5f1ef] overflow-x-hidden">
      {currentPage !== 'LOGIN' && user && (
        <header className="px-5 py-5 flex justify-between items-center sticky top-0 z-40 bg-white/95 backdrop-blur-2xl border-b-2 border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer active:scale-95 transition-all" onClick={() => navTo('HOME')}>
            <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-zinc-700">{user.charType === 'CAT' ? '🐱' : '🐶'}</div>
            <div className="flex items-baseline gap-2 overflow-hidden"><h1 className="text-[9px] font-black text-zinc-800 tracking-[0.25em] uppercase italic leading-none hidden sm:block">EIGO★KY!</h1><span className="text-[11px] font-black text-pink-600 bg-pink-50 px-2 py-1 rounded-lg border border-pink-100 truncate max-w-[100px]">{user.nickname}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await initContext(); isBGMActive ? stopBGM() : startBGM(); }} className={`px-4 py-2.5 rounded-full flex items-center justify-center text-[10px] shadow-lg border-2 font-black tracking-widest transition-all ${isBGMActive ? 'bg-pink-100 border-pink-400 text-pink-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>BGM {isBGMActive ? 'ON' : 'OFF'}</button>
            <button onClick={() => navTo('RANKING')} className={`px-4 py-2.5 rounded-full text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl border-b-4 transition-all active:translate-y-0.5 ${currentPage === 'RANKING' ? 'bg-zinc-800 border-zinc-950 scale-95' : 'bg-pink-600 border-pink-800'}`}>Rank</button>
          </div>
        </header>
      )}
      <main className="max-w-md mx-auto w-full">{renderContent()}</main>
      {currentPage !== 'LOGIN' && user && <Navigation current={currentPage} setPage={navTo} />}
      <style>{`
        .floating-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
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
