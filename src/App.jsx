import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2, RotateCcw, Compass, Zap, BookOpen, Crown, TrendingUp,
  BarChart3, AudioLines, Target, AlertCircle, Lightbulb, Globe2, Ear,
  Type, BrainCircuit, BookText, Timer, Flame, Sparkles, CheckCircle2,
  XCircle, GraduationCap, Heart, Award, ArrowRight, ChevronRight,
  User, Users, Star, FileText, Apple, Pencil, Library, Mic, Settings,
  Play, BookMarked, Rocket, Medal, Phone, ChevronLeft, Info, Printer, Lock, MapPin, CloudOff, RefreshCcw
} from 'lucide-react';
import { db } from './firebase';
import { ref, push, get } from 'firebase/database';
/* ════════════════════════════════════════════════════════════════
   A.P.L.U.S Level Testing v4 — Recruitment-Optimized
   • 5 模組綜合診斷 (跳過 Speaking,自主作答)
   • 6 級別 (含 Junior 6)
   • 改良語音 (神經網路語音優先) + 試聽選擇器
   • 學校優勢區塊 (萃取自教師手冊,可編輯)
   • 下一級課程預覽 + 招生 CTA
   ═══════════════════════════════════════════════════════════════ */

const LEVELS = ['A', 'P', 'L', 'U', 'S', 'J6'];

const LEVEL_INFO = {
  A:  { name: 'Adventurers',         cefr: 'Pre-A1', icon: Compass,    grade: '幼稚園 ~ 小一',
        desc: '能聽懂簡單問候,認識基礎單字,掌握 Be 動詞。',
        objectives: ['Subjects (I, You, He, She, It, We, They)', 'Be Verbs (is / am / are)', 'a / an / +s 冠詞與單複數'] },
  P:  { name: 'Pacesetters',         cefr: 'Pre-A1', icon: Zap,        grade: '小一 ~ 小二',
        desc: '能用所有格代名詞,熟悉 Do/Does 與現在進行式。',
        objectives: ['Possessive Pronouns (my, your, his, her, our, their, its)', 'Do / Does / Verb+s', 'Present Continuous Tense (V-ing)'] },
  L:  { name: 'Letter-Perfect',      cefr: 'A1',     icon: BookOpen,   grade: '小三 ~ 小四',
        desc: '具備自然拼讀能力,能運用過去式與資訊問句。',
        objectives: ['Information Question (Wh-)', 'Frequency Adverb', 'Ordinal Number', 'Was / Were', 'Past Tense Sentences', 'Verb List'] },
  U:  { name: 'Unlimited-Potential', cefr: 'A1',     icon: TrendingUp, grade: '小四 ~ 小五',
        desc: '能掌握未來式、形容詞比較級與最高級。',
        objectives: ['Future Tense (will / be going to)', 'Comparative Adjectives', 'Superlative Adjectives'] },
  S:  { name: 'Success',             cefr: 'A2',     icon: Crown,      grade: '小五 ~ 小六',
        desc: '精通完成式系統 (現在/過去/完成進行式)。',
        objectives: ['Present Perfect Tense', 'Past Perfect Tense', 'Perfect Continuous Tense'] },
  J6: { name: 'Junior 6',            cefr: 'A2+',    icon: Award,      grade: '小六 ~ 國中銜接',
        desc: 'A2 高階精熟,具備銜接國中英語的綜合能力。',
        objectives: ['時態綜合運用', '情態助動詞 (should / must / could)', '長段閱讀流暢度', '高階字彙產出'] }
};

