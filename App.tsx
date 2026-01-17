import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
  WordCard,
  QuizQuestion,
  Category,
  StudyMode,
  TestResult,
  UserProfile,
  Reward
} from './types';
import {
  getWordsByCategory,
  generateQuiz,
  generateRewardImage,
  speakMessage,
  getAIAdvice,
  initAudio
} from './services/geminiService';
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
  }, [page, user, testHistory]);

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
    const pool = page === 'LOGIN' ? WELCOME_MESSAGES : KYUN_MESSAGES;
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
        unlockedRewards: [...user.unlockedRewards, reward.id],
      };
      saveUserData(updated);
      setCharacterMessage(`Unlocked! 🎁 ${reward.name}`);
    } catch (error) {
      console.error(error);
      alert("画像生成に失敗したニャ…もう一回ためしてみてニャ！");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // UI (minimum working)
  // -------------------------

  const goHome = () => {
    setShowModeSelect(false);
    setQuizFinished(false);
    setFeedback(null);
    setCurrentQuizIndex(0);
    setScore(0);
    setCombo(0);
    setPage('HOME');
  };

  const logout = () => {
    localStorage.removeItem('eigo_kyun_current_session');
    setUser(null);
    setTempId('');
    setLoginStep('ID');
    setPage('LOGIN');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const categories = Object.values(Category);

  // ログイン画面
  const LoginView = () => (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>EIGO-KYUN</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>英単語ゲーム（IDログイン）</p>

      <div style={{ marginTop: 16, padding: 12, border: '1px solid #333', borderRadius: 10 }}>
        <p style={{ marginTop: 0 }}><b>キャラをタップ</b>するとしゃべるよ！</p>
        <button onClick={handleCharacterTap} style={{ padding: '10px 14px', borderRadius: 10 }}>
          きゅん！（タップ）
        </button>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>{characterMessage}</div>
      </div>

      {loginStep === 'ID' ? (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #333', borderRadius: 10 }}>
          <h3 style={{ marginTop: 0 }}>生徒ID（8桁）</h3>
          <input
            placeholder="12345678"
            inputMode="numeric"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value;
                handleIdInput(v);
              }
            }}
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Enterで確定できます
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #333', borderRadius: 10 }}>
          <h3 style={{ marginTop: 0 }}>ニックネーム</h3>
          <input
            placeholder="たろう"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value;
                handleNicknameInput(v);
              }
            }}
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Enterで登録
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
        ※データはこの端末のブラウザに保存されます
      </div>
    </div>
  );

  // ホーム
  const HomeView = () => (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>ようこそ {user?.nickname} さん</h2>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            ID: {user?.id} / ログイン {user?.loginDays}日目
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><b>ポイント：</b>{user?.points ?? 0}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            累計：{user?.totalPoints ?? 0}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={handleCharacterTap} style={{ padding: '10px 14px', borderRadius: 10 }}>
          きゅん！（しゃべる）
        </button>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>{characterMessage}</div>
      </div>

      <div style={{ marginTop: 18, padding: 12, border: '1px solid #333', borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>学習をはじめる</h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((c) => (
            <button
              key={String(c)}
              onClick={() => startLearning(c)}
              style={{ padding: '10px 12px', borderRadius: 10 }}
              disabled={loading}
            >
              {String(c)}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={() => setPage('REVIEW')}
            style={{ padding: '10px 12px', borderRadius: 10 }}
          >
            ごほうび / 履歴
          </button>

          <button
            onClick={() => startQuiz(studyMode, true)}
            style={{ padding: '10px 12px', borderRadius: 10 }}
            disabled={loading}
          >
            実力テスト（ランダム）
          </button>

          <button
            onClick={logout}
            style={{ padding: '10px 12px', borderRadius: 10, opacity: 0.9 }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );

  // 学習（最低限：単語一覧）
  const LearnView = () => (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>単語：{selectedCategory ? String(selectedCategory) : ''}</h2>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setShowModeSelect(s => !s)} style={{ padding: '10px 12px', borderRadius: 10 }}>
          クイズ開始
        </button>
        <button onClick={goHome} style={{ padding: '10px 12px', borderRadius: 10 }}>
          ホームへ
        </button>
      </div>

      {showModeSelect && (
        <div style={{ padding: 12, border: '1px solid #333', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>モードを選んでね</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => startQuiz('EN_TO_JP', false)} style={{ padding: '10px 12px', borderRadius: 10 }}>
              英→日
            </button>
            <button onClick={() => startQuiz('JP_TO_EN', false)} style={{ padding: '10px 12px', borderRadius: 10 }}>
              日→英
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {words.map((w, idx) => (
          <div key={idx} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{w.english}</div>
            <div style={{ opacity: 0.9 }}>{w.japanese}</div>
            {w.example && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>{w.example}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  // クイズ（最低限：4択）※ JSXで <QuizView isTest={...} /> として使えるように修正
  const QuizView: React.FC<{ isTest: boolean }> = ({ isTest }) => {
    const q = quiz[currentQuizIndex];
    if (!q) return null;

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>{isTest ? '実力テスト' : 'クイズ'}</h2>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {currentQuizIndex + 1} / {quiz.length}　|　スコア {score}　|　コンボ {combo}
            </div>
          </div>
          {isTest && (
            <div style={{ fontSize: 14 }}>
              ⏱ {formatTime(timer)}
            </div>
          )}
        </div>

        {feedback && (
          <div style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid #333',
            fontWeight: 800
          }}>
            {feedback.text}
          </div>
        )}

        <div style={{ marginTop: 14, padding: 14, border: '1px solid #333', borderRadius: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 6 }}>問題</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{q.question}</div>

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {q.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(choice)}
                style={{ padding: '12px 12px', borderRadius: 12, textAlign: 'left' }}
                disabled={quizFinished}
              >
                {choice}
              </button>
            ))}
          </div>

          {quizFinished && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900 }}>結果：{score} / {quiz.length}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={goHome} style={{ padding: '10px 12px', borderRadius: 10 }}>
                  ホームへ
                </button>
              </div>
            </div>
          )}
        </div>

        {!quizFinished && (
          <div style={{ marginTop: 12 }}>
            <button onClick={goHome} style={{ padding: '10px 12px', borderRadius: 10 }}>
              中断してホームへ
            </button>
          </div>
        )}
      </div>
    );
  };

  // ごほうび / 履歴（最低限）
  const ReviewView = () => (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>ごほうび / 履歴</h2>
        <button onClick={goHome} style={{ padding: '10px 12px', borderRadius: 10 }}>
          ホームへ
        </button>
      </div>

      <div style={{ marginTop: 10, padding: 12, border: '1px solid #333', borderRadius: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>AIアドバイス</div>
        <div style={{ opacity: 0.9 }}>{aiAdvice}</div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setReviewSubTab('REWARDS')}
          style={{ padding: '10px 12px', borderRadius: 10, fontWeight: reviewSubTab === 'REWARDS' ? 900 : 400 }}
        >
          ごほうび
        </button>
        <button
          onClick={() => setReviewSubTab('HISTORY')}
          style={{ padding: '10px 12px', borderRadius: 10, fontWeight: reviewSubTab === 'HISTORY' ? 900 : 400 }}
        >
          履歴
        </button>
      </div>

      {reviewSubTab === 'REWARDS' ? (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {REWARDS.map(r => {
            const owned = !!user?.unlockedRewards.includes(r.id);
            const canBuy = !!user && user.points >= r.cost && !owned;
            const img = rewardImages[r.id];

            return (
              <div key={r.id} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontWeight: 900 }}>{r.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{r.cost} pt</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{r.description}</div>

                <div style={{ marginTop: 10, height: 160, borderRadius: 12, border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {owned && img ? (
                    <img src={img} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {owned ? '画像読み込み中…' : '未解放'}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  {owned ? (
                    <button disabled style={{ padding: '10px 12px', borderRadius: 10, width: '100%' }}>
                      解放済み
                    </button>
                  ) : (
                    <button
                      onClick={() => unlockReward(r)}
                      disabled={!canBuy || loading}
                      style={{ padding: '10px 12px', borderRadius: 10, width: '100%' }}
                    >
                      {canBuy ? 'ポイントで解放する' : 'ポイント不足'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {testHistory.length === 0 ? (
            <div style={{ padding: 12, border: '1px solid #333', borderRadius: 10 }}>
              まだ履歴がないよ！
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {testHistory.map((h, idx) => (
                <div key={idx} style={{ padding: 12, border: '1px solid #333', borderRadius: 10 }}>
                  <div style={{ fontWeight: 900 }}>{h.date} / {String(h.category)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                    {h.mode}　|　{h.score}/{h.total}　|　{formatTime(h.timeTaken)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const Main = () => {
    if (loading) {
      return (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
          <div style={{ padding: 12, border: '1px solid #333', borderRadius: 10 }}>Loading...</div>
        </div>
      );
    }

    if (page === 'LOGIN') return <LoginView />;
    if (!user) return <LoginView />;

    if (page === 'HOME') return <HomeView />;
    if (page === 'LEARN') return <LearnView />;
    if (page === 'QUIZ') return <QuizView isTest={false} />;
    if (page === 'TEST') return <QuizView isTest={true} />;
    if (page === 'REVIEW') return <ReviewView />;

    return <HomeView />;
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <Main />
      <Navigation current={page} setPage={setPage} />
    </div>
  );
};

export default App;
