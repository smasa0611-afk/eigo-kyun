
export const CAT_MESSAGES = {
  // ログイン日数・状況
  WELCOME_BACK: [
    "おかえりニャ！待ってたニャ！",
    "今日も一緒に頑張るニャ！",
    "会いたかったニャ〜！",
    "さあ、英語の時間だニャ！",
    "きみの努力は見てるニャ！"
  ],
  STREAK: [
    "連続ログイン！すごいニャ！",
    "毎日続けててエライニャ！",
    "その調子で天才を目指すニャ！",
    "きみなら絶対マスターできるニャ！"
  ],
  LONG_TIME: [
    "久しぶりニャ！寂しかったニャ…",
    "また会えて嬉しいニャ！",
    "今日から再スタートだニャ！",
    "無理せず少しずつやるニャ！"
  ],
  // 季節・イベント
  SPECIAL: {
    NEW_YEAR: "あけおめニャ！今年もよろしくニャ！",
    CHRISTMAS: "メリクリニャ！サンタは来るかニャ？",
    VALENTINE: "チョコより英単語だニャ！",
    HALLOWEEN: "お菓子より正解が欲しいニャ！"
  },
  // 励まし・タップ時
  ENCOURAGEMENT: [
    "一歩ずつ進めば大丈夫ニャ！",
    "きみは昨日より成長してるニャ！",
    "間違えてもいい、次があるニャ！",
    "集中してるきみ、かっこいいニャ！",
    "たまも応援してるニャ！",
    "英語ができると世界が広がるニャ！",
    "きみのペースで進むのが一番ニャ！",
    "疲れたらたまの肉球を思い出すニャ！",
    "コツコツが勝機を呼ぶニャ！",
    "きみの英語、キラキラしてるニャ！",
    "今日も1つ、新しい発見をするニャ！",
    "深呼吸して、リラックスだニャ。",
    "天才は一日にして成らずニャ！",
    "きみの挑戦を誇りに思うニャ！",
    "おやつを食べて休憩も大事ニャ！"
  ]
};

export const getSpecialDayMessage = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m === 1 && d === 1) return CAT_MESSAGES.SPECIAL.NEW_YEAR;
  if (m === 12 && d === 25) return CAT_MESSAGES.SPECIAL.CHRISTMAS;
  if (m === 2 && d === 14) return CAT_MESSAGES.SPECIAL.VALENTINE;
  if (m === 10 && d === 31) return CAT_MESSAGES.SPECIAL.HALLOWEEN;
  return null;
};
