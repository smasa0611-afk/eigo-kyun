
import React, { useState, useEffect } from 'react';
import { UserProfile, AppState, WordCard, QuizQuestion, StudyMode, TestResult, Reward } from './types';
import { initAudio, speakMessage, generateQuizOffline } from './services/geminiService';
import { WORD_BANK } from './constants/wordBank';
import { CAT_MESSAGES, getSpecialDayMessage } from './constants/catMessages';
import Navigation from './components/Navigation.tsx';

// 報酬の定義
const REWARDS: (Reward & { type: string; aura: string; color: string })[] = [
  { id: 'r1', name: 'ひのたま', cost: 50, emoji: '🔥', type: 'fire', aura: 'from-orange-400 to-rose-500', color: '#ffeadb', description: 'やる気がメラメラだニャ！' },
  { id: 'r2', name: 'リボンたま', cost: 100, emoji: '🎀', type: 'ribbon', aura: 'from-pink-300 to-rose-400', color: '#fff0f5', description: 'おしゃれ番長だニャ。' },
  { id: 'r3', name: 'おすしたま', cost: 150, emoji: '🍣', type: 'sushi', aura: 'from-slate-100 to-rose-50', color: '#ffffff', description: '鮮度バツグンの正解ニャ。' },
  { id: 'r4', name: 'ドヤ・メガネたま', cost: 200, emoji: '👓', type: 'glasses', aura: 'from-indigo-400 to-blue-600', color: '#eef2ff', description: '全知全能の風格だニャ。' },
  { id: 'r5', name: 'あめふりたま', cost: 300, emoji: '☔', type: 'rain', aura: 'from-cyan-300 to-blue-500', color: '#e0f7fa', description: '雨音は英語の調べだニャ。' },
  { id: 'r6', name: 'たんていたま', cost: 400, emoji: '🔍', type: 'detective', aura: 'from-amber-600 to-amber-900', color: '#fef3c7', description: '真実は英語の中に…ニャ！' },
  { id: 'r7', name: 'てんしたま', cost: 500, emoji: '👼', type: 'angel', aura: 'from-yellow-100 to-sky-100', color: '#fffbeb', description: 'きみの努力を導くニャ。' },
  { id: 'r12', name: '王様たま', cost: 1000, emoji: '👑', type: 'king', aura: 'from-amber-400 to-orange-600', color: '#fff9db', description: '英語界のレジェンドだニャ。' },
];

