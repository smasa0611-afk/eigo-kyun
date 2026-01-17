
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordCard, QuizQuestion, StudyMode, TestResult } from "../types";

// APIキー取得
const getApiKey = () => process.env.API_KEY || "";

let sharedAudioContext: AudioContext | null = null;

export const initAudio = () => {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }
  } catch (e) {
    console.error("Audio init error:", e);
  }
};

// JSON文字列を安全にパースする補助関数
const safeJsonParse = (text: string) => {
  if (!text) return null;
  try {
    // Markdownの装飾を除去して中身だけ取り出す
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    const target = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(target);
  } catch (e) {
    console.error("JSON Parse Error:", e, text);
    return null;
  }
};

export const getWordsByCategory = async (category: string): Promise<WordCard[]> => {
  const key = getApiKey();
  if (!key) throw new Error("API_KEY is missing");
  
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `中学レベルの単語を10個、カテゴリー「${category}」で作成してJSONで返してください。
    各項目: id(uuid風), word, meaning(日本語), pronunciation(カタカナ), exampleSentence(英語), exampleMeaning(日本語), category(「${category}」)。`,
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
  
  const data = safeJsonParse(response.text);
  if (!data || !Array.isArray(data)) throw new Error("Format error");
  return data;
};

export const generateQuiz = async (words: WordCard[], mode: StudyMode): Promise<QuizQuestion[]> => {
  const key = getApiKey();
  if (!key) throw new Error("API_KEY is missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const wordsSummary = words.map(w => `${w.word}:${w.meaning}`).join(",");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `単語リスト[${wordsSummary}]を使って、モード[${mode}]の4択クイズを5問作成。JSON arrayで返して。`,
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
  
  const data = safeJsonParse(response.text);
  if (!data || !Array.isArray(data)) throw new Error("Quiz format error");
  return data;
};

export const generateRewardImage = async (prompt: string): Promise<string> => {
  const key = getApiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Kawaii anime style mascot: ${prompt}. Pastel colors, white background.` }]
    }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:image/png;base64,${part.inlineData.data}` : "";
};

export const getAIAdvice = async (history: TestResult[], nickname: string): Promise<string> => {
  const key = getApiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  const summary = history.map(h => h.score).join(",");
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `ユーザー「${nickname}」の最近のスコア[${summary}]。ネコキャラとして褒め言葉を20文字以内で。語尾はニャ。`,
  });
  return response.text || "よく頑張ってるニャ！";
};

export const speakMessage = async (text: string): Promise<void> => {
  initAudio();
  if (!sharedAudioContext) return;
  const ctx = sharedAudioContext;
  const key = getApiKey();

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${text}` }] }],
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
  if (!base64Audio) return;

  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();

  return new Promise((resolve) => {
    source.onended = () => resolve();
  });
};
