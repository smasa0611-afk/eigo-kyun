
import { WordCard, QuizQuestion, StudyMode } from "../types";

export const speakMessage = (text: string): void => {
  if (!window.speechSynthesis) return;
  
  // 以前の音声を停止
  window.speechSynthesis.cancel();
  
  // わずかな遅延を入れることでブラウザの音声エンジンを確実にリセット
  setTimeout(() => {
    const uttr = new SpeechSynthesisUtterance(text);
    
    // 英語か日本語かを判定
    const isEnglish = /^[A-Za-z\s,!?.]+$/.test(text);
    uttr.lang = isEnglish ? 'en-US' : 'ja-JP';
    uttr.rate = 1.0;
    uttr.pitch = 1.2; 
    
    window.speechSynthesis.speak(uttr);
  }, 50);
};

export const initAudio = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // ユーザーインタラクションを待つためのダミー
    const dummy = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(dummy);
  }
};

export const generateQuizOffline = (words: WordCard[], mode: StudyMode, allWords: WordCard[]): QuizQuestion[] => {
  return words.map(target => {
    const otherWords = allWords.filter(w => w.id !== target.id);
    const distractors = [...otherWords]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    let question = "";
    let correct = "";
    let options: string[] = [];

    if (mode === 'EN_TO_JP') {
      question = `「${target.word}」の意味は？`;
      correct = target.meaning;
      options = [correct, ...distractors.map(d => d.meaning)].sort(() => Math.random() - 0.5);
    } else if (mode === 'JP_TO_EN') {
      question = `「${target.meaning}」を英語で？`;
      correct = target.word;
      options = [correct, ...distractors.map(d => d.word)].sort(() => Math.random() - 0.5);
    } else {
      const displaySentence = target.exampleSentence.replace(new RegExp(target.word, 'gi'), '_____');
      question = `空欄に入る単語は？\n"${displaySentence}"`;
      correct = target.word;
      options = [correct, ...distractors.map(d => d.word)].sort(() => Math.random() - 0.5);
    }

    return {
      question,
      options,
      correctAnswer: correct,
      explanation: `${target.word} = ${target.meaning}`
    };
  });
};
