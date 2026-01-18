
import { WordCard, QuizQuestion, StudyMode } from "../types";

export const speakMessage = (text: string): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // 重要：iOS等のスマホ対策。現在再生中のものを即時キャンセル
  window.speechSynthesis.cancel();

  // ほんの少しだけ遅延させることで、スマホブラウザが「新しい発話」として認識しやすくなる
  setTimeout(() => {
    const uttr = new SpeechSynthesisUtterance(text);
    const isEnglish = /^[A-Za-z\s,!?.]+$/.test(text);
    uttr.lang = isEnglish ? 'en-US' : 'ja-JP';
    uttr.rate = 0.95;
    uttr.pitch = 1.0;

    // ボイスの読み込みを待機（iOS/Safari対策）
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const targetVoice = voices.find(v => v.lang.startsWith(isEnglish ? 'en' : 'ja'));
      if (targetVoice) uttr.voice = targetVoice;
    }

    window.speechSynthesis.speak(uttr);
  }, 50);
};

export const initAudio = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // 最初のユーザー操作（ログインボタン等）で空の発話を行いロックを解除する
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
