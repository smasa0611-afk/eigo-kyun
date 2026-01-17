
import { WordCard } from '../types';

// カテゴリーを廃止し、No.1から順に並ぶ形式に変更
// ここではサンプルとして主要な単語を並べ、実際には600語まで拡張可能な構造にします
const rawWordsBase = [
  { word: 'student', meaning: '生徒', pronunciation: 'スチューデント' },
  { word: 'teacher', meaning: '先生', pronunciation: 'ティーチャー' },
  { word: 'school', meaning: '学校', pronunciation: 'スクール' },
  { word: 'class', meaning: '授業', pronunciation: 'クラス' },
  { word: 'homework', meaning: '宿題', pronunciation: 'ホームワーク' },
  { word: 'pencil', meaning: '鉛筆', pronunciation: 'ペンシル' },
  { word: 'desk', meaning: '机', pronunciation: 'デスク' },
  { word: 'chair', meaning: '椅子', pronunciation: 'チェアー' },
  { word: 'notebook', meaning: 'ノート', pronunciation: 'ノートブック' },
  { word: 'science', meaning: '理科', pronunciation: 'サイエンス' },
  { word: 'math', meaning: '数学', pronunciation: 'マス' },
  { word: 'history', meaning: '歴史', pronunciation: 'ヒストリー' },
  { word: 'morning', meaning: '朝', pronunciation: 'モーニング' },
  { word: 'night', meaning: '夜', pronunciation: 'ナイト' },
  { word: 'home', meaning: '家', pronunciation: 'ホーム' },
  { word: 'money', meaning: 'お金', pronunciation: 'マネー' },
  { word: 'time', meaning: '時間', pronunciation: 'タイム' },
  { word: 'today', meaning: '今日', pronunciation: 'トゥデイ' },
  { word: 'tomorrow', meaning: '明日', pronunciation: 'トゥモロー' },
  { word: 'happy', meaning: '幸せ', pronunciation: 'ハッピー' },
  { word: 'sad', meaning: '悲しい', pronunciation: 'サッド' },
  { word: 'kind', meaning: '親切な', pronunciation: 'カインド' },
  { word: 'apple', meaning: 'りんご', pronunciation: 'アップル' },
  { word: 'orange', meaning: 'オレンジ', pronunciation: 'オレンジ' },
  { word: 'milk', meaning: '牛乳', pronunciation: 'ミルク' },
  { word: 'water', meaning: '水', pronunciation: 'ウォーター' },
  { word: 'sun', meaning: '太陽', pronunciation: 'サン' },
  { word: 'moon', meaning: '月', pronunciation: 'ムーン' },
  { word: 'star', meaning: '星', pronunciation: 'スター' },
  { word: 'sea', meaning: '海', pronunciation: 'シー' },
  { word: 'river', meaning: '川', pronunciation: 'リバー' },
  { word: 'mountain', meaning: '山', pronunciation: 'マウンテン' },
  { word: 'animal', meaning: '動物', pronunciation: 'アニマル' },
  { word: 'beautiful', meaning: '美しい', pronunciation: 'ビューティフル' },
  { word: 'special', meaning: '特別な', pronunciation: 'スペシャル' },
  { word: 'important', meaning: '大切な', pronunciation: 'インポータント' },
  { word: 'difficult', meaning: '難しい', pronunciation: 'ディフィカルト' },
  { word: 'easy', meaning: '簡単な', pronunciation: 'イージー' },
  { word: 'future', meaning: '未来', pronunciation: 'フューチャー' },
  { word: 'world', meaning: '世界', pronunciation: 'ワールド' },
  { word: 'dream', meaning: '夢', pronunciation: 'ドリーム' },
  { word: 'friend', pronunciation: 'フレンド', meaning: '友達' },
  { word: 'family', pronunciation: 'ファミリー', meaning: '家族' },
  { word: 'picture', pronunciation: 'ピクチャー', meaning: '写真' },
  { word: 'music', pronunciation: 'ミュージック', meaning: '音楽' },
  { word: 'library', pronunciation: 'ライブラリー', meaning: '図書館' },
  { word: 'station', pronunciation: 'ステーション', meaning: '駅' },
  { word: 'hospital', pronunciation: 'ホスピタル', meaning: '病院' },
  { word: 'kitchen', pronunciation: 'キッチン', meaning: '台所' },
  { word: 'garden', pronunciation: 'ガーデン', meaning: '庭' },
];

// 600語になるようにループ等で生成する（デモ用に50語x12セット分を想定）
export const WORD_BANK: WordCard[] = Array.from({ length: 600 }).map((_, i) => {
  const base = rawWordsBase[i % rawWordsBase.length];
  const num = i + 1;
  return {
    id: `w${num}`,
    word: base.word,
    meaning: base.meaning,
    pronunciation: base.pronunciation,
    exampleSentence: `This is word number ${num}, which is ${base.word}.`,
    exampleMeaning: `これは${num}番目の単語、${base.meaning}です。`,
    category: `Stage ${Math.ceil(num / 50)}` // カテゴリーの代わりにステージ名を入れる
  };
});