const TamaRenderer: React.FC<{ type?: string; scale?: number; emotion?: 'happy' | 'proud' | 'normal'; color?: string }> = ({ type = 'normal', scale = 1, emotion = 'normal', color = '#ffffff' }) => {
  return (
    <div className="relative inline-block" style={{ transform: `scale(${scale})`, width: '220px', height: '220px' }}>
      {/* 影 */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/5 rounded-[100%] blur-xl"></div>
      
      {/* しっぽ */}
      <div className="absolute bottom-10 right-2 w-16 h-20 border-[12px] border-[#f0f0f0] rounded-full border-t-transparent border-l-transparent rotate-[30deg] animate-tail" style={{ borderColor: `transparent transparent ${color} ${color}` }}></div>

      {/* メインボディ */}
      <div className="absolute inset-4 rounded-[45%_45%_40%_40%] shadow-[inset_-8px_-12px_24px_rgba(0,0,0,0.05),0_20px_40px_rgba(0,0,0,0.05)] border border-white/50 overflow-hidden transition-colors duration-500" style={{ backgroundColor: color }}>
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-40 h-40 bg-white/30 rounded-full blur-2xl"></div>
      </div>
      
      {/* 耳：ちゃんと猫の耳に */}
      <div className="absolute top-2 left-6 w-16 h-20 bg-white rounded-[80%_20%_20%_20%] -rotate-[25deg] shadow-sm" style={{ backgroundColor: color }}>
        <div className="absolute inset-3 bg-pink-100/50 rounded-[80%_20%_20%_20%]"></div>
      </div>
      <div className="absolute top-2 right-6 w-16 h-20 bg-white rounded-[20%_80%_20%_20%] rotate-[25deg] shadow-sm" style={{ backgroundColor: color }}>
        <div className="absolute inset-3 bg-pink-100/50 rounded-[20%_80%_20%_20%]"></div>
      </div>

      {/* 顔 */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-full px-12 flex flex-col items-center z-10">
        <div className="flex justify-between w-full mb-3">
          <div className={`w-4 h-4 bg-[#2D3436] rounded-full relative ${emotion === 'happy' ? 'h-2 mt-2 rounded-t-full bg-transparent border-t-4 border-[#2D3436]' : ''}`}>
             {emotion !== 'happy' && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>}
          </div>
          <div className={`w-4 h-4 bg-[#2D3436] rounded-full relative ${emotion === 'happy' ? 'h-2 mt-2 rounded-t-full bg-transparent border-t-4 border-[#2D3436]' : ''}`}>
             {emotion !== 'happy' && <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>}
          </div>
        </div>
        
        {/* ヒゲ */}
        <div className="absolute top-4 -left-2 flex flex-col gap-1.5">
          <div className="w-8 h-[2px] bg-zinc-300 -rotate-6"></div>
          <div className="w-10 h-[2px] bg-zinc-300"></div>
        </div>
        <div className="absolute top-4 -right-2 flex flex-col gap-1.5">
          <div className="w-8 h-[2px] bg-zinc-300 rotate-6"></div>
          <div className="w-10 h-[2px] bg-zinc-300"></div>
        </div>

        <div className="relative -mt-1 flex items-center">
          <div className="w-5 h-5 border-b-[3px] border-[#2D3436] rounded-full -mr-0.5 opacity-80"></div>
          <div className="w-5 h-5 border-b-[3px] border-[#2D3436] rounded-full opacity-80"></div>
        </div>
      </div>

      {/* アイテム個別描画 */}
      {type === 'glasses' && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 w-[110%] flex justify-center items-center gap-1">
            <div className="w-16 h-16 border-[4px] border-[#1e272e] rounded-full bg-blue-100/20 backdrop-blur-sm relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-white/10 rotate-45"></div>
            </div>
            <div className="w-4 h-1.5 bg-[#1e272e] rounded-full mt-2"></div>
            <div className="w-16 h-16 border-[4px] border-[#1e272e] rounded-full bg-blue-100/20 backdrop-blur-sm relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-white/10 rotate-45"></div>
            </div>
          </div>
          <div className="absolute bottom-6 right-0 w-20 h-24 bg-white border-[4px] border-[#1e272e] rounded-lg shadow-xl rotate-12 flex flex-col p-2 gap-1 overflow-hidden">
             <div className="w-full h-2 bg-blue-100 rounded-full"></div>
             <div className="w-full h-2 bg-zinc-50 rounded-full"></div>
             <div className="w-1/2 h-2 bg-zinc-50 rounded-full"></div>
             <div className="mt-auto self-end w-6 h-6 bg-[#FF7EB9] rounded-full flex items-center justify-center text-[8px] text-white font-black italic shadow-inner">Ky!</div>
          </div>
        </div>
      )}

      {type === 'fire' && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl animate-bounce">🔥</div>}
      {type === 'ribbon' && <div className="absolute top-2 right-4 w-12 h-12 bg-rose-400 rounded-lg shadow-lg flex items-center justify-center text-3xl rotate-12 border-2 border-white">🎀</div>}
      {type === 'sushi' && <div className="absolute -bottom-2 right-2 w-20 h-12 bg-white rounded-lg shadow-lg border-2 border-orange-50 flex items-center justify-center text-4xl">🍣</div>}
      {type === 'rain' && <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-8xl opacity-80">☔</div>}
      {type === 'king' && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="text-8xl animate-pulse">👑</div>
          <div className="w-32 h-40 bg-rose-600/10 absolute top-20 rounded-full blur-3xl -z-10"></div>
        </div>
      )}
      {type === 'detective' && <div className="absolute -top-6 left-6 w-28 h-10 bg-amber-900 rounded-t-3xl border-b-8 border-amber-950 -rotate-6 shadow-xl"></div>}
      {type === 'angel' && <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-28 h-4 bg-yellow-200/60 rounded-full blur-sm border border-yellow-100"></div>}

      {/* 手 */}
      <div className="absolute bottom-12 left-8 w-8 h-8 bg-white rounded-full border-b-4 border-zinc-100 shadow-sm z-10" style={{ backgroundColor: color }}></div>
      {type !== 'glasses' && <div className="absolute bottom-12 right-8 w-8 h-8 bg-white rounded-full border-b-4 border-zinc-100 shadow-sm z-10" style={{ backgroundColor: color }}></div>}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [characterMessage, setCharacterMessage] = useState('こんにちは！一緒に楽しく学ぼうニャ！');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [currentMissionStage, setCurrentMissionStage] = useState(1);

  useEffect(() => {
    const savedHistory = localStorage.getItem('eigo_kyun_history');
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setTestHistory(history);
      const maxCleared = history
        .filter((h: TestResult) => h.score >= 8)
        .map((h: TestResult) => parseInt(h.category.replace('Stage ', '')))
        .reduce((max: number, current: number) => Math.max(max, current), 0);
      setCurrentMissionStage(maxCleared + 1);
    }
  }, [currentPage]);

  const saveUserData = (updated: UserProfile) => {
    setUser(updated);
    const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
    allUsers[updated.id] = updated;
    localStorage.setItem('eigo_kyun_all_users', JSON.stringify(allUsers));
  };

  const buyReward = (reward: Reward) => {
    if (!user) return;
    if (user.points < reward.cost) {
      setCharacterMessage('ポイントが足りないニャ…もっと勉強するニャ！');
      return;
    }
    const updatedUser: UserProfile = {
      ...user,
      points: user.points - reward.cost,
      unlockedRewards: [...user.unlockedRewards, reward.id]
    };
    saveUserData(updatedUser);
    setCharacterMessage(`${reward.name}をゲット！似合ってるかニャ？`);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'LOGIN':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fdfaf9] page-enter">
            <div className="w-full max-w-sm text-center">
              <div className="mb-10 scale-110">
                 <TamaRenderer scale={1.2} emotion="happy" />
              </div>
              <h1 className="text-4xl font-black text-zinc-900 mb-2 tracking-tighter">Eigo★Kyun!</h1>
              <p className="text-xs font-bold text-[#FFB6C1] uppercase tracking-[0.4em] mb-12">New Gen English Lab</p>
              <div className="space-y-4">
                <input type="text" inputMode="numeric" placeholder="8桁のIDを入力" maxLength={8} className="w-full bg-white border-2 border-zinc-100 p-5 rounded-3xl text-center text-xl font-bold text-zinc-800 outline-none focus:border-[#FF7EB9] transition-all shadow-sm" value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
                {isFirstLogin && <input type="text" placeholder="なまえを教えてニャ" className="w-full bg-white border-2 border-zinc-100 p-5 rounded-3xl text-center text-lg font-bold text-zinc-800 outline-none focus:border-blue-200 shadow-sm" value={nickname} onChange={e => setNickname(e.target.value)} />}
                <button onClick={() => {
                  initAudio();
                  const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
                  if (isFirstLogin) {
                    if (!nickname) return;
                    const newUser: UserProfile = { id: loginId, nickname, points: 200, totalPoints: 200, loginDays: 1, lastLoginDate: new Date().toISOString().split('T')[0], unlockedRewards: [] };
                    saveUserData(newUser);
                    setCurrentPage('HOME');
                  } else if (allUsers[loginId]) {
                    setUser(allUsers[loginId]);
                    setCurrentPage('HOME');
                  } else {
                    setIsFirstLogin(true);
                  }
                }} className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">START!</button>
              </div>
            </div>
          </div>
        );
      case 'HOME':
        const curReward = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-8 pt-12 space-y-12 page-enter pb-32">
            <div className="flex flex-col items-center">
               <div className="floating-slow mb-8">
                 <TamaRenderer type={curReward?.type} color={curReward?.color} scale={1.7} emotion="happy" />
               </div>
               <div className="glass p-6 rounded-[2.5rem] border border-white shadow-xl max-w-[280px] w-full relative">
                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-l border-t border-zinc-50 rotate-45"></div>
                 <p className="text-zinc-800 font-bold text-lg text-center leading-relaxed italic">"{characterMessage}"</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setCurrentPage('LEARN')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-2 group active:scale-95 transition-all">
                 <span className="text-4xl group-hover:scale-110 transition-transform">📚</span>
                 <span className="text-xs font-black text-zinc-400">LEARN</span>
               </button>
               <button onClick={() => setCurrentPage('SHOP')} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-2 group active:scale-95 transition-all">
                 <span className="text-4xl group-hover:scale-110 transition-transform">🎁</span>
                 <span className="text-xs font-black text-zinc-400">SHOP</span>
               </button>
            </div>
          </div>
        );
      case 'LEARN':
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <h2 className="text-4xl font-black text-zinc-900 tracking-tighter italic">World Map</h2>
            <div className="grid grid-cols-2 gap-6">
              {Array.from({ length: 12 }).map((_, i) => {
                const s = i + 1;
                const isLocked = s > currentMissionStage;
                return (
                  <button key={s} disabled={isLocked} onClick={() => { setSelectedStage(s); setCurrentPage('TEST'); }} className={`p-8 rounded-[2.5rem] shadow-sm border-2 transition-all flex flex-col items-center gap-4 ${isLocked ? 'bg-zinc-50 border-zinc-100 opacity-50' : s === currentMissionStage ? 'bg-white border-[#FF7EB9] scale-105 z-10' : 'bg-white border-white active:scale-95'}`}>
                    <div className="text-5xl">{isLocked ? '🔒' : s < currentMissionStage ? '✨' : '📍'}</div>
                    <p className="text-3xl font-black text-zinc-800">{s}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'TEST':
        const sWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 10);
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentPage('LEARN')} className="text-zinc-400 font-black text-[10px] uppercase tracking-widest bg-white px-6 py-2 rounded-full border border-zinc-50 shadow-sm">Map</button>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Stage {selectedStage}</h2>
            </div>
            <button onClick={() => {
              const quiz = generateQuizOffline(sWords, 'EN_TO_JP', WORD_BANK);
              setQuizQuestions(quiz);
              setCurrentQuizIdx(0);
              setCorrectCount(0);
              setLastAnswerFeedback(null);
              setCurrentPage('QUIZ');
            }} className="w-full bg-[#FF7EB9] text-white py-6 rounded-3xl font-black text-xl shadow-lg active:scale-95 transition-all">TRY QUIZ!</button>
            <div className="space-y-4">
              {sWords.map(w => (
                <div key={w.id} className="bg-white p-6 rounded-[2rem] flex items-center justify-between shadow-sm group">
                  <div>
                    <p className="text-2xl font-black text-zinc-800 tracking-tight group-hover:text-[#FF7EB9] transition-colors">{w.word}</p>
                    <p className="text-xs font-bold text-zinc-300">{w.meaning}</p>
                  </div>
                  <button onClick={() => speakMessage(w.word)} className="bg-zinc-50 p-4 rounded-2xl text-xl hover:bg-[#FF7EB9] hover:text-white transition-all">🔊</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'QUIZ':
        const q = quizQuestions[currentQuizIdx];
        return (
          <div className="p-8 pt-20 min-h-screen page-enter bg-[#fdfaf9]">
            <div className="max-w-sm mx-auto space-y-10">
              <div className="text-center bg-white p-12 rounded-[3.5rem] border border-zinc-50 shadow-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] px-6 py-2 rounded-full font-black tracking-widest">{currentQuizIdx + 1} / 10</div>
                <h3 className="text-3xl font-black text-zinc-900 mt-4 tracking-tight leading-tight">{q?.question}</h3>
              </div>
              <div className="grid gap-3">
                {q?.options.map((opt, i) => (
                  <button key={i} onClick={() => {
                    const isCorrect = opt === q.correctAnswer;
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
                        if (user) saveUserData({ ...user, points: user.points + score * 10, totalPoints: user.totalPoints + score * 10 });
                        setCurrentPage('REVIEW');
                      }
                    }, 800);
                  }} disabled={!!lastAnswerFeedback} className={`bg-white p-6 rounded-[2rem] border-2 text-left font-black text-lg transition-all ${lastAnswerFeedback ? (opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 scale-105' : 'opacity-20') : 'border-zinc-50 hover:border-[#FF7EB9] active:scale-95'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'SHOP':
        return (
          <div className="p-8 pt-12 space-y-12 page-enter pb-48">
             <div className="flex justify-between items-end">
              <h2 className="text-4xl font-black text-zinc-900 italic tracking-tighter">Boutique</h2>
              <div className="bg-[#FF7EB9] text-white px-6 py-3 rounded-full font-black text-lg shadow-md">{user?.points} <span className="text-[10px] opacity-60">PT</span></div>
            </div>
            <div className="grid grid-cols-1 gap-12">
              {REWARDS.map(r => {
                const isUnlocked = user?.unlockedRewards.includes(r.id);
                return (
                  <div key={r.id} className={`bg-white p-10 rounded-[4rem] border-2 transition-all flex flex-col items-center text-center relative ${isUnlocked ? 'border-zinc-50 opacity-60' : 'border-white shadow-2xl'}`}>
                    <div className="mb-10 relative">
                       <div className={`absolute inset-0 ${r.aura} blur-[40px] rounded-full opacity-40`}></div>
                       <TamaRenderer type={r.type} color={r.color} scale={1.2} />
                    </div>
                    <div className="space-y-2 mb-8">
                      <p className="text-3xl font-black text-zinc-900">{r.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 px-8 italic">"{r.description}"</p>
                    </div>
                    {isUnlocked ? <div className="text-zinc-300 font-black text-[10px] tracking-[0.3em]">COLLECTED</div> : <button onClick={() => buyReward(r)} className="w-full py-5 rounded-3xl font-black text-lg bg-zinc-900 text-white active:scale-95 transition-all">Unlock {r.cost}P</button>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'RANKING':
        const allUsers = Object.values(JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}')).sort((a: any, b: any) => b.totalPoints - a.totalPoints).slice(0, 10);
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <h2 className="text-4xl font-black text-zinc-900 text-center italic tracking-tighter">Hall of Fame</h2>
            <div className="space-y-4">
              {allUsers.map((u: any, i) => (
                <div key={u.id} className={`bg-white p-6 rounded-[2.5rem] flex items-center gap-6 border-2 ${u.id === user?.id ? 'border-[#FF7EB9] shadow-lg' : 'border-zinc-50 shadow-sm'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${i===0?'bg-yellow-400 text-white':i===1?'bg-zinc-200 text-zinc-400':i===2?'bg-orange-300 text-white':'bg-zinc-50 text-zinc-200'}`}>{i+1}</div>
                  <div className="flex-1">
                    <p className="text-xl font-black text-zinc-700">{u.nickname}</p>
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{u.loginDays} Days streak</p>
                  </div>
                  <p className="text-2xl font-black text-[#FF7EB9] tracking-tighter">{u.totalPoints}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'REVIEW':
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <h2 className="text-4xl font-black text-zinc-900 italic tracking-tighter text-center">My Archive</h2>
            <div className="bg-zinc-900 p-12 rounded-[4rem] text-center shadow-2xl">
              <p className="text-[10px] font-black text-[#FF7EB9] uppercase tracking-[0.4em] mb-4 opacity-80">Current Points</p>
              <p className="text-7xl font-black text-white tracking-tighter">{user?.points}<span className="text-xs font-bold ml-2 text-zinc-500">PT</span></p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-300 uppercase tracking-widest px-4">Latest Logs</h3>
              {testHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-sm border-l-8 border-l-[#FF7EB9]">
                  <div>
                    <span className="text-[9px] font-black text-zinc-300 uppercase">{h.category}</span>
                    <p className="text-sm font-bold text-zinc-900">{h.date}</p>
                  </div>
                  <p className="text-3xl font-black tracking-tighter">{h.score}<span className="text-[10px] text-zinc-200">/10</span></p>
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
        <header className="p-6 flex justify-between items-center sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-white shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentPage('HOME')}>
            <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-xl shadow-lg">🐱</div>
            <h1 className="text-[10px] font-black text-zinc-900 tracking-widest uppercase italic leading-none">Eigo★Ky!</h1>
          </div>
          <button onClick={() => setCurrentPage('RANKING')} className="bg-[#FF7EB9] px-6 py-2 rounded-full text-white font-black text-[9px] uppercase tracking-widest shadow-md">Ranking</button>
        </header>
      )}
      <main className="max-w-md mx-auto">{renderContent()}</main>
      {currentPage !== 'LOGIN' && <Navigation current={currentPage} setPage={setCurrentPage} />}
      <style>{`
        .floating-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes tail {
          0%, 100% { transform: rotate(30deg); }
          50% { transform: rotate(45deg); }
        }
        .animate-tail { animation: tail 2s ease-in-out infinite; }
        .page-enter { animation: fadeIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
