
import { WordCard, QuizQuestion, StudyMode } from "../types";

// Gemini APIは一切使用せず、ブラウザ標準の音声合成のみを使用
export const speakMessage = (text: string): void => {
  if (!window.speechSynthesis) return;
  
  // 再生中の音声を止めて新しく再生
  window.speechSynthesis.cancel();
  
  const uttr = new SpeechSynthesisUtterance(text);
  
  // 英語か日本語かを簡易判定
  const isEnglish = /^[A-Za-z\s,!?.]+$/.test(text);
  uttr.lang = isEnglish ? 'en-US' : 'ja-JP';
  uttr.rate = 1.0;
  uttr.pitch = 1.3; // キャラクターらしい声の高さ
  
  window.speechSynthesis.speak(uttr);
};

// 起動時に呼び出す初期化処理
export const initAudio = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const dummy = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(dummy);
  }
};

// オフライン（ローカル）でクイズを生成するロジック
export const generateQuizOffline = (words: WordCard[], mode: StudyMode, allWords: WordCard[]): QuizQuestion[] => {
  return words.map(target => {
    // 同じカテゴリから誤答の選択肢を選ぶ
    const sameCategoryWords = allWords.filter(w => w.category === target.category && w.id !== target.id);
    const otherWords = allWords.filter(w => w.id !== target.id);
    const distractorPool = sameCategoryWords.length >= 3 ? sameCategoryWords : otherWords;
    
    const distractors = [...distractorPool]
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