const SKILL_TAGS = {
  Phonics:    { icon: Type,         label: '發音認知', color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200', hex: '#8B5CF6' },
  Spelling:   { icon: Pencil,       label: '拼字運用', color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200',    hex: '#0EA5E9' },
  Vocabulary: { icon: BookText,     label: '字彙量',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  hex: '#F59E0B' },
  Reading:    { icon: Library,      label: '閱讀理解', color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',   hex: '#F43F5E' },
  Grammar:    { icon: BrainCircuit, label: '文法結構', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',hex: '#10B981' }
};

const FLASHCARD_TONE = {
  compound:     { bg: '#3B82F6', label: '複合子音' },
  long_vowel:   { bg: '#EF4444', label: '長母音' },
  double_vowel: { bg: '#F97316', label: '雙母音' }
};

/* ════════════════════════════════════════════════════════════════
   ⭐ 學校優勢資料 (萃取自《Level Testing Result - Teacher's Guide》)
   ⚠️ EDIT HERE — 你可以隨時修改以下內容以符合品牌定位
   ═══════════════════════════════════════════════════════════════ */
const SCHOOL_NAME = '耶加 A.P.L.U.S';                 // ✏️ EDIT 學校名稱
const SCHOOL_TAGLINE = '對標 CEFR 國際標準的全面英語養成';  // ✏️ EDIT 標語

/* ✏️ EDIT 學校優勢 — 萃取自教師手冊的核心特色 */
const SCHOOL_ADVANTAGES = [
  { icon: Globe2,
    title: 'CEFR 國際標準對標',
    desc: '6 級數精細對應 Pre-A1 ~ A2+,從 Adventurers 到 Junior 6,每一級都有國際語言檢定的明確定位,銜接歐洲共同語文參考標準。' },
  { icon: BarChart3,
    title: '5 大能力綜合培養',
    desc: '不只應付學校考試 — Phonics 發音、Spelling 拼字、Vocabulary 字彙、Reading 閱讀、Grammar 文法五大領域均衡發展,打造真正的英語實力。' },
  { icon: Type,
    title: '獨家 Phonics 閃卡教學',
    desc: '視覺化拼讀法,用三色閃卡 (複合子音藍卡、長母音紅卡、雙母音橘卡) 讓孩子看字就能唸,擺脫死記硬背。' },
  { icon: BrainCircuit,
    title: '文法系統化六級進階',
    desc: '依認知發展設計:A 級 Be 動詞 → P 級現在進行式 → L 級過去式 → U 級未來式與比較級 → S 級完成式 → Junior 6 國中銜接,循序漸進不混亂。' },
  { icon: Sparkles,
    title: '多模態評量標準',
    desc: '每個文法概念皆要求「讀 / 寫 / 造句 / 正確中文解釋 / 舉一反三」五合一通過,確保孩子是真正理解而非短期記憶。' },
  { icon: Heart,
    title: '溫暖鼓勵式學習文化',
    desc: '從打招呼擁抱開始建立信任,Ms./Mr. 尊師文化培養禮貌,老師主動避免讓話題中斷,讓孩子在零焦慮的環境中建立英語自信。' }
];

/* ✏️ EDIT 各級數課程亮點 — 用於「下一級預覽」 */
const COURSE_HIGHLIGHTS = {
  A:  ['26 字母大小寫書寫與認讀', 'A~Z 基礎 Phonics 拼讀', 'Be 動詞與主詞代名詞應用', '基礎情境字彙 (家庭、動物、顏色)', '簡單英文問候與自我介紹'],
  P:  ['複合子音閃卡 (sh / ch / th / ph / er)', '助動詞 Do / Does 句型轉換', '現在進行式 Be + V-ing', '所有格代名詞 (my / your / his...)', '日常生活字彙擴充'],
  L:  ['長母音 + 雙母音完整拼讀系統', '規則 + 不規則過去式動詞表', 'Wh- 資訊問句六大疑問詞', '頻率副詞與序數應用', '段落閱讀理解策略訓練'],
  U:  ['未來式 will / be going to 雙系統', '形容詞比較級與最高級完整變化', '進階同義詞與反義詞替換能力', '看字辨音 (Phonics Application)', '中段落閱讀與邏輯推理'],
  S:  ['現在完成式 have + p.p. 用法精修', '過去完成式 had + p.p. 時序辨析', '完成進行式強調動作持續', '高階情緒形容詞與動詞', '英文短篇文章閱讀理解'],
  J6: ['多時態混合運用', '情態助動詞 (should / must / could / may)', '條件句基礎 (If 子句)', '國中文法重點銜接', '長文閱讀流暢度訓練']
};

/* ════════════════════════════════════════════════════════════════
   題庫 (5 模組)
   ═══════════════════════════════════════════════════════════════ */
const PHONICS_QUESTIONS = [
  { id: 'PH1', skill: 'Phonics', level: 'A',
    instruction: '聽語音,選出正確的字母', audio: 'p',
    options: [{ id: 'a', label: 'b' }, { id: 'b', label: 'p', isCorrect: true }, { id: 'c', label: 'd' }],
    concept: 'A~Z Phonics — 鏡像字母辨識',
    explanation: '"p" 發 /p/ (如 pig, pen)。"b" 發 /b/,"d" 發 /d/。p / b / d 是常見鏡像混淆字母。' },
  { id: 'PH2', skill: 'Phonics', level: 'P',
    instruction: '聽語音,選出此單字使用的字母組合', audio: 'shoe',
    options: [{ id: 'a', label: 'sh', isCorrect: true }, { id: 'b', label: 'ch' }, { id: 'c', label: 'th' }],
    concept: '複合子音 (sh / ch / th / ph / er)',
    explanation: '"shoe" 開頭發 /ʃ/,屬 sh。ch 是 /tʃ/ (cheese),th 是 /θ/ (thank)。' },
  { id: 'PH3', skill: 'Phonics', level: 'P',
    instruction: '看字母組合,選出包含此音的單字',
    flashcard: { letters: 'ch', tone: 'compound' },
    options: [{ id: 'a', label: 'cat' }, { id: 'b', label: 'cheese', isCorrect: true }, { id: 'c', label: 'show' }],
    concept: '複合子音 ch 應用',
    explanation: 'ch 發 /tʃ/,出現在 cheese, chair, chicken。"show" 是 sh,"cat" 只有單獨的 c。' },
  { id: 'PH4', skill: 'Phonics', level: 'L',
    instruction: '聽語音,選出此單字使用的長母音規則', audio: 'cake',
    options: [{ id: 'a', label: 'a_e', isCorrect: true }, { id: 'b', label: 'e_e' }, { id: 'c', label: 'i_e' }],
    concept: '長母音 (a_e, e_e, i_e, o_e, u_e)',
    explanation: 'cake = c-a-k-e,符合 a + 子音 + e 結構,屬 a_e 長母音,a 發 /eɪ/。' },
  { id: 'PH5', skill: 'Phonics', level: 'L',
    instruction: '看長母音規則,選出對應的單字',
    flashcard: { letters: 'i_e', tone: 'long_vowel' },
    options: [{ id: 'a', label: 'sit' }, { id: 'b', label: 'kite', isCorrect: true }, { id: 'c', label: 'big' }],
    concept: '長母音 i_e 應用',
    explanation: 'kite (k-i-t-e) 符合 i + 子音 + e,i 發 /aɪ/。"sit"、"big" 是短母音 /ɪ/。' },
  { id: 'PH6', skill: 'Phonics', level: 'L',
    instruction: '看雙母音規則,選出對應的單字',
    flashcard: { letters: 'oo', tone: 'double_vowel' },
    options: [{ id: 'a', label: 'moon', isCorrect: true }, { id: 'b', label: 'cat' }, { id: 'c', label: 'dog' }],
    concept: '雙母音 (oo, ee, ea, aw, ow, au)',
    explanation: 'oo 發 /uː/ 長音 (moon, food, school)。雙母音是兩個母音字母組合表示一個音。' }
];

const SPELLING_QUESTIONS = [
  { id: 'SP1', skill: 'Spelling', level: 'A',
    instruction: '聽語音,選出正確拼字', audio: 'cat',
    options: [{ id: 'a', label: 'cat', isCorrect: true }, { id: 'b', label: 'kat' }, { id: 'c', label: 'cot' }],
    concept: 'Simple 短單字拼字',
    explanation: 'cat 是 3 字母單字,/k/ 音用 c 不用 k。常見的 dog, hat, top, rug 也是。' },
  { id: 'SP2', skill: 'Spelling', level: 'A',
    instruction: '看圖,選出正確拼字', prompt: '🐶', isEmojiBig: true,
    options: [{ id: 'a', label: 'dog', isCorrect: true }, { id: 'b', label: 'doge' }, { id: 'c', label: 'doog' }],
    concept: 'Simple 圖像對應拼字',
    explanation: 'dog (d-o-g) 是基礎短單字。圖像→拼字是 A 級基本能力。' },
  { id: 'SP3', skill: 'Spelling', level: 'P',
    instruction: '聽語音,選出正確拼字', audio: 'baseball',
    options: [{ id: 'a', label: 'basebal' }, { id: 'b', label: 'baseball', isCorrect: true }, { id: 'c', label: 'basbal' }],
    concept: 'Longer 複合字拼字',
    explanation: 'baseball = base + ball,複合字保留兩字根。注意 -ll 是雙 l。' },
  { id: 'SP4', skill: 'Spelling', level: 'P',
    instruction: '選出缺少的字母', prompt: 'rain__oat (雨衣)',
    options: [{ id: 'a', label: 'b' }, { id: 'b', label: 'c', isCorrect: true }, { id: 'c', label: 'k' }],
    concept: 'Longer 複合字拼寫',
    explanation: 'raincoat = rain + coat。/k/ 音此處用 c,因 coat 起頭用 c 不用 k。' },
  { id: 'SP5', skill: 'Spelling', level: 'S',
    instruction: '聽語音,選出正確拼字', audio: 'invention',
    options: [{ id: 'a', label: 'invension' }, { id: 'b', label: 'invention', isCorrect: true }, { id: 'c', label: 'invenshion' }],
    concept: 'Complex 進階字彙 (-tion 字尾)',
    explanation: 'invention 字尾 -tion 發 /ʃən/。常見:station, action, nation, invitation。' }
];

const VOCAB_QUESTIONS = [
  { id: 'V1', skill: 'Vocabulary', level: 'A',
    instruction: '看圖,選出正確單字', prompt: '🦁', isEmojiBig: true,
    options: [{ id: 'a', label: 'lion', isCorrect: true }, { id: 'b', label: 'elephant' }, { id: 'c', label: 'dog' }],
    concept: 'Adventurers 等級字彙 (動物)',
    explanation: '🦁 = lion (獅子)。A 級基礎動物字彙。elephant 是大象,dog 是狗。' },
  { id: 'V2', skill: 'Vocabulary', level: 'P',
    instruction: '看圖,選出正確單字', prompt: '🏫', isEmojiBig: true,
    options: [{ id: 'a', label: 'hospital' }, { id: 'b', label: 'school', isCorrect: true }, { id: 'c', label: 'park' }],
    concept: 'Pacesetters 等級字彙 (場所)',
    explanation: '🏫 = school (學校)。hospital 是醫院 🏥,park 是公園。' },
  { id: 'V3', skill: 'Vocabulary', level: 'L',
    instruction: '讀句子,選出正確單字',
    prompt: 'A place where you can borrow books is a ___.',
    options: [{ id: 'a', label: 'hospital' }, { id: 'b', label: 'library', isCorrect: true }, { id: 'c', label: 'bakery' }],
    concept: 'Letter-Perfect 等級字彙 (情境推理)',
    explanation: 'borrow books (借書) → library (圖書館)。L 級開始要求情境推理。' },
  { id: 'V4', skill: 'Vocabulary', level: 'U',
    instruction: '選出意思最相近的同義詞', prompt: 'attractive = ?',
    options: [{ id: 'a', label: 'active' }, { id: 'b', label: 'sad' }, { id: 'c', label: 'good-looking', isCorrect: true }],
    concept: 'Unlimited-Potential 等級字彙 (同義詞)',
    explanation: 'attractive (有吸引力的) ≈ good-looking (好看的)。U 級強調同義詞替換。' },
  { id: 'V5', skill: 'Vocabulary', level: 'S',
    instruction: '選出符合語境的進階字彙',
    prompt: 'The movie was so ___! I cried for an hour.',
    options: [{ id: 'a', label: 'touching', isCorrect: true }, { id: 'b', label: 'boring' }, { id: 'c', label: 'fast' }],
    concept: 'Success 等級字彙 (情緒形容詞)',
    explanation: 'cried for an hour 顯示電影感人,touching = 動人的。S 級從語境判斷字義。' },
  { id: 'V6', skill: 'Vocabulary', level: 'J6',
    instruction: '選出最精準的高階字彙',
    prompt: 'After running 10 km, I felt completely ___.',
    options: [{ id: 'a', label: 'tired' }, { id: 'b', label: 'exhausted', isCorrect: true }, { id: 'c', label: 'happy' }],
    concept: 'Junior 6 等級字彙 (精細語意)',
    explanation: 'completely 強調程度極致,exhausted (筋疲力盡) 比 tired (累) 程度更強。' }
];

const READING_QUESTIONS = [
  { id: 'R1', skill: 'Reading', level: 'A',
    instruction: '讀句子,選出符合敘述',
    passage: 'I have a cat. The cat is black.',
    prompt: 'What color is the cat?',
    options: [{ id: 'a', label: 'black', isCorrect: true }, { id: 'b', label: 'white' }, { id: 'c', label: 'red' }],
    concept: 'Adventurers Story 短句閱讀',
    explanation: '原文 "The cat is black",直接擷取。A 級重點是抓直接資訊。' },
  { id: 'R2', skill: 'Reading', level: 'P',
    instruction: '讀短句,選出正確答案',
    passage: 'Tom is my friend. He likes pizza. He does not like fish.',
    prompt: 'What does Tom like?',
    options: [{ id: 'a', label: 'fish' }, { id: 'b', label: 'pizza', isCorrect: true }, { id: 'c', label: 'rice' }],
    concept: 'Pacesetters Story 否定句辨識',
    explanation: '"likes pizza" 肯定,"does not like fish" 否定。P 級要分辨肯定/否定。' },
  { id: 'R3', skill: 'Reading', level: 'L',
    instruction: '讀短文,選出正確敘述',
    passage: 'Tom went to the zoo last Sunday. He saw a tiger and an elephant. He had a good time.',
    prompt: 'Which is correct?',
    options: [{ id: 'a', label: 'Tom saw a tiger.', isCorrect: true }, { id: 'b', label: 'Tom went to school.' }, { id: 'c', label: 'Tom did not have fun.' }],
    concept: 'Letter-Perfect Story 過去式敘事',
    explanation: '"He saw a tiger and an elephant" → Tom 看到老虎。had a good time = 玩得開心。' },
  { id: 'R4', skill: 'Reading', level: 'U',
    instruction: '讀短文,進行邏輯推理',
    passage: 'Mary is taller than Jane. Jane is taller than Sue. They are all girls in the same class.',
    prompt: 'Who is the tallest?',
    options: [{ id: 'a', label: 'Mary', isCorrect: true }, { id: 'b', label: 'Jane' }, { id: 'c', label: 'Sue' }],
    concept: 'Unlimited-Potential Reading 比較邏輯',
    explanation: 'Mary > Jane > Sue,Mary 最高。U 級引入比較級邏輯推理。' },
  { id: 'R5', skill: 'Reading', level: 'S',
    instruction: '讀文章,選出主旨',
    passage: 'Dolphins are very smart and friendly animals. They live in the sea and love to play with people. Many scientists study dolphins to understand how they communicate with each other.',
    prompt: 'What is the article mainly about?',
    options: [{ id: 'a', label: 'Dolphins are smart sea animals.', isCorrect: true }, { id: 'b', label: 'Scientists are smart.' }, { id: 'c', label: 'Dolphins live on land.' }],
    concept: 'Success articles 段落主旨擷取',
    explanation: '文章圍繞 dolphins 的聰明、友善、生活與溝通,主旨是描述 dolphins。' }
];

const GRAMMAR_QUESTIONS = {
  A: [
    { id: 'GA1', skill: 'Grammar', level: 'A', topic: 'Subjects',
      instruction: '選出正確的主詞', prompt: '___ is my mother.',
      options: [{ id: 'a', label: 'I' }, { id: 'b', label: 'She', isCorrect: true }, { id: 'c', label: 'You' }],
      concept: 'Subjects (主詞代名詞)',
      explanation: 'mother 是女性,用 She。代名詞:I 我 / You 你 / He 他 / She 她 / It 它 / We 我們 / They 他們。' },
    { id: 'GA2', skill: 'Grammar', level: 'A', topic: 'Be Verbs',
      instruction: '選出正確的 Be 動詞', prompt: 'We ___ happy.',
      options: [{ id: 'a', label: 'is' }, { id: 'b', label: 'am' }, { id: 'c', label: 'are', isCorrect: true }],
      concept: 'Be Verbs (is / am / are)',
      explanation: 'We 複數搭配 are。三組:I am / You are / He, She, It is / We, You, They are。' },
    { id: 'GA3', skill: 'Grammar', level: 'A', topic: 'a/an/+s',
      instruction: '選出正確冠詞', prompt: 'I have ___ apple.',
      options: [{ id: 'a', label: 'a' }, { id: 'b', label: 'an', isCorrect: true }, { id: 'c', label: 'apples' }],
      concept: 'a / an 冠詞',
      explanation: 'apple 開頭母音 /æ/,用 an。子音前用 a (a cat),母音前用 an (an apple)。' }
  ],
  P: [
    { id: 'GP1', skill: 'Grammar', level: 'P', topic: 'Possessive Pronouns',
      instruction: '選出正確的所有格代名詞', prompt: 'This is Tom. ___ dog is brown.',
      options: [{ id: 'a', label: 'He' }, { id: 'b', label: 'His', isCorrect: true }, { id: 'c', label: 'Him' }],
      concept: 'Possessive Pronouns (所有格)',
      explanation: 'Tom 男性,用 his (他的)。所有格:my / your / his / her / our / their / its。' },
    { id: 'GP2', skill: 'Grammar', level: 'P', topic: 'Do/Does/V+s',
      instruction: '選出正確動詞',
      chatA: 'Does she like English?', chatB: 'Yes, she ___ English.',
      options: [{ id: 'a', label: 'like' }, { id: 'b', label: 'likes', isCorrect: true }, { id: 'c', label: 'liking' }],
      concept: 'Do / Does / Verb+s',
      explanation: 'she (第三人稱單數) 動詞加 s → likes。問句用 Does,答句用 V+s。' },
    { id: 'GP3', skill: 'Grammar', level: 'P', topic: 'Present Continuous',
      instruction: '選出正確的動詞形式', prompt: 'Look! The boy ___ an apple.',
      options: [{ id: 'a', label: 'eat' }, { id: 'b', label: 'is eating', isCorrect: true }, { id: 'c', label: 'eats' }],
      concept: 'Present Continuous (Be + V-ing)',
      explanation: '看到 Look! 表動作正在發生,用 Be + V-ing。公式:am/is/are + V-ing。' }
  ],
  L: [
    { id: 'GL1', skill: 'Grammar', level: 'L', topic: 'Information Question',
      instruction: '選出正確的疑問詞', prompt: '___ is your birthday? — It is in May.',
      options: [{ id: 'a', label: 'What' }, { id: 'b', label: 'When', isCorrect: true }, { id: 'c', label: 'Where' }],
      concept: 'Information Question (Wh-)',
      explanation: '生日回答是月份 (時間),用 When。What/When/Where/Who/Why/How 對應不同問題類型。' },
    { id: 'GL2', skill: 'Grammar', level: 'L', topic: 'Frequency Adverb',
      instruction: '選出正確的頻率副詞', prompt: 'I brush my teeth every day. I ___ brush my teeth.',
      options: [{ id: 'a', label: 'never' }, { id: 'b', label: 'always', isCorrect: true }, { id: 'c', label: 'seldom' }],
      concept: 'Frequency Adverb (頻率副詞)',
      explanation: 'every day = always (100%)。由高到低:always > usually > often > sometimes > seldom > never。' },
    { id: 'GL3', skill: 'Grammar', level: 'L', topic: 'Ordinal Number',
      instruction: '選出正確的序數', prompt: 'This is the ___ book. (第 3 本)',
      options: [{ id: 'a', label: 'three' }, { id: 'b', label: 'third', isCorrect: true }, { id: 'c', label: 'thirty' }],
      concept: 'Ordinal Number (序數)',
      explanation: '第 3 是 third (3rd),不是 three。序數:first/second/third/fourth/fifth...' },
    { id: 'GL4', skill: 'Grammar', level: 'L', topic: 'Was/Were',
      instruction: '選出正確的過去式 Be 動詞', prompt: 'They ___ at school yesterday.',
      options: [{ id: 'a', label: 'is' }, { id: 'b', label: 'are' }, { id: 'c', label: 'were', isCorrect: true }],
      concept: 'Was / Were (過去式 Be)',
      explanation: 'They 複數 + yesterday → were。過去式:I/He/She/It → was; You/We/They → were。' },
    { id: 'GL5', skill: 'Grammar', level: 'L', topic: 'Past Tense',
      instruction: '選出正確的過去式動詞', prompt: 'I ___ basketball with my friends yesterday.',
      options: [{ id: 'a', label: 'play' }, { id: 'b', label: 'played', isCorrect: true }, { id: 'c', label: 'playing' }],
      concept: 'Past Tense Sentences',
      explanation: 'yesterday → 過去式,規則動詞 + ed:play → played。study → studied, stop → stopped。' },
    { id: 'GL6', skill: 'Grammar', level: 'L', topic: 'Verb List (Irregular)',
      instruction: '選出正確的不規則動詞過去式', prompt: 'I ___ to the park last Sunday.',
      options: [{ id: 'a', label: 'goed' }, { id: 'b', label: 'went', isCorrect: true }, { id: 'c', label: 'going' }],
      concept: 'Verb List 不規則動詞',
      explanation: 'go 不規則,過去式 went,p.p. gone。常見:eat-ate-eaten, see-saw-seen, do-did-done。' }
  ],
  U: [
    { id: 'GU1', skill: 'Grammar', level: 'U', topic: 'Future Tense',
      instruction: '選出正確的未來式', prompt: 'I ___ to Japan next summer.',
      options: [{ id: 'a', label: 'go' }, { id: 'b', label: 'went' }, { id: 'c', label: 'will go', isCorrect: true }],
      concept: 'Future Tense (will / be going to)',
      explanation: 'next summer 未來,用 will + 原形動詞。也可用 am/is/are going to + V原形。' },
    { id: 'GU2', skill: 'Grammar', level: 'U', topic: 'Comparative',
      instruction: '選出正確的比較級', prompt: 'The elephant is ___ than the dog.',
      options: [{ id: 'a', label: 'big' }, { id: 'b', label: 'bigger', isCorrect: true }, { id: 'c', label: 'biggest' }],
      concept: 'Comparative Adjective (比較級)',
      explanation: '看 than 用比較級。短形容詞 + er:big → bigger (雙寫 g)。長形容詞用 more。' },
    { id: 'GU3', skill: 'Grammar', level: 'U', topic: 'Superlative',
      instruction: '選出正確的最高級', prompt: 'He is the ___ student in our class.',
      options: [{ id: 'a', label: 'tall' }, { id: 'b', label: 'taller' }, { id: 'c', label: 'tallest', isCorrect: true }],
      concept: 'Superlative Adjective (最高級)',
      explanation: '看到 the + in the class 用最高級。tall → tallest。長形容詞用 the most。' }
  ],
  S: [
    { id: 'GS1', skill: 'Grammar', level: 'S', topic: 'Present Perfect',
      instruction: '選出正確的現在完成式', prompt: 'I ___ my homework already.',
      options: [{ id: 'a', label: 'have finished', isCorrect: true }, { id: 'b', label: 'finish' }, { id: 'c', label: 'finished' }],
      concept: 'Present Perfect Tense',
      explanation: '現在完成式 = have/has + p.p.。表「已完成」、「過去經驗到現在」、「持續到現在」。' },
    { id: 'GS2', skill: 'Grammar', level: 'S', topic: 'Past Perfect',
      instruction: '選出正確的過去完成式', prompt: 'I ___ dinner before Mom came home.',
      options: [{ id: 'a', label: 'eat' }, { id: 'b', label: 'had eaten', isCorrect: true }, { id: 'c', label: 'have eaten' }],
      concept: 'Past Perfect Tense',
      explanation: '兩動作都過去,先發生的用 had + p.p.。"吃完晚餐" 先於 "媽媽回家"。' },
    { id: 'GS3', skill: 'Grammar', level: 'S', topic: 'Perfect Continuous',
      instruction: '選出正確的完成進行式', prompt: 'I ___ to music for 3 hours.',
      options: [{ id: 'a', label: 'have listened' }, { id: 'b', label: 'have been listening', isCorrect: true }, { id: 'c', label: 'am listening' }],
      concept: 'Perfect Continuous Tense',
      explanation: '完成進行式 = have/has + been + V-ing,強調「動作從過去持續到現在仍在進行」。' }
  ],
  J6: [
    { id: 'GJ1', skill: 'Grammar', level: 'J6', topic: 'Mixed Tenses',
      instruction: '選出最合適的時態', prompt: 'When I ___ home yesterday, my mom ___ dinner.',
      options: [{ id: 'a', label: 'got / was cooking', isCorrect: true }, { id: 'b', label: 'get / cooks' }, { id: 'c', label: 'have got / cooked' }],
      concept: '時態綜合運用',
      explanation: '"當我到家時 (got)" 媽媽正在煮飯 (was cooking)。短暫過去 + 持續中的過去動作。' },
    { id: 'GJ2', skill: 'Grammar', level: 'J6', topic: 'Modal Verbs',
      instruction: '選出最合適的助動詞', prompt: 'You ___ wear a helmet when riding a bike.',
      options: [{ id: 'a', label: 'should', isCorrect: true }, { id: 'b', label: 'can' }, { id: 'c', label: 'will' }],
      concept: '情態助動詞',
      explanation: 'should 表「應該、建議」。can = 能夠,will = 將會,must = 必須,may = 可能。' }
  ]
};

const MODULES = [
  { id: 'phonics',    name: 'Phonics',    label: '發音認知', skill: 'Phonics',    questions: PHONICS_QUESTIONS },
  { id: 'spelling',   name: 'Spelling',   label: '拼字運用', skill: 'Spelling',   questions: SPELLING_QUESTIONS },
  { id: 'vocabulary', name: 'Vocabulary', label: '字彙能力', skill: 'Vocabulary', questions: VOCAB_QUESTIONS },
  { id: 'reading',    name: 'Reading',    label: '閱讀理解', skill: 'Reading',    questions: READING_QUESTIONS },
  { id: 'grammar',    name: 'Grammar',    label: '文法結構', skill: 'Grammar',    questions: [
    ...GRAMMAR_QUESTIONS.A, ...GRAMMAR_QUESTIONS.P, ...GRAMMAR_QUESTIONS.L,
    ...GRAMMAR_QUESTIONS.U, ...GRAMMAR_QUESTIONS.S, ...GRAMMAR_QUESTIONS.J6
  ] }
];

const TOTAL_QUESTIONS = MODULES.reduce((s, m) => s + m.questions.length, 0);

/* ════════════════════════════════════════════════════════════════
   ⭐ 年級分流計畫 (GRADE PLANS)
   coreLevels : 完整施測的級數
   ceilingIds : 「天花板探測題」— 讓程度超前的孩子有機會測到更高級
   ✏️ EDIT — 調整題目組成請改這裡
   ═══════════════════════════════════════════════════════════════ */
const GRADE_PLANS = {
  low:  { label: '低年級', coreLevels: ['A', 'P', 'L'],                  ceilingIds: ['V4', 'GU1'] },  // 30 題
  mid:  { label: '中年級', coreLevels: ['A','P','L','U','S','J6'],       ceilingIds: [] },             // 42 題
  high: { label: '高年級', coreLevels: ['A','P','L','U','S','J6'],       ceilingIds: [] }              // 42 題
};

const GRADE_OPTIONS = {
  low:  ['幼稚園', '小一', '小二'],
  mid:  ['小三', '小四'],
  high: ['小五', '小六', '國一', '國二以上'],
};

const CAMPUS_OPTIONS = ['總校', '龍華校', '左新校'];

function buildModules(gradeGroup) {
  const plan = GRADE_PLANS[gradeGroup];
  if (!plan) return MODULES;
  const allow = new Set(plan.coreLevels);
  const ceiling = new Set(plan.ceilingIds);
  return MODULES
    .map(m => ({ ...m, questions: m.questions.filter(q => allow.has(q.level) || ceiling.has(q.id)) }))
    .filter(m => m.questions.length > 0);
}

/* 依作答結果統計各級表現 */
function computeLevelStats(answers) {
  const stats = {};
  LEVELS.forEach(L => stats[L] = { correct: 0, total: 0 });
  answers.forEach(a => {
    if (a.level && stats[a.level]) {
      stats[a.level].total += 1;
      if (a.isCorrect) stats[a.level].correct += 1;
    }
  });
  return stats;
}

/* ⭐ 級數估計 (改良版)
   - 通過門檻 60%
   - 題數 < 2 的級數不採計 (避免單題定生死)
   - 需「連續兩級」未達標才停止,避免單一題型失常拉低整體判定 */
const PASS_RATE = 0.6;
const MIN_ITEMS = 2;
function estimateLevel(levelStats) {
  let achieved = 'A';
  let consecutiveFails = 0;
  for (const L of LEVELS) {
    const { correct, total } = levelStats[L];
    if (total < MIN_ITEMS) continue;
    if (correct / total >= PASS_RATE) { achieved = L; consecutiveFails = 0; }
    else { consecutiveFails += 1; if (consecutiveFails >= 2) break; }
  }
  return achieved;
}

/* ════════════════════════════════════════════════════════════════
   ⭐ 測驗紀錄保存 — 本機 localStorage (離線備援) + Firebase 雲端同步 (跨裝置共享)
   ═══════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'aplus_level_test_records_v1';
const MAX_RECORDS = 300;

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveRecord(record) {
  try {
    const list = loadRecords();
    list.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    return true;
  } catch { return false; }
}

/* 寫入雲端 (所有校區裝置共用同一份紀錄)，失敗時不影響本機保存與作答流程 */
function pushRecordToCloud(record) {
  return push(ref(db, 'records'), record)
    .then(() => true)
    .catch(err => { console.error('雲端同步失敗', err); return false; });
}

/* 讀取雲端所有紀錄，依測驗時間新到舊排序 */
async function loadRecordsFromCloud() {
  const snapshot = await get(ref(db, 'records'));
  if (!snapshot.exists()) return [];
  const val = snapshot.val();
  return Object.entries(val)
    .map(([id, r]) => ({ id, ...r }))
    .reverse();
}

function exportRecordsCSV(list) {
  if (!list || list.length === 0) { alert('目前沒有已保存的測驗紀錄。'); return; }
  const head = ['測驗時間','校區','姓名','年級','分流','判定級數','CEFR','總題數','答對','正確率(%)','用時(秒)',
                ...Object.keys(SKILL_TAGS).map(k => k + '正確率(%)')];
  const rows = list.map(r => [
    r.ts, r.campus || '', r.studentName, r.studentGrade, GRADE_PLANS[r.gradeGroup]?.label || r.gradeGroup,
    r.level, LEVEL_INFO[r.level]?.cefr || '', r.total, r.correct, r.accuracy, r.seconds,
    ...Object.keys(SKILL_TAGS).map(k => r.skillPct?.[k] ?? '')
  ]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `APLUS_程度測驗紀錄_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════
   ⭐ 歷史紀錄總覽 (老師端瀏覽所有已保存的測驗紀錄)
   ═══════════════════════════════════════════════════════════════ */
const RECORDS_PASSWORD = '1111';

function RecordsPasswordGate({ onBack, onUnlock }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (pwd === RECORDS_PASSWORD) onUnlock();
    else setError(true);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 gap-4 text-center">
      <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
        <Lock className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800">需要密碼才能查看</h2>
        <p className="text-slate-500 text-sm mt-1">請輸入密碼以進入歷史測驗紀錄總覽</p>
      </div>
      <input
        type="password" autoFocus value={pwd}
        onChange={e => { setPwd(e.target.value); setError(false); }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="密碼"
        className={`w-full max-w-[220px] px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-medium text-center focus:outline-none ${error ? 'border-red-400' : 'border-stone-200 focus:border-emerald-400'}`}
      />
      {error && <p className="text-red-500 text-xs font-bold">密碼錯誤，請再試一次</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onBack} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm">
          返回
        </button>
        <button onClick={submit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm">
          確認
        </button>
      </div>
    </div>
  );
}

function RecordsOverview({ onBack }) {
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [records, setRecords] = useState([]);
  const formatSeconds = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const fetchRecords = () => {
    setStatus('loading');
    loadRecordsFromCloud()
      .then(list => { setRecords(list); setStatus('ready'); })
      .catch(err => { console.error('讀取雲端紀錄失敗', err); setStatus('error'); });
  };

  useEffect(() => {
    if (unlocked) fetchRecords();
  }, [unlocked]);

  if (!unlocked) {
    return <RecordsPasswordGate onBack={onBack} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />歷史測驗紀錄總覽
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {status === 'ready' && `共 ${records.length} 筆紀錄（來自雲端，所有校區裝置共用）`}
            {status === 'loading' && '讀取中...'}
            {status === 'error' && '讀取雲端紀錄失敗，請檢查網路連線'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} title="重新整理"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-1.5">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={() => exportRecordsCSV(records)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" />匯出 CSV
          </button>
          <button onClick={onBack}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />返回
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
          <CloudOff className="w-10 h-10" />
          <p>讀取雲端紀錄失敗，請檢查網路連線後點右上角重新整理。</p>
        </div>
      ) : status !== 'ready' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
          <p>讀取中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
          <Info className="w-10 h-10" />
          <p>目前沒有已保存的測驗紀錄。</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-stone-200 rounded-2xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">時間</th>
                <th className="px-4 py-3">校區</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">年級</th>
                <th className="px-4 py-3">分流</th>
                <th className="px-4 py-3">判定級數</th>
                <th className="px-4 py-3">正確率</th>
                <th className="px-4 py-3">用時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.ts}</td>
                  <td className="px-4 py-3 text-slate-600">{r.campus || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.studentName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.studentGrade || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{GRADE_PLANS[r.gradeGroup]?.label || r.gradeGroup || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
                      Level {r.level} · {LEVEL_INFO[r.level]?.cefr}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.correct}/{r.total}（{r.accuracy}%）</td>
                  <td className="px-4 py-3 text-slate-600">{formatSeconds(r.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ⭐ 改良版語音選擇 — 老師等級語音優先
   ═══════════════════════════════════════════════════════════════ */
const TEACHER_VOICE_PRIORITY = [
  // 1. Microsoft 神經網路語音 (Windows 11 / Edge) — 品質最佳
  /Microsoft Aria.*Online/i, /Microsoft Jenny.*Online/i, /Microsoft Guy.*Online/i,
  /Microsoft Tony.*Online/i, /Microsoft Davis.*Online/i, /Microsoft Sara.*Online/i,
  // 2. Google 高品質語音 (Chrome)
  /Google US English/i, /Google UK English Female/i, /Google UK English Male/i,
  // 3. Apple Premium 語音 (Mac / iOS) — 老師音色佳
  /^Daniel.*Premium/i, /^Allison.*Premium/i, /^Ava.*Premium/i, /^Samantha.*Premium/i,
  // 4. Apple 標準語音 (有些 Mac 預設)
  /^Daniel/, /^Allison/, /^Ava/, /^Samantha/, /^Karen/, /^Moira/, /^Tessa/,
  // 5. Microsoft 一般語音 (舊版 Windows)
  /Microsoft Zira/i, /Microsoft David/i, /Microsoft Mark/i,
  // 6. 任何 en-US 語音
  null
];

function pickBestVoice(voices) {
  if (!voices || voices.length === 0) return null;
  for (const pattern of TEACHER_VOICE_PRIORITY) {
    if (pattern === null) {
      return voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
    }
    const found = voices.find(v => pattern.test(v.name) && v.lang.toLowerCase().startsWith('en'));
    if (found) return found;
  }
  return voices.find(v => v.lang.startsWith('en'));
}

function getEnglishVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'));
}

/* ════════════════════════════════════════════════════════════════
   主元件
   ═══════════════════════════════════════════════════════════════ */
export default function APLUSLevelTesting() {
  const [screen, setScreen] = useState('campus');
  const [campus, setCampus] = useState('');
  const [savedOk, setSavedOk] = useState(null);
  const [cloudSyncOk, setCloudSyncOk] = useState(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const speechPrimed = useRef(false);
  const [moduleIdx, setModuleIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showModuleIntro, setShowModuleIntro] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
const [gradeGroup, setGradeGroup] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  /* 載入語音清單 */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const enVoices = getEnglishVoices();
      setAvailableVoices(enVoices);
      if (!selectedVoiceName && enVoices.length > 0) {
        const best = pickBestVoice(enVoices);
        if (best) setSelectedVoiceName(best.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  /* 計時器 */
  useEffect(() => {
    if (screen !== 'testing') return;
    const t = setInterval(() => setTimeElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  /* ⭐ 依年級分流動態組題 */
  const activeModules = useMemo(() => buildModules(gradeGroup), [gradeGroup]);
  const totalQuestions = useMemo(
    () => activeModules.reduce((n, m) => n + m.questions.length, 0), [activeModules]);

  /* ⭐ iOS 解鎖:speechSynthesis 的第一次 speak() 必須發生在使用者手勢的同步流程中,
     否則之後由 setTimeout 觸發的播放全部會被 Safari 靜默擋掉。
     這裡在按鈕的 onClick 內先播一段無聲語音把引擎「叫醒」。 */
  const primeSpeech = () => {
    if (speechPrimed.current || !('speechSynthesis' in window)) return;
    try {
      const warm = new SpeechSynthesisUtterance(' ');
      warm.volume = 0;
      warm.rate = 10;
      window.speechSynthesis.speak(warm);
      speechPrimed.current = true;
    } catch { /* 忽略 */ }
  };

  /* ⭐ 階段歡迎語音：真人錄音檔，放在 public/audio/ 下。
     檔案不存在時 play() 會被靜默忽略，不影響測驗流程。 */
  const playClip = (name) => {
    try {
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/${name}.mp3`);
      audio.play().catch(() => {});
    } catch {}
  };

  const speak = (text, opts = {}) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();   // iOS/Chrome 偶發卡在 paused 狀態
    const u = new SpeechSynthesisUtterance(text);
    const voices = getEnglishVoices();
    const chosen = voices.find(v => v.name === selectedVoiceName) || pickBestVoice(voices);
    if (chosen) u.voice = chosen;
    u.lang = 'en-US';
    u.rate = opts.rate ?? 0.85;     // 稍慢方便孩子聽
    u.pitch = opts.pitch ?? 1.05;   // 略高更溫暖
    u.volume = 1;
    u.onstart = () => { setIsSpeaking(true); setAudioBlocked(false); };
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => { setIsSpeaking(false); setAudioBlocked(true); };
    window.speechSynthesis.speak(u);
    /* 1.5 秒內若完全沒開始發聲,判定為被瀏覽器擋下,提示改用播放鍵 */
    setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) setAudioBlocked(true);
    }, 1500);
  };

  const startTest = () => {
    primeSpeech();
    setModuleIdx(0); setQIdx(0); setAnswers([]); setSelectedOption(null);
    setFeedback(null); setIsLocked(false); setStreak(0); setTimeElapsed(0);
    setShowModuleIntro(true);
    setScreen('testing');
    playClip('welcome');
    setTimeout(() => playClip(`module-${activeModules[0].id}`), 1500);
  };

  const beginModule = () => {
    primeSpeech();
    setShowModuleIntro(false);
    setAudioBlocked(false);
    const firstQ = activeModules[moduleIdx].questions[0];
    if (firstQ?.audio) setTimeout(() => speak(firstQ.audio), 400);
  };

  const replayAudio = () => {
    primeSpeech();
    setAudioBlocked(false);
    const q = activeModules[moduleIdx].questions[qIdx];
    if (q?.audio) speak(q.audio);
  };

  const handleAnswer = (option) => {
    if (isLocked) return;
    setIsLocked(true);
    setSelectedOption(option.id);
    const q = activeModules[moduleIdx].questions[qIdx];
    const isCorrect = !!option.isCorrect;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setStreak(s => isCorrect ? s + 1 : 0);
    const newAnswer = {
      id: q.id, module: activeModules[moduleIdx].id, level: q.level || null,
      skill: q.skill, isCorrect, selected: option.id, concept: q.concept,
      topic: q.topic || null
    };
    const updated = [...answers, newAnswer];
    setAnswers(updated);
    setTimeout(() => goNext(updated), 1300);
  };

  const goNext = (currentAnswers = answers) => {
    setSelectedOption(null);
    setFeedback(null);
    setIsLocked(false);
    const currentModule = activeModules[moduleIdx];
    const nextQIdx = qIdx + 1;
    if (nextQIdx >= currentModule.questions.length) {
      const nextModuleIdx = moduleIdx + 1;
      if (nextModuleIdx >= activeModules.length) {
        finishTest(currentAnswers);
        return;
      }
      setModuleIdx(nextModuleIdx);
      setQIdx(0);
      setShowModuleIntro(true);
      playClip(`module-${activeModules[nextModuleIdx].id}`);
    } else {
      setQIdx(nextQIdx);
      const nextQ = currentModule.questions[nextQIdx];
      if (nextQ?.audio) setTimeout(() => speak(nextQ.audio), 350);
    }
  };

  const finishTest = (finalAnswers) => {
    window.speechSynthesis?.cancel();
    /* ⭐ 保存本次測驗紀錄：本機 localStorage (離線備援) + Firebase 雲端 (跨校區共享) */
    const lvlStats = computeLevelStats(finalAnswers);
    const correct = finalAnswers.filter(a => a.isCorrect).length;
    const skillPct = {};
    Object.keys(SKILL_TAGS).forEach(k => {
      const sub = finalAnswers.filter(a => a.skill === k);
      skillPct[k] = sub.length ? Math.round(sub.filter(a => a.isCorrect).length / sub.length * 100) : '';
    });
    const record = {
      ts: new Date().toLocaleString('zh-TW', { hour12: false }),
      campus, studentName: studentName.trim(), studentGrade: studentGrade.trim(), gradeGroup,
      level: estimateLevel(lvlStats),
      total: finalAnswers.length, correct,
      accuracy: finalAnswers.length ? Math.round(correct / finalAnswers.length * 100) : 0,
      seconds: timeElapsed, skillPct
    };
    setSavedOk(saveRecord(record));
    pushRecordToCloud(record).then(setCloudSyncOk);
    setScreen('dashboard');
    playClip('complete');
  };

  const totalAnswered = answers.length;
  const currentQuestion = screen === 'testing' && !showModuleIntro
    ? activeModules[moduleIdx].questions[qIdx] : null;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-slate-800 flex items-center justify-center p-0 sm:p-6 print:p-0 print:bg-white print:min-h-0">
      <div className={`w-full bg-white sm:rounded-3xl shadow-xl overflow-hidden flex flex-col transition-all duration-500 print:rounded-none print:shadow-none print:overflow-visible print:max-w-full
        ${screen === 'dashboard' || screen === 'records' ? 'max-w-6xl' : 'max-w-3xl h-screen sm:h-[88vh] sm:min-h-[680px]'}`}>
        {screen === 'campus' && (
          <div className="flex flex-col items-center justify-center h-full p-6 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                Welcome to A PLUS I.E.E. System: English Assessment
              </h1>
              <p className="text-slate-500 text-sm sm:text-base">
                請選擇測驗校區
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
              {CAMPUS_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => { setCampus(c); setScreen('grade'); }}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                >
                  <MapPin className="w-6 h-6 mb-2" />
                  <span className="text-lg font-bold">{c}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {screen === 'grade' && (
          <div className="flex flex-col items-center justify-center h-full p-6 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                Welcome to A PLUS I.E.E. System: English Assessment
              </h1>
              <p className="text-slate-500 text-sm sm:text-base">
                {campus && `${campus}・`}請選擇學生目前的年級，我們將為您安排最適合的測驗題目
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
              {[
                { key: 'low',  label: '低年級', sub: '幼稚園 ～ 小二',   emoji: '🌱', color: 'from-green-400 to-emerald-500',  levels: ['A', 'P'] },
                { key: 'mid',  label: '中年級', sub: '小三 ～ 小四',     emoji: '🌿', color: 'from-blue-400 to-sky-500',       levels: ['L', 'U'] },
                { key: 'high', label: '高年級', sub: '小五 ～ 小六以上', emoji: '🌳', color: 'from-violet-400 to-purple-500',  levels: ['S', 'J6'] },
              ].map(({ key, label, sub, emoji, color, levels }) => (
                <button
                  key={key}
                  onClick={() => { setGradeGroup(key); setScreen('intro'); }}
                  className={`group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 cursor-pointer`}
                >
                  <span className="text-3xl mb-2">{emoji}</span>
                  <span className="text-xl font-bold">{label}</span>
                  <span className="text-xs opacity-80 mt-1">{sub}</span>
                  <div className="flex gap-1 mt-2">
                    {levels.map(l => (
                      <span key={l} className="text-xs bg-white/20 rounded px-1.5 py-0.5 font-mono">{l}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setScreen('campus')} className="mt-6 text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2">
              ← 重新選擇校區
            </button>
            <button onClick={() => setScreen('records')}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />查看歷史測驗紀錄總覽
            </button>
          </div>
        )}
        {screen === 'records' && (
          <RecordsOverview onBack={() => setScreen('grade')} />
        )}
        {screen === 'intro' && (
          <IntroScreen
            modules={activeModules} totalQuestions={totalQuestions}
            gradeGroup={gradeGroup} onBack={() => setScreen('grade')}
            studentName={studentName} setStudentName={setStudentName}
            studentGrade={studentGrade} setStudentGrade={setStudentGrade}
            availableVoices={availableVoices}
            selectedVoiceName={selectedVoiceName} setSelectedVoiceName={setSelectedVoiceName}
            onTestVoice={(text) => speak(text)}
            onStart={startTest}
          />
        )}
        {screen === 'testing' && showModuleIntro && (
          <ModuleIntro module={activeModules[moduleIdx]} idx={moduleIdx} total={activeModules.length} onStart={beginModule} />
        )}
        {screen === 'testing' && !showModuleIntro && currentQuestion && (
          <TestingScreen
            question={currentQuestion} module={activeModules[moduleIdx]}
            qIdx={qIdx} totalAnswered={totalAnswered} totalQuestions={totalQuestions}
            timeElapsed={timeElapsed} formatTime={formatTime} streak={streak}
            selectedOption={selectedOption} feedback={feedback} onAnswer={handleAnswer}
            isSpeaking={isSpeaking} onReplayAudio={replayAudio} audioBlocked={audioBlocked}
          />
        )}
        {screen === 'dashboard' && (
          <Dashboard
            modules={activeModules} savedOk={savedOk} cloudSyncOk={cloudSyncOk}
            answers={answers} timeElapsed={timeElapsed} formatTime={formatTime}
            studentName={studentName} studentGrade={studentGrade} campus={campus}
            onRestart={() => { setSavedOk(null); setCloudSyncOk(null); setScreen('campus'); }}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   進場畫面 (含學生資料 + 語音選擇器)
   ═══════════════════════════════════════════════════════════════ */
function IntroScreen({ modules, totalQuestions, gradeGroup, onBack,
                      studentName, setStudentName, studentGrade, setStudentGrade,
                      availableVoices, selectedVoiceName, setSelectedVoiceName, onTestVoice, onStart }) {
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-white relative overflow-y-auto">
      <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-[1.75rem] flex items-center justify-center mb-5 shadow-md relative">
        <Apple className="w-9 h-9 text-white" strokeWidth={2.2} fill="currentColor" />
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-stone-100 flex items-center justify-center shadow-sm">
          <span className="text-[10px] font-black text-red-500">+</span>
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1.5">
        A.P.L.U.S<span className="text-red-500"> Level Testing</span>
      </h1>
      <p className="text-slate-500 font-medium text-sm mb-1">{SCHOOL_NAME} · {SCHOOL_TAGLINE}</p>
      <p className="text-emerald-600 text-xs font-bold mb-6">五大模組綜合診斷 · 自主作答版</p>

      {/* 學生資料 */}
      <div className="w-full max-w-sm space-y-2.5 mb-4">
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          placeholder="Name 姓名" autoFocus
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400 focus:bg-white" />
        <select value={studentGrade} onChange={e => setStudentGrade(e.target.value)}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:bg-white">
          <option value="" disabled>Grade 年級</option>
          {(GRADE_OPTIONS[gradeGroup] || []).map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* 🎙️ 語音設定 (可展開) */}
      <div className="w-full max-w-sm mb-4">
        <button onClick={() => setShowVoiceSettings(!showVoiceSettings)}
          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-between transition">
          <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 text-violet-500" />老師語音設定 (建議測試)</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showVoiceSettings ? 'rotate-90' : ''}`} />
        </button>
        {showVoiceSettings && (
          <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-left space-y-2">
            <p className="text-[11px] text-violet-700 leading-relaxed">
              不同裝置可用語音不同。建議聽聽看,選一個最像真實老師的音色。
              <br /><strong>推薦:</strong>Microsoft Aria / Daniel / Samantha
            </p>
            <select value={selectedVoiceName} onChange={e => setSelectedVoiceName(e.target.value)}
              className="w-full px-2.5 py-2 bg-white border border-violet-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-violet-400">
              {availableVoices.length === 0 && <option>載入中...</option>}
              {availableVoices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} {v.lang ? `(${v.lang})` : ''}
                </option>
              ))}
            </select>
            <button onClick={() => onTestVoice('Hello! Welcome to the level test. Are you ready?')}
              className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 transition text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
              <Play className="w-3 h-3" fill="currentColor" />試聽 ("Hello! Welcome to the level test.")
            </button>
          </div>
        )}
      </div>

      {/* 模組總覽 */}
      <div className="w-full max-w-sm space-y-1.5 mb-5 text-left">
        {modules.map(m => {
          const c = { Phonics: 'violet', Spelling: 'sky', Vocabulary: 'amber', Reading: 'rose', Grammar: 'emerald' }[m.skill];
          return <ModuleLine key={m.id} icon={SKILL_TAGS[m.skill].icon} color={c}
                   name={m.name} label={m.label} qCount={m.questions.length} />;
        })}
      </div>

      <button onClick={onStart} disabled={!studentName.trim()}
        className="w-full max-w-sm py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed active:scale-95 transition-all text-white rounded-2xl text-base font-bold flex items-center justify-center shadow-lg shadow-emerald-600/20">
        開始測驗 <ArrowRight className="w-4 h-4 ml-2" />
      </button>
      <p className="text-[11px] text-slate-400 mt-3">
        {GRADE_PLANS[gradeGroup]?.label || ''}試卷 · 共 {totalQuestions} 題 · 預估 {Math.round(totalQuestions * 0.32)} ~ {Math.round(totalQuestions * 0.42)} 分鐘
      </p>
      <button onClick={onBack} className="mt-2 text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2">
        ← 重新選擇年級
      </button>
    </div>
  );
}

function ModuleLine({ icon: Icon, color, name, label, qCount }) {
  const colors = {
    violet:  'bg-violet-50  border-violet-100  text-violet-600',
    sky:     'bg-sky-50     border-sky-100     text-sky-600',
    amber:   'bg-amber-50   border-amber-100   text-amber-600',
    rose:    'bg-rose-50    border-rose-100    text-rose-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600'
  };
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <div className="flex-1 text-xs font-bold text-slate-800">{name} <span className="text-slate-500 font-medium">{label}</span></div>
      <span className="text-[10px] font-bold text-slate-400">{qCount} 題</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   模組過場
   ═══════════════════════════════════════════════════════════════ */
function ModuleIntro({ module, idx, total, onStart }) {
  const tag = SKILL_TAGS[module.skill];
  const Icon = tag.icon;
  const tips = {
    phonics:    '聽音檔或看字母組合,選出正確答案。聽力題可以重複播放。',
    spelling:   '聽單字音檔或看缺空提示,選出正確的拼字。注意字尾與母音變化。',
    vocabulary: '看圖片、句子或同義詞提示,選出最符合語境的單字。',
    reading:    '仔細閱讀短文,然後選出符合文意的答案。答案必須能在原文找到依據。',
    grammar:    '依句意選出正確的文法結構。題目由淺入深,從基礎主詞動詞到完成式。'
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">模組 {idx + 1} / {total}</div>
      <div className={`w-20 h-20 ${tag.bg} ${tag.border} border-2 rounded-2xl flex items-center justify-center mb-5`}>
        <Icon className={`w-10 h-10 ${tag.color}`} strokeWidth={1.6} />
      </div>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1.5">{module.name}</h2>
      <p className="text-base text-slate-500 mb-1">{module.label}</p>
      <p className="text-sm text-slate-400 mb-7">本模組共 {module.questions.length} 題</p>
      <div className={`w-full max-w-md ${tag.bg} ${tag.border} border rounded-2xl p-4 mb-7 text-left`}>
        <p className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Lightbulb className={`w-4 h-4 ${tag.color}`} />作答提示
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">{tips[module.id]}</p>
      </div>
      <button onClick={onStart}
        className="w-full max-w-sm py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white rounded-2xl text-base font-bold flex items-center justify-center shadow-lg shadow-emerald-600/20">
        開始 {module.name} <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   測驗畫面
   ═══════════════════════════════════════════════════════════════ */
function TestingScreen({ question, module, qIdx, totalAnswered, totalQuestions, timeElapsed, formatTime, streak, selectedOption, feedback, onAnswer, isSpeaking, onReplayAudio, audioBlocked }) {
  const tag = SKILL_TAGS[question.skill];
  const SkillIcon = tag.icon;
  const overallProgress = ((totalAnswered + 1) / totalQuestions) * 100;
  const moduleProgress = ((qIdx + 1) / module.questions.length) * 100;

  return (
    <div className="flex-1 flex flex-col bg-white relative">
      <div className="px-5 sm:px-8 py-3 border-b border-stone-100 z-20">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${tag.color}`}>{module.name}</span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] font-bold text-slate-500">{qIdx + 1} / {module.questions.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-100 text-slate-500 font-mono text-[11px] font-bold">
            <Timer className="w-3 h-3" />{formatTime(timeElapsed)}
          </div>
        </div>
        <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${moduleProgress}%`, backgroundColor: tag.hex }} />
        </div>
        <div className="flex justify-between items-center mt-1 text-[9px] text-slate-400 font-bold">
          <span>整體進度</span>
          <span>{totalAnswered + 1} / {totalQuestions}</span>
        </div>
        <div className="h-0.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(overallProgress, 100)}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 sm:p-8 w-full max-w-2xl mx-auto overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <div className={`flex items-center gap-1.5 transition-all ${streak > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />
            <span className="font-bold text-orange-600 text-xs">{streak} 連勝!</span>
          </div>
          <div className="flex items-center gap-1.5">
            {question.level && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-stone-100 text-slate-600 tracking-wider">
                Level {question.level}
              </span>
            )}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${tag.bg} ${tag.border} ${tag.color}`}>
              <SkillIcon className="w-3 h-3" />
              <span className="text-[10px] font-bold tracking-wider">{tag.label}</span>
            </div>
          </div>
        </div>

        <div className="inline-flex items-start gap-2.5 bg-stone-50 border border-stone-200 px-3.5 py-2.5 rounded-xl mb-5 w-fit">
          <Lightbulb className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span className="font-bold text-slate-700 text-sm leading-snug">{question.instruction}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full mb-5">
          <QuestionContent question={question} isSpeaking={isSpeaking} onReplayAudio={onReplayAudio} audioBlocked={audioBlocked} />
        </div>

        <div className="flex flex-col gap-3">
          {question.options.map(opt => {
            const isSel = selectedOption === opt.id;
            const showCorrect = feedback && opt.isCorrect;
            const showWrong = feedback === 'incorrect' && isSel;
            let style = 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-stone-50';
            if (showCorrect) style = 'bg-emerald-50 border-emerald-500 shadow-md';
            else if (showWrong) style = 'bg-rose-50 border-rose-400';
            else if (selectedOption !== null) style = 'bg-white border-stone-200 opacity-40';
            return (
              <button key={opt.id} onClick={() => onAnswer(opt)} disabled={selectedOption !== null}
                className={`w-full p-3.5 sm:p-4 rounded-xl text-left flex items-center justify-between border-2 transition-all ${style}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                    ${showCorrect ? 'bg-emerald-500 text-white' : showWrong ? 'bg-rose-500 text-white' : 'bg-stone-100 text-slate-500'}`}>
                    {opt.id.toUpperCase()}
                  </div>
                  <span className={`text-base sm:text-lg font-bold
                    ${showCorrect ? 'text-emerald-900' : showWrong ? 'text-rose-900' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                </div>
                {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {showWrong && <XCircle className="w-5 h-5 text-rose-500" />}
              </button>
            );
          })}
        </div>

        {feedback === 'correct' && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">答對了!做得好。</span>
          </div>
        )}
        {feedback === 'incorrect' && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <Heart className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <span className="text-xs font-medium text-amber-800">沒關係,錯誤是學習的好機會。完整解析會在最後的報告中。</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* 題目主體 (依題型渲染) */
function QuestionContent({ question, isSpeaking, onReplayAudio, audioBlocked }) {
  // 1. Phonics 閃卡題
  if (question.flashcard) {
    const tone = FLASHCARD_TONE[question.flashcard.tone];
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider">
          {tone.label} Flashcard
        </div>
        <div className="rounded-2xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: tone.bg, width: '180px', height: '180px' }}>
          <span className="text-white font-black tracking-wide" style={{ fontSize: '64px' }}>
            {question.flashcard.letters}
          </span>
        </div>
      </div>
    );
  }

  // 2. 聽力題 (有 audio)
  if (question.audio) {
    const needsTap = audioBlocked && !isSpeaking;
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <button onClick={onReplayAudio} aria-label="播放題目語音"
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-sm border-4 transition-all active:scale-95
            ${isSpeaking
              ? 'bg-emerald-50 border-emerald-100 scale-105'
              : needsTap
                ? 'bg-emerald-600 border-emerald-200 animate-pulse'
                : 'bg-white border-stone-100 hover:border-emerald-200'}`}>
          {isSpeaking
            ? <AudioLines className="w-9 h-9 text-emerald-600 animate-pulse" />
            : <Volume2 className={`w-9 h-9 ${needsTap ? 'text-white' : 'text-slate-400'}`} />}
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-700">
          {needsTap ? '請按一下喇叭聽題目' : '點擊播放音檔'}
        </h3>
        {needsTap
          ? <p className="text-xs text-amber-600 font-bold">此裝置需要手動播放 · 可重複點擊</p>
          : <p className="text-xs text-slate-400">可重複播放,聽清楚再作答</p>}
      </div>
    );
  }

  // 3. 閱讀題 (有 passage)
  if (question.passage) {
    return (
      <div className="w-full space-y-3">
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
          <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Library className="w-3 h-3" />Reading Passage
          </div>
          <p className="text-base sm:text-lg text-slate-800 leading-relaxed">{question.passage}</p>
        </div>
        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
          <p className="text-sm font-bold text-slate-700">{question.prompt}</p>
        </div>
      </div>
    );
  }

  // 4. 對話題 (chatA + chatB)
  if (question.chatA) {
    return (
      <div className="w-full space-y-3">
        <div className="bg-stone-50 p-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-stone-100">
          <p className="text-base sm:text-lg font-semibold text-slate-700">{question.chatA}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl rounded-tr-sm max-w-[85%] ml-auto border border-emerald-100">
          <p className="text-base sm:text-lg font-bold text-emerald-900">{question.chatB}</p>
        </div>
      </div>
    );
  }

  // 5. 一般題目 (prompt)
  return (
    <h3 className={`font-bold text-slate-800 leading-snug text-center ${question.isEmojiBig ? 'text-7xl my-2' : 'text-xl sm:text-2xl'}`}>
      {question.prompt}
    </h3>
  );
}

/* ════════════════════════════════════════════════════════════════
   Dashboard — 含學校優勢 + 招生 CTA
   ═══════════════════════════════════════════════════════════════ */
function Dashboard({ modules = MODULES, savedOk, cloudSyncOk, answers, timeElapsed, formatTime, studentName, studentGrade, campus, onRestart }) {
  const [view, setView] = useState('student');

  // 計算每模組真實表現
  const moduleStats = useMemo(() => {
    const stats = {};
    modules.forEach(m => stats[m.id] = { correct: 0, total: 0 });
    answers.forEach(a => {
      if (!stats[a.module]) stats[a.module] = { correct: 0, total: 0 };
      stats[a.module].total += 1;
      if (a.isCorrect) stats[a.module].correct += 1;
    });
    return stats;
  }, [answers, modules]);

  // 計算每級表現 (用於估計級數)
  const levelStats = useMemo(() => computeLevelStats(answers), [answers]);
  const estimatedLevel = useMemo(() => estimateLevel(levelStats), [levelStats]);

  const nextLevelIdx = Math.min(LEVELS.indexOf(estimatedLevel) + 1, LEVELS.length - 1);
  const nextLevel = LEVELS[nextLevelIdx];
  const levelData = LEVEL_INFO[estimatedLevel];
  const nextLevelData = LEVEL_INFO[nextLevel];

  const totalCorrect = answers.filter(a => a.isCorrect).length;
  const totalAnswered = answers.length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const mistakes = useMemo(() => answers.filter(a => !a.isCorrect).map(a => {
    const allQs = modules.flatMap(m => m.questions);
    const fullQ = allQs.find(q => q.id === a.id);
    return { ...a, fullQuestion: fullQ };
  }), [answers, modules]);

  const radarData = Object.keys(SKILL_TAGS).map(s => {
    const moduleStat = moduleStats[s.toLowerCase()] || { correct: 0, total: 0 };
    return {
      label: s,
      value: moduleStat.total > 0 ? Math.round((moduleStat.correct / moduleStat.total) * 100) : 0,
      raw: `${moduleStat.correct}/${moduleStat.total}`
    };
  });

  return (
    <div className="bg-stone-50 flex flex-col h-full overflow-y-auto print:h-auto print:overflow-visible print:bg-white">
      <div className="bg-white px-5 sm:px-10 py-4 border-b border-stone-200 flex justify-between items-center sticky top-0 z-30 print:static">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />Level Testing 結果報告
          </h2>
          {studentName && <p className="text-[11px] text-slate-500 mt-0.5">學生:{studentName} {studentGrade && `· ${studentGrade}`} {campus && `· ${campus}`}</p>}
          {savedOk === true && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ 已保存至本機紀錄</p>}
          {savedOk === false && <p className="text-[10px] text-amber-600 font-bold mt-0.5">⚠ 本機儲存失敗（可能為無痕模式），請立即匯出</p>}
          {cloudSyncOk === true && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">☁ 已同步雲端</p>}
          {cloudSyncOk === false && <p className="text-[10px] text-amber-600 font-bold mt-0.5">⚠ 雲端同步失敗（已保留在本機，請檢查網路連線）</p>}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="bg-stone-100 rounded-lg p-1 flex">
            <button onClick={() => setView('student')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${view === 'student' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
              <User className="w-3 h-3" /><span className="hidden sm:inline">學生</span>
            </button>
            <button onClick={() => setView('educator')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${view === 'educator' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
              <GraduationCap className="w-3 h-3" /><span className="hidden sm:inline">教育者</span>
            </button>
          </div>
          <button onClick={() => window.print()} title="列印或匯出本次結果為 PDF"
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1">
            <Printer className="w-3 h-3" /><span className="hidden sm:inline">匯出 PDF</span>
          </button>
          <button onClick={onRestart} className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /><span className="hidden sm:inline">重測</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-5 max-w-7xl mx-auto w-full pb-12">
        {/* 左側 */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-emerald-600 p-7 rounded-[1.75rem] shadow-lg text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10"><Globe2 className="w-56 h-56" /></div>
            <div className="relative z-10">
              <p className="text-emerald-100 uppercase tracking-widest text-xs font-bold mb-2">CEFR 國際等級</p>
              <h1 className="text-6xl sm:text-7xl font-black mb-5 tracking-tighter">{levelData.cefr}</h1>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-emerald-50 uppercase tracking-widest text-[10px] font-bold mb-1">A.P.L.U.S 對標</p>
                <h3 className="text-xl font-bold">Level {estimatedLevel}</h3>
                <p className="text-emerald-100/90 text-xs mt-1.5">{levelData.name}</p>
                <p className="text-emerald-50/70 text-[11px] mt-1">適合年級:{levelData.grade}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100 grid grid-cols-3 gap-2 text-center">
            <Stat icon={CheckCircle2} value={totalCorrect} label="答對" color="text-emerald-600" />
            <Stat icon={Target}       value={`${overallAccuracy}%`} label="正確率" color="text-sky-600" />
            <Stat icon={Timer}        value={formatTime(timeElapsed)} label="總用時" color="text-violet-600" />
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">五大能力雷達 (實測)</h3>
            <div className="flex justify-center"><RadarChart metrics={radarData} /></div>
          </div>
        </div>

        {/* 右側 */}
        <div className="lg:col-span-8">
          {view === 'student' ? (
            <StudentView
              modules={modules}
              levelData={levelData} estimatedLevel={estimatedLevel}
              nextLevel={nextLevel} nextLevelData={nextLevelData}
              moduleStats={moduleStats} mistakes={mistakes}
            />
          ) : (
            <EducatorView
              levelData={levelData} estimatedLevel={estimatedLevel}
              nextLevel={nextLevel} nextLevelData={nextLevelData}
              moduleStats={moduleStats} levelStats={levelStats}
              mistakes={mistakes} answers={answers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="text-lg font-black text-slate-800">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   學生視角 — 鼓勵 + 下一級預覽 + 學校優勢 + CTA
   ═══════════════════════════════════════════════════════════════ */
function StudentView({ modules = MODULES, levelData, estimatedLevel, moduleStats, mistakes }) {
  const currentHighlights = COURSE_HIGHLIGHTS[estimatedLevel] || [];

  return (
    <div className="flex flex-col gap-5">
      {/* 鼓勵性開場 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white relative overflow-hidden">
        <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-20" />
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Star className="w-5 h-5" fill="currentColor" />恭喜完成測驗!
        </h3>
        <p className="text-emerald-50 text-sm leading-relaxed">
          你目前的程度是 <strong>Level {estimatedLevel} ({levelData.cefr})</strong> — {levelData.name}!{levelData.desc}
        </p>
      </div>

      {/* 5 大能力成績單 */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />我的能力成績單
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {modules.map(m => {
            const stat = moduleStats[m.id] || { correct: 0, total: 0 };
            const tag = SKILL_TAGS[m.skill];
            return <SkillBar key={m.id} title={`${m.name} ${m.label}`} correct={stat.correct} total={stat.total} hex={tag.hex} />;
          })}
        </div>
      </div>

      {/* ⭐ 你的下一階學習路徑 */}
      {estimatedLevel !== 'J6' && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 sm:p-6 rounded-2xl relative overflow-hidden">
          <Rocket className="absolute -top-2 -right-2 w-24 h-24 text-amber-200 opacity-50 rotate-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">YOUR NEXT STEP</p>
            <h3 className="text-lg sm:text-xl font-black text-amber-900 mb-2">
              🎓 接下來,在 Level {estimatedLevel} 你會學到
            </h3>
            <p className="text-amber-800/90 text-sm mb-4">
              <strong>{levelData.name}</strong> ({levelData.cefr}) · 適合 {levelData.grade} · {levelData.desc}
            </p>
            <div className="bg-white/70 backdrop-blur-sm border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5" />課程重點
              </p>
              <ul className="space-y-1.5">
                {currentHighlights.map((h, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ 為什麼選擇 [學校] */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
        <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Medal className="w-4 h-4 text-red-500" />為什麼選擇 {SCHOOL_NAME}
        </h3>
        <p className="text-xs text-slate-500 mb-4">{SCHOOL_TAGLINE}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCHOOL_ADVANTAGES.map((adv, i) => {
            const Icon = adv.icon;
            return (
              <div key={i} className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-stone-100">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-1">{adv.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{adv.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 錯題回顧 */}
      {mistakes.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
          <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />錯題回顧 ({mistakes.length} 題)
          </h3>
          <p className="text-xs text-slate-500 mb-4">每一個錯誤都是進步的踏腳石。慢慢看完每題的解析,你就贏了!</p>
          <div className="space-y-3">
            {mistakes.map((m, i) => <ReviewCard key={i} mistake={m} index={i} />)}
          </div>
        </div>
      )}
      {mistakes.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center text-center">
          <Award className="w-10 h-10 text-emerald-600 mb-2" />
          <h4 className="font-bold text-emerald-800 text-base">完美!沒有任何錯題</h4>
          <p className="text-emerald-700 text-sm mt-1">你的概念非常扎實,可以挑戰更高難度!</p>
        </div>
      )}
    </div>
  );
}

function studentNameOrYou() { return '你'; }

function SkillBar({ title, correct, total, hex }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  let label = '尚未測試', labelClass = 'bg-stone-100 text-slate-500';
  if (total === 0) {} 
  else if (pct >= 80) { label = '表現極佳'; labelClass = 'bg-emerald-100 text-emerald-700'; }
  else if (pct >= 60) { label = '基礎扎實'; labelClass = 'bg-sky-100 text-sky-700'; }
  else if (pct >= 40) { label = '需要練習'; labelClass = 'bg-amber-100 text-amber-700'; }
  else                { label = '建議加強'; labelClass = 'bg-rose-100 text-rose-800'; }
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="font-bold text-slate-700 text-sm">{title}</span>
          <span className="text-[10px] text-slate-400 ml-1.5">({correct}/{total})</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${labelClass}`}>{label}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: hex }} />
      </div>
    </div>
  );
}

/* 錯題回顧卡片 */
function ReviewCard({ mistake, index }) {
  const [expanded, setExpanded] = useState(false);
  const q = mistake.fullQuestion;
  if (!q) return null;
  const userAnswer = q.options.find(o => o.id === mistake.selected);
  const correctAnswer = q.options.find(o => o.isCorrect);
  const skillTag = SKILL_TAGS[q.skill];
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-50 transition">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black shrink-0">{index + 1}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800">{q.concept}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${skillTag.bg} ${skillTag.color}`}>{skillTag.label}</span>
              {q.level && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-slate-600">Lv.{q.level}</span>}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{q.prompt || q.chatA || q.passage || '聽力題'}</div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-100 bg-stone-50/50 space-y-3">
          <div className="text-xs">
            <div className="font-bold text-slate-500 mb-1">📝 題目</div>
            <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-slate-700">
              {q.passage && <div className="text-slate-600 mb-1.5 italic">{q.passage}</div>}
              {q.chatA && <div className="mb-1"><span className="text-slate-400">A:</span> {q.chatA}</div>}
              {q.chatB && <div><span className="text-slate-400">B:</span> {q.chatB}</div>}
              {!q.chatA && !q.passage && (q.prompt || (q.audio ? `(聽力題:${q.audio})` : '聽力題'))}
              {q.passage && q.prompt && <div className="mt-1.5 font-bold">{q.prompt}</div>}
              {q.flashcard && <div className="mt-1.5 font-bold">閃卡:{q.flashcard.letters}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <div className="text-[10px] font-bold text-rose-600 uppercase mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" />你的答案</div>
              <div className="font-bold text-rose-900">{userAnswer?.label}</div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />正解</div>
              <div className="font-bold text-emerald-900">{correctAnswer?.label}</div>
            </div>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />概念解析
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">{q.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   教育者視角 — 教學藍圖 + 各級達成度
   ═══════════════════════════════════════════════════════════════ */
function EducatorView({ levelData, estimatedLevel, nextLevel, nextLevelData, moduleStats, levelStats, mistakes, answers }) {
  const conceptFreq = useMemo(() => {
    const map = {};
    mistakes.forEach(m => { map[m.concept] = (map[m.concept] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-violet-50 border border-violet-200 p-4 rounded-2xl flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-violet-900 font-bold text-sm mb-1">教育者報告</h4>
          <p className="text-violet-700/90 text-xs leading-relaxed">
            提供精細化的學習目標達成度、概念弱點聚類、課堂與家庭練習建議,協助您針對性輔導。
          </p>
        </div>
      </div>

      {/* 各級達成度概覽 */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />六級達成度概覽
        </h3>
        <div className="space-y-2">
          {LEVELS.map(L => {
            const { correct, total } = levelStats[L];
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            const info = LEVEL_INFO[L];
            const isCurrent = L === estimatedLevel;
            return (
              <div key={L} className={`p-3 rounded-lg border flex items-center gap-3
                ${isCurrent ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-stone-50 border-stone-200'}`}>
                <div className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-xs shrink-0
                  ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-slate-600'}`}>{L}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{info.name}</span>
                    <span className="text-[10px] text-slate-500">({info.cefr})</span>
                    {isCurrent && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">當前估計</span>}
                  </div>
                  <div className="h-1 bg-white border border-stone-200 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 60 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#F43F5E' }} />
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600 w-16 text-right">
                  {total > 0 ? `${pct}% (${correct}/${total})` : '未測'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 學習目標達成 */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
        <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />Level {estimatedLevel} 學習目標達成
        </h3>
        <p className="text-xs text-slate-500 mb-4">基於本級實際作答表現估計</p>
        <div className="space-y-2">
          {levelData.objectives.map((obj, i) => {
            const lvlStat = levelStats[estimatedLevel];
            const isMaster = lvlStat.total === 0 || (lvlStat.correct / lvlStat.total) >= 0.7;
            return (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isMaster ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                {isMaster ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                <span className={`text-sm font-medium flex-1 ${isMaster ? 'text-emerald-900' : 'text-amber-900'}`}>{obj}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isMaster ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                  {isMaster ? '已達成' : '需加強'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 弱點聚類 */}
      {conceptFreq.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
          <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />核心弱點概念聚類
          </h3>
          <p className="text-xs text-slate-500 mb-4">依錯題頻率排序,協助聚焦最需優先補強的概念。</p>
          <div className="space-y-2">
            {conceptFreq.map(([concept, count], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center">{i + 1}</div>
                  <span className="text-sm font-bold text-slate-800">{concept}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded">錯誤 {count} 次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教學藍圖 */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-100">
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-emerald-600" />下一階段教學藍圖
        </h3>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
          <p className="text-emerald-800 font-bold text-sm mb-1">建議目標:Level {nextLevel} ({nextLevelData.name}) - {nextLevelData.cefr}</p>
          <p className="text-emerald-700 text-xs leading-relaxed">{nextLevelData.desc}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl">
            <h5 className="text-xs font-black text-sky-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />課堂教學重點
            </h5>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li>針對核心弱點概念設計小單元</li>
              <li>使用情境式對話強化口語應用</li>
              <li>多模態教學:聽 → 說 → 讀 → 寫</li>
              <li>每週小考追蹤精熟程度</li>
            </ul>
          </div>
          <div className="bg-violet-50 border border-violet-100 p-4 rounded-xl">
            <h5 className="text-xs font-black text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />家庭練習建議
            </h5>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li>每日 15 分鐘音檔聽寫</li>
              <li>每週閱讀 1 篇 {nextLevelData.cefr} 級短文</li>
              <li>用錯題回顧重做 1~2 次</li>
              <li>多用鼓勵語言降低焦慮</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   雷達圖
   ═══════════════════════════════════════════════════════════════ */
function RadarChart({ metrics }) {
  const size = 240;
  const center = size / 2;
  const radius = size / 2 - 36;
  const getXY = (value, i, total) => {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const points = metrics.map((m, i) => getXY(m.value, i, metrics.length));
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridLevels = [100, 75, 50, 25];
  return (
    <svg width={size} height={size} className="overflow-visible">
      {gridLevels.map((lvl, i) => (
        <polygon key={i}
          points={metrics.map((_, j) => `${getXY(lvl, j, metrics.length).x},${getXY(lvl, j, metrics.length).y}`).join(' ')}
          fill="none" stroke={lvl === 100 ? '#E2E8F0' : '#F1F5F9'} strokeWidth="1" />
      ))}
      {metrics.map((_, i) => (
        <line key={`a-${i}`} x1={center} y1={center}
          x2={getXY(100, i, metrics.length).x} y2={getXY(100, i, metrics.length).y}
          stroke="#F1F5F9" strokeWidth="1" />
      ))}
      <polygon points={polygonPoints} fill="rgba(5,150,105,0.18)" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={`d-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#059669" stroke="#FFF" strokeWidth="1.5" />)}
      {metrics.map((m, i) => {
        const p = getXY(125, i, metrics.length);
        return (
          <g key={`l-${i}`}>
            <text x={p.x} y={p.y - 5} textAnchor="middle" className="text-[10px] font-bold fill-slate-600 uppercase tracking-wider">{m.label}</text>
            <text x={p.x} y={p.y + 7} textAnchor="middle" className="text-[9px] font-medium fill-slate-400">{m.raw}</text>
          </g>
        );
      })}
    </svg>
  );
}
