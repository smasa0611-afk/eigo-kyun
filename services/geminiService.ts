
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordCard, QuizQuestion, StudyMode, TestResult } from "../types";

// Vercelなどの環境変数からAPIキーを取得
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getWordsByCategory = async (category: string): Promise<WordCard[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `あなたは日本の中学校の英語教師です。カテゴリー「${category}」に関連し、かつ文部科学省の学習指導要領（中学卒業までに必要な1200〜2500語のうちの基礎600語）に含まれる重要な英単語を10個選んでください。
    必ず、単語、意味、発音のカタカナ表記、例文、例文の訳をセットにしてください。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            word: { type: Type.STRING },
            meaning: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            exampleMeaning: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["id", "word", "meaning", "pronunciation", "exampleSentence", "exampleMeaning", "category"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generateQuiz = async (words: WordCard[], mode: StudyMode): Promise<QuizQuestion[]> => {
  const wordsList = words.map(w => JSON.stringify(w)).join(', ');
  
  let instruction = "";
  if (mode === 'EN_TO_JP') {
    instruction = "英和クイズを作成してください。問題文は英単語、選択肢は日本語の意味です。";
  } else if (mode === 'JP_TO_EN') {
    instruction = "和英クイズを作成してください。問題文は日本語の意味、選択肢は英単語です。";
  } else {
    instruction = "穴埋めクイズを作成してください。例文の単語部分を'____'に置き換え、日本語訳をヒントとして添えてください。";
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${instruction} 以下の単語リストを使用してください: ${wordsList}. 5問のJSON形式で作成してください。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generateRewardImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A super cute, soft, hand-drawn style illustration of ${prompt}. Pastel colors, minimalist, fluffy, Japanese kawaii aesthetic, white background.` }]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
};

export const getAIAdvice = async (history: TestResult[], nickname: string): Promise<string> => {
  if (history.length === 0) return `${nickname}さん、まずは学習を始めてみようニャ！応援してるよ！🐾`;
  
  const historySummary = history.slice(0, 5).map(h => `${h.date}: ${h.category} (${h.score}/${h.total})`).join(", ");
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `あなたは中学生向けの学習アプリ「Eigo-Kyun!」のネコキャラクターです。
    ユーザー名: ${nickname}
    最近の成績: ${historySummary}
    この成績を見て、可愛く、励ますような一言アドバイスを日本語30文字以内で作成してください。語尾は「ニャ」にしてください。`,
  });

  return response.text || "今日も一緒に頑張ろうニャ！🐾";
};

export const speakMessage = async (text: string): Promise<void> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly in a cute voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Base64 to Uint8Array
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length;
    const buffer = audioContext.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    
    return new Promise((resolve) => {
      source.onended = () => {
        audioContext.close();
        resolve();
      };
    });
  }
};
