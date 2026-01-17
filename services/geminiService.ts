
import { WordCard, QuizQuestion, StudyMode } from "../types";

export const speakMessage = (text: string): void => {
  if (!window.speechSynthesis) return;
  
  // スマホ対策1: 進行中の音声を即座に停止してリセット
  window.speechSynthesis.cancel();
  
  // スマホ対策2: わずかな遅延を入れることで、SpeechSynthesisの状態遷移を安定させる
  setTimeout(() => {
    const uttr = new SpeechSynthesisUtterance(text);
    const isEnglish = /^[A-Za-z\s,!?.]+$/.test(text);
    uttr.lang = isEnglish ? 'en-US' : 'ja-JP';
    uttr.rate = 0.9;
    uttr.pitch = 1.1; 
    
    // スマホ対策3: 再生直前にブラウザへ「ユーザー操作による実行」であることを再認識させる
    window.speechSynthesis.speak(uttr);
  }, 50);
};

export const initAudio = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // 空の音声を流すことで、ブラウザの音声再生禁止制限（Autoplay Policy）を解除する
    window.speechSynthesis.cancel();
    const dummy = new SpeechSynthesisUtterance("");
    dummy.volume = 0;
    window.speechSynthesis.speak(dummy);
  }
};

export const generateQuizOffline = (words: WordCard[], mode: StudyMode, allWords: WordCard[]): QuizQuestion[] => {
  return words.map(target => {
    let question = "";
    let correct = "";
    let distractors: string[] = [];

    if (mode === 'EN_TO_JP') {
      question = `「${target.word}」の意味は？`;
      correct = target.meaning;
      const meaningPool = Array.from(new Set(allWords.map(w => w.meaning))).filter(m => m !== correct);
      distractors = meaningPool.sort(() => Math.random() - 0.5).slice(0, 3);
    } else {
      if (mode === 'JP_TO_EN') {
        question = `「${target.meaning}」を英語で？`;
      } else {
        const displaySentence = target.exampleSentence.replace(new RegExp(target.word, 'gi'), '_____');
        question = `空欄に入る単語は？\n"${displaySentence}"`;
      }
      correct = target.word;
      const wordPool = Array.from(new Set(allWords.map(w => w.word))).filter(w => w !== correct);
      distractors = wordPool.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

    return {
      question,
      options,
      correctAnswer: correct,
      explanation: `${target.word} = ${target.meaning}`
    };
  });
};
