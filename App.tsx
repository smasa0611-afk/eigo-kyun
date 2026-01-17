
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

const TamaRenderer: React.FC<{ type?: string; scale?: number; emotion?: 'happy' | 'proud' | 'normal' | 'sad'; color?: string }> = ({ type = 'normal', scale = 1, emotion = 'normal', color = '#ffffff' }) => {
  return (
    <div className="relative inline-block" style={{ transform: `scale(${scale})`, width: '220px', height: '220px' }}>
      {/* 床の影 */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 h-6 bg-black/5 rounded-[100%] blur-xl"></div>
      
      {/* しっぽ：ぽてっとした猫のしっぽ */}
      <div className="absolute bottom-10 -right-2 w-10 h-20 border-[14px] border-[#f0f0f0] rounded-[40%] border-t-transparent border-l-transparent rotate-[25deg] animate-tail origin-bottom-left" style={{ borderColor: `transparent transparent ${color} ${color}` }}></div>

      {/* メインボディ：より「おもち」に近いぽてっとしたフォルム */}
      <div className="absolute inset-2 rounded-[55%_45%_42%_42%] shadow-[inset_-10px_-15px_30px_rgba(0,0,0,0.03),0_15px_40px_rgba(0,0,0,0.04)] border-2 border-white/90 overflow-hidden transition-colors duration-500" style={{ backgroundColor: color }}>
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-48 h-40 bg-white/50 rounded-full blur-3xl"></div>
      </div>
      
      {/* 耳：さらにまるっこい猫耳 */}
      <div className="absolute top-1 left-7 w-16 h-16 bg-white rounded-[70%_30%_30%_30%] -rotate-[22deg] shadow-sm border-t border-white/50" style={{ backgroundColor: color }}>
        <div className="absolute inset-4 bg-rose-50 rounded-[60%_20%_20%_20%]"></div>
      </div>
      <div className="absolute top-1 right-7 w-16 h-16 bg-white rounded-[30%_70%_30%_30%] rotate-[22deg] shadow-sm border-t border-white/50" style={{ backgroundColor: color }}>
        <div className="absolute inset-4 bg-rose-50 rounded-[20%_60%_20%_20%]"></div>
      </div>

      {/* 顔：ゆるキャラパーツ配置 */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-full px-14 flex flex-col items-center z-10">
        <div className="flex justify-between w-full mb-2">
          {/* 目：離して配置 */}
          <div className={`w-3 h-3 bg-[#444] rounded-full relative ${emotion === 'happy' ? 'h-1.5 mt-1 rounded-t-full bg-transparent border-t-[3px] border-[#444]' : emotion === 'sad' ? 'h-1.5 mt-2 border-b-[3px] border-[#444] bg-transparent' : ''}`}>
             {emotion === 'normal' && <div className="absolute top-0.5 right-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>}
          </div>
          <div className={`w-3 h-3 bg-[#444] rounded-full relative ${emotion === 'happy' ? 'h-1.5 mt-1 rounded-t-full bg-transparent border-t-[3px] border-[#444]' : emotion === 'sad' ? 'h-1.5 mt-2 border-b-[3px] border-[#444] bg-transparent' : ''}`}>
             {emotion === 'normal' && <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>}
          </div>
        </div>
        
        {/* 口元：ふっくら ω */}
        <div className="flex -mt-0.5 scale-125">
          <div className="w-4 h-4 border-b-[2.5px] border-[#444] rounded-full -mr-[1px] opacity-60"></div>
          <div className="w-4 h-4 border-b-[2.5px] border-[#444] rounded-full opacity-60"></div>
        </div>

        {/* ほんのりチーク */}
        <div className="absolute top-6 -left-1 w-6 h-4 bg-pink-200/40 rounded-full blur-[3px]"></div>
        <div className="absolute top-6 -right-1 w-6 h-4 bg-pink-200/40 rounded-full blur-[3px]"></div>
      </div>

      {/* もちもちの手 */}
      <div className="absolute bottom-12 left-12 w-6 h-6 bg-white rounded-full border-b-[2px] border-zinc-50 shadow-sm z-10" style={{ backgroundColor: color }}></div>
      <div className="absolute bottom-12 right-12 w-6 h-6 bg-white rounded-full border-b-[2px] border-zinc-50 shadow-sm z-10" style={{ backgroundColor: color }}></div>

      {/* ごほうびアイテム */}
      {type === 'glasses' && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute top-[44%] left-1/2 -translate-x-1/2 w-full flex justify-center items-center gap-0.5">
            <div className="w-12 h-12 border-[3px] border-[#333] rounded-full bg-blue-50/20 backdrop-blur-[1px]"></div>
            <div className="w-3 h-[2px] bg-[#333] mt-2"></div>
            <div className="w-12 h-12 border-[3px] border-[#333] rounded-full bg-blue-50/20 backdrop-blur-[1px]"></div>
          </div>
        </div>
      )}
      {type === 'fire' && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl animate-bounce">🔥</div>}
      {type === 'ribbon' && <div className="absolute top-1 right-6 w-10 h-10 bg-rose-400 rounded-full shadow-lg flex items-center justify-center text-2xl rotate-12 border-2 border-white">🎀</div>}
      {type === 'sushi' && <div className="absolute -bottom-2 right-6 w-16 h-10 bg-white rounded-full shadow-md border-2 border-orange-50 flex items-center justify-center text-3xl">🍣</div>}
      {type === 'rain' && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl opacity-90 drop-shadow-md">☔</div>}
      {type === 'king' && <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl animate-pulse drop-shadow-lg">👑</div>}
      {type === 'detective' && <div className="absolute -top-3 left-8 w-24 h-8 bg-amber-900 rounded-t-[50%] border-b-[4px] border-amber-950 -rotate-2"></div>}
      {type === 'angel' && <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-4 bg-yellow-100/80 rounded-full border border-yellow-200"></div>}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [characterMessage, setCharacterMessage] = useState('こんにちは！一緒に学ぼうニャ！');
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [currentMissionStage, setCurrentMissionStage] = useState(1);
  const [studyMode, setStudyMode] = useState<StudyMode>('EN_TO_JP');

  useEffect(() => {
    initAudio();
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
  }, []);

  const saveUserData = (updated: UserProfile) => {
    setUser(updated);
    const allUsers = JSON.parse(localStorage.getItem('eigo_kyun_all_users') || '{}');
    allUsers[updated.id] = updated;
    localStorage.setItem('eigo_kyun_all_users', JSON.stringify(allUsers));
  };

  const buyReward = (reward: Reward) => {
    if (!user) return;
    if (user.points < reward.cost) {
      setCharacterMessage('ポイントが足りないニャ…頑張るニャ！');
      return;
    }
    const updatedUser: UserProfile = {
      ...user,
      points: user.points - reward.cost,
      unlockedRewards: [...user.unlockedRewards, reward.id]
    };
    saveUserData(updatedUser);
    setCharacterMessage(`${reward.name}、似合ってるかニャ？`);
  };

  const startQuiz = (mode: StudyMode) => {
    const sWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 10);
    const quiz = generateQuizOffline(sWords, mode, WORD_BANK);
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
          <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fdfaf9] page-enter overflow-hidden">
            <div className="w-full max-w-sm text-center relative">
              <div className="mb-8 scale-110"><TamaRenderer scale={1.2} emotion="happy" /></div>
              <h1 className="text-4xl font-black text-zinc-800 mb-1 tracking-tighter italic">Eigo★Kyun!</h1>
              <p className="text-[10px] font-black text-pink-300 uppercase tracking-[0.4em] mb-12">もちもち英単語ラボ</p>
              <div className="space-y-4">
                <input type="text" inputMode="numeric" placeholder="8桁のID" maxLength={8} className="w-full bg-white border-2 border-zinc-50 p-5 rounded-[2.5rem] text-center text-xl font-bold outline-none focus:border-pink-200 transition-all shadow-sm" value={loginId} onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
                {isFirstLogin && <input type="text" placeholder="なまえを教えてニャ" className="w-full bg-white border-2 border-zinc-50 p-5 rounded-[2.5rem] text-center text-lg font-bold outline-none focus:border-blue-200 shadow-sm" value={nickname} onChange={e => setNickname(e.target.value)} />}
                <button onClick={() => {
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
                }} className="w-full bg-zinc-800 text-white py-5 rounded-[2.5rem] font-black text-xl shadow-lg active:scale-95 transition-all">はじめる！</button>
              </div>
            </div>
          </div>
        );
      case 'HOME':
        const curReward = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-8 pt-10 space-y-12 page-enter pb-32">
            <div className="flex flex-col items-center">
               <div className="floating-slow mb-8"><TamaRenderer type={curReward?.type} color={curReward?.color} scale={1.7} emotion="happy" /></div>
               <div className="glass p-7 rounded-[3rem] border border-white/60 shadow-xl max-w-[280px] w-full relative">
                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/80 border-l border-t border-zinc-50 rotate-45"></div>
                 <p className="text-zinc-700 font-bold text-lg text-center leading-relaxed italic">"{characterMessage}"</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
               <button onClick={() => setCurrentPage('LEARN')} className="bg-white p-8 rounded-[3rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-2 active:scale-95 transition-all">
                 <span className="text-4xl">🍙</span><span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Learn</span>
               </button>
               <button onClick={() => setCurrentPage('SHOP')} className="bg-white p-8 rounded-[3rem] shadow-sm border border-zinc-50 flex flex-col items-center gap-2 active:scale-95 transition-all">
                 <span className="text-4xl">🎀</span><span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Shop</span>
               </button>
            </div>
          </div>
        );
      case 'LEARN':
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <h2 className="text-4xl font-black text-zinc-800 tracking-tighter italic">World Map</h2>
            <div className="grid grid-cols-2 gap-6">
              {Array.from({ length: 12 }).map((_, i) => {
                const s = i + 1;
                const isLocked = s > currentMissionStage;
                return (
                  <button key={s} disabled={isLocked} onClick={() => { setSelectedStage(s); setCurrentPage('TEST'); }} className={`p-8 rounded-[3rem] shadow-sm border-2 transition-all flex flex-col items-center gap-4 ${isLocked ? 'bg-zinc-50 border-zinc-100 opacity-30' : s === currentMissionStage ? 'bg-white border-pink-300 scale-105 z-10 shadow-lg' : 'bg-white border-white active:scale-95'}`}>
                    <div className="text-5xl">{isLocked ? '🔒' : s < currentMissionStage ? '👑' : '🐾'}</div>
                    <p className="text-3xl font-black text-zinc-700 tracking-tighter">{s}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'TEST':
        const sWords = WORD_BANK.slice((selectedStage-1)*50, (selectedStage-1)*50 + 10);
        return (
          <div className="p-8 pt-12 space-y-8 page-enter pb-32">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentPage('LEARN')} className="text-zinc-400 font-black text-[10px] tracking-widest bg-white px-6 py-2 rounded-full border border-zinc-50 shadow-sm">MAP</button>
              <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Stage {selectedStage}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => startQuiz('EN_TO_JP')} className="bg-pink-400 text-white py-6 rounded-[2rem] font-black text-lg shadow-md active:scale-95 transition-all">英和テスト</button>
              <button onClick={() => startQuiz('JP_TO_EN')} className="bg-zinc-800 text-white py-6 rounded-[2rem] font-black text-lg shadow-md active:scale-95 transition-all">和英テスト</button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest px-4">Word List</p>
              {sWords.map(w => (
                <div key={w.id} className="bg-white p-7 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-zinc-50">
                  <div>
                    <p className="text-2xl font-black text-zinc-700 tracking-tight">{w.word}</p>
                    <p className="text-xs font-bold text-zinc-300 italic">{w.meaning}</p>
                  </div>
                  <button onClick={() => { speakMessage(w.word); }} className="bg-zinc-50 p-4 rounded-[1.5rem] text-xl active:bg-pink-100 transition-colors">🔊</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'QUIZ':
        const q = quizQuestions[currentQuizIdx];
        const curRewardForQuiz = user?.unlockedRewards.length ? REWARDS.find(r => r.id === user.unlockedRewards[user.unlockedRewards.length - 1]) : null;
        return (
          <div className="p-8 pt-10 min-h-screen page-enter bg-[#fdfaf9] flex flex-col items-center">
            {lastAnswerFeedback && (
              <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none animate-result-pop">
                <span className={`text-[12rem] font-black drop-shadow-2xl ${lastAnswerFeedback === 'CORRECT' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {lastAnswerFeedback === 'CORRECT' ? '○' : '×'}
                </span>
              </div>
            )}

            <div className="mb-4 scale-75"><TamaRenderer type={curRewardForQuiz?.type} color={curRewardForQuiz?.color} scale={1.5} emotion={lastAnswerFeedback === 'WRONG' ? 'sad' : 'normal'} /></div>

            <div className="w-full max-w-sm space-y-6">
              <div className="text-center bg-white p-10 rounded-[3.5rem] border border-zinc-50 shadow-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] px-6 py-2 rounded-full font-black tracking-widest">{currentQuizIdx + 1} / 10</div>
                <h3 className="text-3xl font-black text-zinc-700 mt-4 tracking-tight leading-tight whitespace-pre-wrap">{q?.question}</h3>
              </div>

              {lastAnswerFeedback === 'WRONG' && (
                <div className="bg-zinc-800 text-white p-6 rounded-[2.5rem] shadow-xl animate-pop-in relative">
                   <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-800 rotate-45"></div>
                   <p className="text-center font-bold text-sm leading-relaxed tracking-tight">
                    正解は「<span className="text-pink-300">{q.correctAnswer}</span>」だニャ！<br/>
                    <span className="text-zinc-400 text-xs font-normal">{q.explanation}</span>
                  </p>
                </div>
              )}

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
                    }, isCorrect ? 800 : 2500);
                  }} disabled={!!lastAnswerFeedback} className={`bg-white p-6 rounded-[2.5rem] border-2 text-left font-black text-lg transition-all ${lastAnswerFeedback ? (opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 scale-105' : 'opacity-20') : 'border-zinc-50 active:scale-95'}`}>
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
              <h2 className="text-4xl font-black text-zinc-800 italic tracking-tighter">Boutique</h2>
              <div className="bg-pink-400 text-white px-6 py-3 rounded-full font-black text-lg shadow-md">{user?.points} <span className="text-[10px] opacity-60">PT</span></div>
            </div>
            <div className="grid grid-cols-1 gap-14">
              {REWARDS.map(r => {
                const isUnlocked = user?.unlockedRewards.includes(r.id);
                return (
                  <div key={r.id} className={`bg-white p-12 rounded-[4.5rem] border-2 transition-all flex flex-col items-center text-center relative ${isUnlocked ? 'border-zinc-50 opacity-50' : 'border-white shadow-2xl'}`}>
                    <div className="mb-10 relative">
                       <div className={`absolute inset-0 ${r.aura} blur-[40px] rounded-full opacity-30`}></div>
                       <TamaRenderer type={r.type} color={r.color} scale={1.2} />
                    </div>
                    <div className="space-y-2 mb-8 px-4">
                      <p className="text-3xl font-black text-zinc-800">{r.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 italic">"{r.description}"</p>
                    </div>
                    {isUnlocked ? <div className="text-zinc-200 font-black text-[10px] tracking-[0.3em]">COLLECTED</div> : <button onClick={() => buyReward(r)} className="w-full py-5 rounded-[2rem] font-black text-lg bg-zinc-800 text-white active:scale-95 transition-all">Unlock {r.cost}P</button>}
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
            <h2 className="text-4xl font-black text-zinc-800 text-center italic tracking-tighter">Hall of Fame</h2>
            <div className="space-y-5">
              {allUsers.map((u: any, i) => (
                <div key={u.id} className={`bg-white p-7 rounded-[3rem] flex items-center gap-6 border-2 ${u.id === user?.id ? 'border-pink-300 shadow-xl' : 'border-zinc-50 shadow-sm'}`}>
                  <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center font-black text-xl ${i===0?'bg-yellow-400 text-white':i===1?'bg-zinc-200 text-zinc-400':i===2?'bg-orange-300 text-white':'bg-zinc-50 text-zinc-200'}`}>{i+1}</div>
                  <div className="flex-1">
                    <p className="text-xl font-black text-zinc-700">{u.nickname}</p>
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{u.loginDays} Days Streak</p>
                  </div>
                  <p className="text-2xl font-black text-pink-400 tracking-tighter">{u.totalPoints}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'REVIEW':
        return (
          <div className="p-8 pt-12 space-y-10 page-enter pb-32">
            <h2 className="text-4xl font-black text-zinc-800 italic tracking-tighter text-center">My Archive</h2>
            <div className="bg-zinc-800 p-12 rounded-[4.5rem] text-center shadow-2xl relative overflow-hidden">
              <p className="text-[10px] font-black text-pink-300 uppercase tracking-[0.4em] mb-4 opacity-80">Accumulated Points</p>
              <p className="text-7xl font-black text-white tracking-tighter">{user?.points}<span className="text-xs font-bold ml-2 text-zinc-500">PT</span></p>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest px-6">Latest Records</h3>
              {testHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="bg-white p-7 rounded-[2.5rem] flex justify-between items-center shadow-sm border-l-8 border-l-pink-300">
                  <div>
                    <span className="text-[9px] font-black text-zinc-300 uppercase">{h.category}</span>
                    <p className="text-sm font-bold text-zinc-700">{h.date}</p>
                  </div>
                  <p className="text-3xl font-black tracking-tighter text-zinc-800">{h.score}<span className="text-[10px] text-zinc-200 ml-1">/10</span></p>
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
        <header className="p-6 flex justify-between items-center sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-white shadow-sm">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentPage('HOME')}>
            <div className="w-10 h-10 bg-zinc-800 rounded-[1.2rem] flex items-center justify-center text-xl shadow-lg">🐱</div>
            <h1 className="text-[10px] font-black text-zinc-800 tracking-widest uppercase italic leading-none">Eigo★Ky!</h1>
          </div>
          <button onClick={() => setCurrentPage('RANKING')} className="bg-pink-400 px-6 py-2 rounded-full text-white font-black text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all">Rank</button>
        </header>
      )}
      <main className="max-w-md mx-auto">{renderContent()}</main>
      {currentPage !== 'LOGIN' && <Navigation current={currentPage} setPage={setCurrentPage} />}
      <style>{`
        .floating-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes tail {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(40deg); }
        }
        .animate-tail { animation: tail 3s ease-in-out infinite; }
        .page-enter { animation: fadeIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-result-pop {
          animation: resultPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes resultPop {
          0% { transform: scale(0.4); opacity: 0; }
          20% { transform: scale(1.1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .animate-pop-in {
          animation: popIn 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes popIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
