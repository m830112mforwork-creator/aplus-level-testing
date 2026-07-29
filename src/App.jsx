import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import {
  Volume2, RotateCcw, Compass, Zap, BookOpen, Crown, TrendingUp,
  BarChart3, AudioLines, Target, AlertCircle, Lightbulb, Globe2, Ear,
  Type, BrainCircuit, BookText, Timer, Flame, Sparkles, CheckCircle2,
  XCircle, GraduationCap, Heart, Award, ArrowRight, ChevronRight,
  User, Users, Star, FileText, Apple, Pencil, Library, Mic, Settings,
  Play, BookMarked, Rocket, Medal, Phone, ChevronLeft, Info, Printer, Lock, MapPin, CloudOff, RefreshCcw, Pause, Trash2
} from 'lucide-react';
import { db } from './firebase';
import { ref, push, get, remove } from 'firebase/database';
/* jsPDF 與 html2canvas 約 370KB,只有結果頁按下「匯出 PDF」才用得到,
   因此改為動態載入 (見 exportPdf),避免拖慢學生一開始開啟網站的速度 */
/* ════════════════════════════════════════════════════════════════
   A.P.L.U.S Level Testing v4 — Recruitment-Optimized
   • 5 模組綜合診斷 (跳過 Speaking,自主作答)
   • 6 級別 (含 AP)
   • 改良語音 (神經網路語音優先) + 試聽選擇器
   • 學校優勢區塊 (萃取自教師手冊,可編輯)
   • 下一級課程預覽 + 招生 CTA
   ═══════════════════════════════════════════════════════════════ */

/* 題庫標記用的級數序列 (Pre-A 不在此列,它是「未達 A 級」的判定結果,沒有對應題目) */
const LEVELS = ['A', 'P', 'L', 'U', 'S', 'AP'];

/* 未達 A 級門檻時的判定結果 */
const PRE_A = 'Pre-A';

/* 判定級數 → 接下來要就讀的級數。
   Pre-A 的學生下一步就是進入 Level A,因此課程重點與級數說明一律沿用 Level A,不另立一套內容。 */
const studyLevelOf = (level) => (level === PRE_A ? 'A' : level);

const LEVEL_INFO = {
  /* Pre-A 僅用於呈現「判定結果」本身;課程內容一律取 Level A */
  [PRE_A]: { name: 'Pre-Adventurers', cefr: 'Starter', icon: Sparkles, grade: '英語啟蒙階段',
        desc: '正在打下英語的第一塊基石,再往前一步就能進入 Level A!' },
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
  AP: { name: 'Adv. Placement',      cefr: 'A2+',    icon: Award,      grade: '小六 ~ 國中銜接',
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
const SCHOOL_NAME = '耶加I.E.E. System';               // ✏️ EDIT 學校名稱
const SCHOOL_TAGLINE = '對標 CEFR 國際標準的全面英語養成';  // ✏️ EDIT 標語

/* ✏️ EDIT 學校優勢 — 萃取自教師手冊的核心特色 */
const SCHOOL_ADVANTAGES = [
  { icon: Globe2,
    title: 'CEFR 國際標準對標',
    desc: '6 級數精細對應 Pre-A1 ~ A2+,從 Adventurers 到 Adv. Placement,每一級都有國際語言檢定的明確定位,銜接歐洲共同語文參考標準。' },
  { icon: BarChart3,
    title: '5 大能力綜合培養',
    desc: '不只應付學校考試 — Phonics 發音、Spelling 拼字、Vocabulary 字彙、Reading 閱讀、Grammar 文法五大領域均衡發展,打造真正的英語實力。' },
  { icon: Type,
    title: '耶加獨創 PPS 自然發音學習法',
    desc: 'Phonics 發音規則 / Pronunciation 嘴型矯正 / Spelling 拼寫,三位一體。用顏色分類記憶各式發音,搭配老師逐一矯正嘴型 (如 a 與 e、o 與 u 的差異),孩子不再只靠聽力模仿,而是用邏輯拼出、唸準沒學過的新單字。' },
  { icon: BrainCircuit,
    title: '文法系統化六級進階',
    desc: '依認知發展設計:A 級 Be 動詞 → P 級現在進行式 → L 級過去式 → U 級未來式與比較級 → S 級完成式 → AP 級國中銜接,循序漸進不混亂。' },
  { icon: Sparkles,
    title: '多模態評量標準',
    desc: '每個文法概念皆要求「讀 / 寫 / 造句 / 正確中文解釋 / 舉一反三」五合一通過,確保孩子是真正理解而非短期記憶。' },
  { icon: Heart,
    title: '溫暖鼓勵式學習文化',
    desc: '從打招呼擁抱開始建立信任,Ms./Mr. 尊師文化培養禮貌,老師主動避免讓話題中斷,讓孩子在零焦慮的環境中建立英語自信。' }
];

/* ✏️ EDIT 各級數課程組成 (取自《各級數學習規劃》) — AP 未列於該文件,故不提供 */
const COURSE_MODULES = {
  A: ['A.P.O. 單字 & 句型', 'A.P.O. Grammar 文法', 'Phonics & Reading', 'Speaking 口說'],
  P: ['A.P.O. 單字 & 句型', 'A.P.O. Grammar 文法', 'Phonics & Reading', 'Speaking 口說'],
  L: ['A.P.O. 單字 & 句型', 'A.P.O. Grammar 文法', 'Phonics & Reading', 'Speaking 口說'],
  U: ['H.H.H.', 'Simply Grammar 4', 'KK 音標 & Reading', 'Speaking 口說'],
  S: ['GEPT 全民英檢 (單字/句型/片語/口說)', 'KK 音標', 'Part of Speech 詞性', 'Reading 閱讀', 'Speaking 口說']
};

/* ✏️ EDIT 各級數課程亮點 — 用於「下一級預覽」
   註:Pre-A 沒有獨立內容,判定為 Pre-A 的學生一律顯示 Level A 的課程重點 (見 studyLevelOf) */
const COURSE_HIGHLIGHTS = {
  A: [
    { label: '單字', text: '單字與句型建構的黃金期。以 A.P.O. 耶加原創教材識讀與拼寫，同步建立同義字／反義字的邏輯，並融入外國文化與 E 世代用語（scan the QR code、erasable pen、pencil lead）。' },
    { label: '句型', text: '三大類句型完整建立：Yes / No 問答、單複數句型、助動詞問答。例如 Is it a / an ___? → Yes, it is. / No, it isn’t.，並延伸到能表達個人想法的多元對話。' },
    { label: '文法', text: 'Article 定冠詞 (a / an / the)、Singular and Plural Nouns 單複數名詞、Subject Pronouns 主詞代名詞搭配 Be 動詞、縮寫 (I am → I’m)、can 助動詞 + 原形動詞。以連載漫畫與耶加原創文法口訣（唱誦＋手勢）記憶，不必死背公式。' },
    { label: '發音', text: '耶加獨創 PPS 學習法 (Phonics / Pronunciation / Spelling)，用顏色分類記憶發音：Aa–Zz 26 字母發音、短母音 (a, e, i, o, u) 與長母音 (a_e, e_e, i_e, o_e, u_e) 嘴型矯正、易混淆組合比較 (k vs. qu、ch vs. sh、t vs. th、f vs. ph)，並搭配格線訓練精準的書寫習慣。' },
    { label: '閱讀', text: '從生活題材入門（開箱書包、文具店偷竊案筆錄、速食店點餐、動物園日記），用發音技巧拼讀未學過的單字，同時複習同級的文法概念，建立獨立閱讀英文文章的能力。' },
    { label: '口說', text: '重視語調、發音、尾音與連音，搭配耶加專屬 intonation 語調符號；並有耶加文化特色的 Outdoor Sentence 戶外英文，讓孩子自信地在教室外開口說英語。' }
  ],
  P: [
    { label: '單字', text: '透過中階自然發音概念，學習較長單字，對識讀有更佳的反應，聽寫亦有更紮實的訓練。' },
    { label: '句型', text: '融合三單等較有變化的句型，讓學生在生活活用。' },
    { label: '口說', text: '提升生活會話的反應能力，確實將課程逐步帶入生活對話。' },
    { label: '文法', text: '逐步接觸較需邏輯思考的文法觀念，用淺顯易懂的方式理解，並紮實運用於生活。' },
    { label: '發音與閱讀', text: '進入多重母音 (a_e、ai、ay) 的中階自然發音規則，並套用於認讀以及拼寫，開始接觸簡單國際新聞，提升完成自主閱讀文章的能力。' }
  ],
  L: [
    { label: '單字', text: '接觸長篇幅單字，具備良好記憶力和拼寫能力。' },
    { label: '句型', text: '逐步學習具有時態觀念的句型，並融合過去較有變化句型，對英文常見問句形式有正確的認識，並做出合適回應。' },
    { label: '口說', text: '通過真實情境，熟悉多元化的問句模式，如：自主旅行的時刻表、在機場的臨場表達等。' },
    { label: '文法', text: '完整學習英文的各種問句句型，並漸漸帶入時態觀念。' },
    { label: '發音與閱讀', text: '進入多音節發音 (air、ear) 的進階規則，學習認讀以及拼寫。閱讀量提升，增進完成初階文章閱讀能力，挑戰閱讀時事文章、科學、看板、海報等真實英文。' }
  ],
  U: [
    { label: '單字', text: '大幅提升單字篇幅和份量，完整容納國中三年的單字難度，以及背誦能力訓練。' },
    { label: '句型', text: '紮實熟悉過去式時態，且能活用各種時態，提升句型的精緻度以及水平。' },
    { label: '口說', text: '通過真實情境，如訂房等，熟悉多元化的問句模式，透過不同時態，提升靈活表述意見的能力。' },
    { label: '文法', text: '活用英文三態，把握精準的文法認知，奠定國中三年所需的文法概念。' },
    { label: 'KK音標及閱讀', text: '歷經 A～L 級逐層累積的自然發音基礎後，正式進到 KK 音標世界，因此不會被音標符號混淆。提升自主閱讀能力，大量認知世界趨勢，閱讀時事文章、科普文章、看板、海報等真實英文。' }
  ],
  S: [
    { label: '單字', text: '大量接觸英檢單字及片語，做好基礎英檢訓練，熟悉會考及國內外具有公正效力的英檢學習。' },
    { label: '句型', text: '能理解艱深的英文句型，紮實學習完成式、關代、被動語態等關鍵英文文法。' },
    { label: '詞性與片語', text: '進階學習 Part of Speech 詞性判讀 (n. 名詞 / v. 動詞 / adj. 形容詞 / adv. 副詞) 與英語片語運用（例：Be about to 即將 — The bus is about to come.）。' },
    { label: '口說與閱讀', text: '進行檢定型的口語訓練，加速口語臨場反應，學習精準表述意見；並引導辨別各國英文口音的差異，結合科技與國際時事議題。' },
    { label: '文法', text: '活用英文三態，學習現在完成式等較複雜文法，把握精準的文法認知，奠定國中三年所需的文法概念。' },
    { label: '閱讀', text: '帶領學生閱讀進階科普文章、社會時事、國際新聞，具備探討世界趨勢及國際議題能力。' }
  ],
  AP: [
    { label: '單字', text: '延伸高階字彙的精細語意判斷，強化會考單字量。' },
    { label: '文法', text: '多時態混合運用，熟悉情態助動詞 (should / must / could / may)，並掌握條件句基礎 (If 子句)。' },
    { label: '句型', text: '銜接國中會考文法重點，熟悉複合句型結構。' },
    { label: '閱讀', text: '長文閱讀流暢度訓練，挑戰議題型文章的細節理解與因果推論。' }
  ]
};

/* ════════════════════════════════════════════════════════════════
   ⭐ 教育顧問介紹用資料 — 取自《A Plus 教育顧問培訓手冊》2026 版
   ✏️ EDIT 這區的文字都可以依實際話術調整
   ═══════════════════════════════════════════════════════════════ */

/* 五大核心課程 (A.P.L.U.S 級每週 5 小時,每堂 60 分鐘) */
const CORE_COURSES = [
  'Vocabulary & Phrases + Sentence Structure — 字彙、片語、句型',
  'Speaking Skills — 口說與情境表達',
  'Grammar Usage — 文法概念與運用',
  'Phonics & Reading — 發音規則與閱讀理解',
  'English Library Time（英語科技探索空間） — 自主學習任務'
];

/* 各能力的「代表意義」與「對應課程」— 依表現好壞給不同解讀 */
const SKILL_CONSULT = {
  Phonics:    { course: 'Phonics & Reading 課',
                strong: '已有自然發音基礎,看字就能拼出音',
                weak:   '自然發音規則尚未建立,需要從發音工具入門' },
  Spelling:   { course: 'Phonics & Reading 課 ＋ Voc. & Phrases 課',
                strong: '拼字邏輯清楚,能對應發音正確書寫',
                weak:   '拼字邏輯與記憶方法需要系統訓練' },
  Vocabulary: { course: 'Voc. & Phrases 課',
                strong: '常見字彙認識度良好,語意判斷準確',
                weak:   '字彙量還在累積階段,需要大量情境輸入' },
  Reading:    { course: 'Phonics & Reading 課',
                strong: '文字理解與邏輯推理能力強',
                weak:   '長句與段落理解需要更多閱讀練習' },
  Grammar:    { course: 'Grammar Usage 課',
                strong: '文法概念清楚,能正確判斷句型結構',
                weak:   '文法概念尚未系統建立(未受訓練前屬正常)' }
};

/* 需要對家長「正常化」的能力 — 避免家長誤以為孩子有問題 */
const NORMALIZE_NOTE = {
  Grammar: '文法題涵蓋 A 級到國中銜接的全範圍,沒有受過系統訓練的孩子得分偏低是正常現象,這正是 Grammar Usage 課要補足的部分。',
  Spelling: '拼字需要發音規則搭配記憶方法,尚未系統學過自然發音的孩子這裡通常較弱,課程會從發音工具開始建立。'
};

/* PART 4 常見家長問題 */
const CONSULT_FAQ = [
  { q: '正確率只有 4 成,是不是很差?',
    a: '這個測驗涵蓋從小一到國中的所有題型,目的是找出孩子「目前最適合的起點」,不是要考倒孩子。這個分數剛好對應到推薦的級數,是我們安排課程的依據,非常準確。' },
  { q: '文法分數很低,是不是文法很差?',
    a: '文法題從 A 級一路考到國中程度,沒有受過系統訓練的孩子分數偏低非常正常。我們課程從 Be 動詞開始,一步一步把基礎蓋好,不用擔心。' },
  { q: '為什麼不從更高的班開始上?',
    a: '報告可以看到孩子在某些面向還有明顯缺口。直接跳高,孩子容易因為跟不上而失去信心。從推薦級數開始能在最短時間補紮實基礎,之後升級的速度反而更快,也更有成就感。' },
  { q: '一週要上幾次?每堂多久?',
    a: 'A.P.L.U.S 級每週共 5 小時,分成 5 堂核心課程,每堂 60 分鐘。我們可以依照孩子的學校行程安排最適合的時段。' },
  { q: 'English Library Time 是上什麼?會不會只是放著不管?',
    a: '這是「英語科技探索空間」,讓孩子運用書籍、影片、平台等資源,全英文認識世界。每位學生帶著老師規劃好的任務單,每週和館長討論、挑選適合自己的任務——讀一本英文課外讀物、看 NASA 影片做科學實驗、用 iPad 看影片學英文,甚至是玩英文遊戲,所有內容都是老師精心挑選的。遇到不會的單字,孩子可以主動查字典或問館長,順便練習解決問題的能力;每個任務都有學習單,家長能清楚看到孩子學了什麼。耶加很多一年級的孩子也都做得到,不用擔心年紀太小。' },
  { q: '幾個月可以升一個 Level?',
    a: '每兩個月會有一次 Level-up Evaluations 進階考。通過就升階,未通過則繼續夯實當前 Level,確保每個孩子都是「真正學會了再往前走」。' },
  { q: '課程教材怎麼發放?要另外買嗎?',
    a: '每學年 9 月開學時發放當年級全套教材,包含 Communication Book、Quiz Book、Writing Book 和各科核心教材。詳細費用請洽現場顧問。' }
];

/* PART 6-3 介紹後自我檢核 */
const CONSULT_CHECKLIST = [
  '有肯定孩子完成測驗',
  '說明了整體成績(答對題數、正確率)',
  '解讀了五大能力,強弱項都提到',
  '弱項有做「正常化」說明',
  '清楚說明了推薦的 Level 和班名',
  '說明了課程如何補強孩子的弱項',
  '描繪了學習路徑(現在 Level → 下一目標)',
  '說明了上課時間、導師,並用二擇一確認入班日期'
];

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
  { id: 'V6', skill: 'Vocabulary', level: 'AP',
    instruction: '選出最精準的高階字彙',
    prompt: 'After running 10 km, I felt completely ___.',
    options: [{ id: 'a', label: 'tired' }, { id: 'b', label: 'exhausted', isCorrect: true }, { id: 'c', label: 'happy' }],
    concept: 'AP 等級字彙 (精細語意)',
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
    explanation: '文章圍繞 dolphins 的聰明、友善、生活與溝通,主旨是描述 dolphins。' },
  { id: 'R6', skill: 'Reading', level: 'AP',
    instruction: '讀長文,依細節作答',
    passage: 'Plastic pollution has become a serious problem in oceans around the world. Every year, millions of tons of plastic waste end up in the sea, harming fish, turtles, and other sea animals. Many countries are now trying to reduce plastic use by banning plastic bags and straws. Scientists say that if people do not change their habits soon, the ocean will be filled with more plastic than fish by 2050.',
    prompt: 'According to scientists, what will happen if people do not change their habits?',
    options: [{ id: 'a', label: 'The ocean will have more plastic than fish by 2050.', isCorrect: true }, { id: 'b', label: 'Plastic bags will be banned everywhere.' }, { id: 'c', label: 'Sea animals will stop eating plastic.' }],
    concept: 'AP 長文閱讀 (環境議題) 細節擷取與因果推論',
    explanation: '文章末句明確指出 "if people do not change their habits soon, the ocean will be filled with more plastic than fish by 2050",屬於依原文細節作答的因果推論題。' }
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
  AP: [
    { id: 'GJ1', skill: 'Grammar', level: 'AP', topic: 'Mixed Tenses',
      instruction: '選出最合適的時態', prompt: 'When I ___ home yesterday, my mom ___ dinner.',
      options: [{ id: 'a', label: 'got / was cooking', isCorrect: true }, { id: 'b', label: 'get / cooks' }, { id: 'c', label: 'have got / cooked' }],
      concept: '時態綜合運用',
      explanation: '"當我到家時 (got)" 媽媽正在煮飯 (was cooking)。短暫過去 + 持續中的過去動作。' },
    { id: 'GJ2', skill: 'Grammar', level: 'AP', topic: 'Modal Verbs',
      instruction: '選出最合適的助動詞', prompt: 'You ___ wear a helmet when riding a bike.',
      options: [{ id: 'a', label: 'should', isCorrect: true }, { id: 'b', label: 'can' }, { id: 'c', label: 'will' }],
      concept: '情態助動詞',
      explanation: 'should 表「應該、建議」。can = 能夠,will = 將會,must = 必須,may = 可能。' },
    { id: 'GJ3', skill: 'Grammar', level: 'AP', topic: 'Conditionals',
      instruction: '選出正確的條件句', prompt: 'If it ___ tomorrow, we will stay home.',
      options: [{ id: 'a', label: 'rains', isCorrect: true }, { id: 'b', label: 'rained' }, { id: 'c', label: 'will rain' }],
      concept: '條件句 (第一類條件句)',
      explanation: '表「未來可能發生」的條件句：If 子句用現在式 (rains)，主要子句用 will + 原形動詞。' },
    { id: 'GJ4', skill: 'Grammar', level: 'AP', topic: 'Relative Pronouns',
      instruction: '選出正確的關係代名詞', prompt: 'The girl ___ is standing over there is my sister.',
      options: [{ id: 'a', label: 'who', isCorrect: true }, { id: 'b', label: 'which' }, { id: 'c', label: 'whose' }],
      concept: '關係代名詞',
      explanation: '先行詞 the girl 是「人」，關係代名詞要用 who；which 用於物，whose 表所有格關係。' }
  ]
};

const MODULES = [
  { id: 'phonics',    name: 'Phonics',    label: '發音認知', skill: 'Phonics',    questions: PHONICS_QUESTIONS },
  { id: 'spelling',   name: 'Spelling',   label: '拼字運用', skill: 'Spelling',   questions: SPELLING_QUESTIONS },
  { id: 'vocabulary', name: 'Vocabulary', label: '字彙能力', skill: 'Vocabulary', questions: VOCAB_QUESTIONS },
  { id: 'reading',    name: 'Reading',    label: '閱讀理解', skill: 'Reading',    questions: READING_QUESTIONS },
  { id: 'grammar',    name: 'Grammar',    label: '文法結構', skill: 'Grammar',    questions: [
    ...GRAMMAR_QUESTIONS.A, ...GRAMMAR_QUESTIONS.P, ...GRAMMAR_QUESTIONS.L,
    ...GRAMMAR_QUESTIONS.U, ...GRAMMAR_QUESTIONS.S, ...GRAMMAR_QUESTIONS.AP
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
  low:  { label: '低年級', coreLevels: ['A', 'P', 'L'],            ceilingIds: ['V4', 'GU1'] },  // 30 題
  mid:  { label: '中年級', coreLevels: ['A','P','L','U','S'],      ceilingIds: [] },             // 39 題 (不含 AP)
  high: { label: '高年級', coreLevels: ['A','P','L','U','S','AP'], ceilingIds: [] }              // 45 題 (含 AP)
};

const GRADE_OPTIONS = {
  low:  ['幼稚園', '小一', '小二'],
  mid:  ['小三', '小四'],
  high: ['小五', '小六', '國一', '國二以上'],
};

/* ⭐ 常規範圍 — 依年級組別,大部分學生測驗結果的合理落點。
   超出此範圍(過高或過低)在統計上算特例,建議顧問/教育者複核後再定案,而不是照單全收。
   ✏️ EDIT — 這是經驗法則,可依實際招生資料調整上下界 */
const LEVEL_ORDER = [PRE_A, ...LEVELS]; // ['Pre-A','A','P','L','U','S','AP']
const NORMAL_RANGE = {
  low:  { lower: PRE_A, upper: 'P',  typicalNote: '大部分低年級學生落在 A／P 級，跳級到 L 屬於特例' },
  mid:  { lower: 'A',   upper: 'U',  typicalNote: '大部分中年級學生落在 A～U 級，連 A 都未通過或跳級到 S 屬於特例' },
  high: { lower: 'P',   upper: 'AP', typicalNote: '大部分高年級學生落在 P～AP 級，停留在 A 級（含以下）屬於特例' }
};

/* 判斷這次的測驗結果,對這個年級組別來說是否為統計上的特例(過高或過低) */
function checkLevelOutlier(gradeGroup, estimatedLevel) {
  const range = NORMAL_RANGE[gradeGroup];
  if (!range) return null;
  const idx = LEVEL_ORDER.indexOf(estimatedLevel);
  const lowerIdx = LEVEL_ORDER.indexOf(range.lower);
  const upperIdx = LEVEL_ORDER.indexOf(range.upper);
  if (idx < lowerIdx) return { direction: 'low', ...range };
  if (idx > upperIdx) return { direction: 'high', ...range };
  return null;
}

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

/* ⭐ 級數估計
   - 通過門檻 80%
   - 題數 < 2 的級數不採計 (避免單題定生死)
   - 由低到高逐級檢查,只要有一級未達標就停止,最終級數 = 最後一個達標的級數
   - 連 A 級都未達標時回傳 Pre-A (預備進入 A 級),避免零基礎與穩定 A 級被判成同一級 */
const PASS_RATE = 0.8;
const MIN_ITEMS = 2;
function estimateLevel(levelStats) {
  let achieved = PRE_A;
  for (const L of LEVELS) {
    const { correct, total } = levelStats[L];
    if (total < MIN_ITEMS) continue;
    if (correct / total >= PASS_RATE) { achieved = L; }
    else { break; }
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

/* 從雲端刪除單筆紀錄 (用於清除測試資料或誤填的紀錄) */
function deleteRecordFromCloud(id) {
  return remove(ref(db, `records/${id}`));
}

/* 取得紀錄的「當地日期」字串 (YYYY-MM-DD),用於日期範圍篩選。
   新紀錄有標準的 iso 欄位;舊紀錄只有 zh-TW 格式的 ts (例:2026/7/21 23:20:14),需另外解析。 */
function recordDateKey(r) {
  if (r.iso) {
    const d = new Date(r.iso);
    if (!isNaN(d)) {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
  }
  const m = String(r.ts || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m) {
    const p = n => String(n).padStart(2, '0');
    return `${m[1]}-${p(m[2])}-${p(m[3])}`;
  }
  return '';
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
   ⭐ 教育者／顧問版密碼保護 (避免學生自行切換看到內部版本)
   ═══════════════════════════════════════════════════════════════ */
const VIEW_PASSWORD = '2222';

function ViewPasswordModal({ onCancel, onUnlock }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (pwd === VIEW_PASSWORD) onUnlock();
    else setError(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full flex flex-col items-center gap-3 text-center shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <Lock className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">需要密碼才能查看</h3>
          <p className="text-slate-500 text-xs mt-1">教育者／顧問版僅供內部使用，請輸入密碼</p>
        </div>
        <input
          type="password" autoFocus value={pwd}
          onChange={e => { setPwd(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="密碼"
          className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-medium text-center focus:outline-none ${error ? 'border-red-400' : 'border-stone-200 focus:border-emerald-400'}`}
        />
        {error && <p className="text-red-500 text-xs font-bold">密碼錯誤，請再試一次</p>}
        <div className="flex gap-2 w-full mt-1">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm">
            取消
          </button>
          <button onClick={submit} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm">
            確認
          </button>
        </div>
      </div>
    </div>
  );
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
  /* 篩選條件 */
  const [fCampus, setFCampus] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fName, setFName] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const formatSeconds = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const fetchRecords = () => {
    setStatus('loading');
    loadRecordsFromCloud()
      .then(list => { setRecords(list); setStatus('ready'); })
      .catch(err => { console.error('讀取雲端紀錄失敗', err); setStatus('error'); });
  };

  /* 刪除單筆紀錄:刪除無法復原,因此一定要先確認 */
  const handleDelete = async (r) => {
    const who = `${r.studentName || '(未填姓名)'}${r.campus ? ' · ' + r.campus : ''}`;
    if (!window.confirm(`確定要刪除這筆紀錄嗎?\n\n${who}\n${r.ts}\n\n刪除後無法復原。`)) return;
    setDeletingId(r.id);
    try {
      await deleteRecordFromCloud(r.id);
      setRecords(list => list.filter(x => x.id !== r.id));
    } catch (e) {
      console.error('刪除失敗', e);
      alert('刪除失敗,請檢查網路連線後再試一次。');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (unlocked) fetchRecords();
  }, [unlocked]);

  /* 校區選項：以設定的校區為主，並納入紀錄中出現過的其他校區（避免舊資料被漏掉） */
  const campusOptions = useMemo(() => {
    const set = new Set(CAMPUS_OPTIONS);
    records.forEach(r => { if (r.campus) set.add(r.campus); });
    return [...set];
  }, [records]);

  const filtered = useMemo(() => {
    const q = fName.trim().toLowerCase();
    return records.filter(r => {
      if (fCampus && r.campus !== fCampus) return false;
      if (q && !String(r.studentName || '').toLowerCase().includes(q)) return false;
      if (fFrom || fTo) {
        const key = recordDateKey(r);
        if (!key) return false;
        if (fFrom && key < fFrom) return false;
        if (fTo && key > fTo) return false;
      }
      return true;
    });
  }, [records, fCampus, fName, fFrom, fTo]);

  const hasFilter = !!(fCampus || fFrom || fTo || fName.trim());
  const clearFilters = () => { setFCampus(''); setFFrom(''); setFTo(''); setFName(''); };

  if (!unlocked) {
    return <RecordsPasswordGate onBack={onBack} onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />歷史測驗紀錄總覽
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {status === 'ready' && (hasFilter
              ? `符合條件 ${filtered.length} 筆 / 共 ${records.length} 筆`
              : `共 ${records.length} 筆紀錄（來自雲端，所有校區裝置共用）`)}
            {status === 'loading' && '讀取中...'}
            {status === 'error' && '讀取雲端紀錄失敗，請檢查網路連線'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRecords} title="重新整理"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-1.5">
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button onClick={() => exportRecordsCSV(filtered)} title="匯出目前篩選結果"
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4" />匯出 CSV
          </button>
          <button onClick={onBack}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />返回
          </button>
        </div>
      </div>

      {/* ⭐ 篩選列 */}
      {status === 'ready' && records.length > 0 && (
        <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">校區</label>
            <select value={fCampus} onChange={e => setFCampus(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400">
              <option value="">全部校區</option>
              {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">起始日期</label>
            <input type="date" value={fFrom} max={fTo || undefined} onChange={e => setFFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">結束日期</label>
            <input type="date" value={fTo} min={fFrom || undefined} onChange={e => setFTo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">姓名搜尋</label>
            <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="輸入學生姓名"
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400" />
          </div>
          {hasFilter && (
            <button onClick={clearFilters}
              className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />清除篩選
            </button>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
          <Info className="w-10 h-10" />
          <p>沒有符合篩選條件的紀錄。</p>
          <button onClick={clearFilters}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-xs">
            清除篩選
          </button>
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
                <th className="px-4 py-3 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-stone-50 ${deletingId === r.id ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.ts}</td>
                  <td className="px-4 py-3 text-slate-600">{r.campus || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.studentName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.studentGrade || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{GRADE_PLANS[r.gradeGroup]?.label || r.gradeGroup || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
                      {r.level === PRE_A ? 'Pre-A 預備' : `Level ${r.level}`} · {LEVEL_INFO[r.level]?.cefr}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.correct}/{r.total}（{r.accuracy}%）</td>
                  <td className="px-4 py-3 text-slate-600">{formatSeconds(r.seconds)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                      title="刪除這筆紀錄" aria-label={`刪除 ${r.studentName || ''} 的紀錄`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
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
  const clipAudioRef = useRef(null);
  const [clipPlaying, setClipPlaying] = useState(false);   /* 階段語音是否正在播放 → 驅動角色說話動畫 */
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
     優先使用壓縮過的 .m4a (檔案小 75%)；若該檔不存在則自動退回 .mp3，
     這樣日後直接把 mp3 放進資料夾也能運作，不必先轉檔。
     檔案不存在或播放被擋下時會靜默略過，不影響測驗流程。
     每次呼叫都會先停掉還在播放的上一段，避免疊音；
     可傳入 onEnded 讓下一段語音等這段真正播完再接著播。 */
  const playClip = (name, onEnded) => {
    if (clipAudioRef.current) {
      clipAudioRef.current.pause();
      clipAudioRef.current = null;
    }
    const base = `${import.meta.env.BASE_URL}audio/${name}`;

    const attempt = (exts) => {
      if (!exts.length) { setClipPlaying(false); onEnded?.(); return; }
      const [ext, ...rest] = exts;
      try {
        const audio = new Audio(`${base}.${ext}`);
        clipAudioRef.current = audio;
        const finish = () => {
          if (clipAudioRef.current === audio) clipAudioRef.current = null;
          setClipPlaying(false);
          onEnded?.();
        };
        audio.addEventListener('ended', finish);
        audio.addEventListener('pause', () => setClipPlaying(false));
        audio.addEventListener('playing', () => setClipPlaying(true));
        /* 找不到檔案或格式不支援 → 換下一個副檔名再試 */
        audio.addEventListener('error', () => {
          if (clipAudioRef.current === audio) clipAudioRef.current = null;
          attempt(rest);
        });
        audio.play().catch(finish);
      } catch { attempt(rest); }
    };

    attempt(['m4a', 'mp3']);
  };

  const stopClip = () => {
    if (clipAudioRef.current) {
      clipAudioRef.current.pause();
      clipAudioRef.current = null;
    }
    setClipPlaying(false);
  };

  /* 只暫停目前正在播放的階段語音，不清空 ref（跟 stopClip 不同，用於使用者主動按暫停鍵） */
  const pauseClip = () => {
    clipAudioRef.current?.pause();
    setClipPlaying(false);
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
    playClip(`module-${activeModules[0].id}`);
  };

  const beginModule = () => {
    primeSpeech();
    stopClip();
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
      iso: new Date().toISOString(),   /* 供日期範圍篩選使用 (ts 為地區格式字串,不適合比較) */
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
                { key: 'high', label: '高年級', sub: '小五 ～ 小六以上', emoji: '🌳', color: 'from-violet-400 to-purple-500',  levels: ['S', 'AP'] },
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
            playClip={playClip} pauseClip={pauseClip} clipPlaying={clipPlaying}
          />
        )}
        {screen === 'testing' && showModuleIntro && (
          <ModuleIntro module={activeModules[moduleIdx]} idx={moduleIdx} total={activeModules.length} onStart={beginModule}
            playClip={playClip} pauseClip={pauseClip} clipPlaying={clipPlaying} />
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
            studentName={studentName} studentGrade={studentGrade} campus={campus} gradeGroup={gradeGroup}
            onRestart={() => { setSavedOk(null); setCloudSyncOk(null); setScreen('campus'); }}
            playClip={playClip} pauseClip={pauseClip} clipPlaying={clipPlaying}
          />
        )}
      </div>
    </div>
  );
}

/* 各模組的角色配件 — 讓五個模組有辨識度,學生會期待下一關 */
const SPRITE_COSTUMES = {
  /* Phonics:耳機 */
  phonics: (
    <g>
      <path d="M30 44 A 20 20 0 0 1 70 44" stroke="#4C1D95" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <rect x="22.5" y="42" width="9" height="13" rx="4.5" fill="#6D28D9" />
      <rect x="68.5" y="42" width="9" height="13" rx="4.5" fill="#6D28D9" />
    </g>
  ),
  /* Spelling:靠在身側的鉛筆 (略疊在身體上,才不會像浮在旁邊) */
  spelling: (
    <g transform="rotate(26 73 60)" stroke="#0C4A6E" strokeWidth="1.1">
      <rect x="70" y="42" width="6" height="24" fill="#38BDF8" />
      <rect x="70" y="38" width="6" height="4" fill="#E0F2FE" />
      <path d="M70 66 L76 66 L73 73 Z" fill="#FDE68A" />
      <path d="M71.4 70.7 L74.6 70.7 L73 73 Z" fill="#1F2937" stroke="none" />
    </g>
  ),
  /* Vocabulary:翻開的書 (乳白書頁 + 書脊 + 頁面線條,才讀得出是書) */
  vocabulary: (
    <g>
      <path d="M32 76 Q41 71.5 49.2 76 L49.2 88.5 Q41 84 32 88.5 Z" fill="#FFFBEB" stroke="#B45309" strokeWidth="1.5" />
      <path d="M68 76 Q59 71.5 50.8 76 L50.8 88.5 Q59 84 68 88.5 Z" fill="#FFFBEB" stroke="#B45309" strokeWidth="1.5" />
      <path d="M50 75 L50 88.5" stroke="#B45309" strokeWidth="2.1" />
      <g stroke="#D97706" strokeWidth="0.9" opacity="0.65">
        <path d="M36 80 L45.5 80 M36 83.4 L45.5 83.4" />
        <path d="M54.5 80 L64 80 M54.5 83.4 L64 83.4" />
      </g>
    </g>
  ),
  /* Reading:眼鏡 */
  reading: (
    <g stroke="#1F2937" strokeWidth="2.4" fill="none">
      <circle cx="38.5" cy="57" r="10.5" />
      <circle cx="61.5" cy="57" r="10.5" />
      <path d="M49 55 Q50 53.5 51 55" />
      <path d="M28 54 L22 51" strokeLinecap="round" />
      <path d="M72 54 L78 51" strokeLinecap="round" />
    </g>
  ),
  /* Grammar:學士帽 */
  grammar: (
    <g>
      <path d="M28 36 L50 28 L72 36 L50 44 Z" fill="#1E293B" />
      <path d="M50 44 L50 50" stroke="#1E293B" strokeWidth="2" />
      <path d="M66 39 L66 48" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="66" cy="49.5" r="2.4" fill="#FBBF24" />
    </g>
  )
};

/* ════════════════════════════════════════════════════════════════
   ⭐ 蘋果角色 — 語音播放與答題回饋的動畫角色
   造型呼應網站 logo 的蘋果,維持品牌一致性。
   speaking:嘴巴開合、雙手起勁揮動、兩側音波擴散
   mood='happy' (答對):瞇眼笑、大笑開口、跳躍、星光炸開
   mood='oops'  (答錯):波浪嘴、輕輕晃動 — 刻意不用難過表情,避免打擊信心
   costume:對應模組的配件 (見 SPRITE_COSTUMES)
   動畫定義於 index.css,並已支援 prefers-reduced-motion
   ═══════════════════════════════════════════════════════════════ */
function TalkingSprite({ speaking = false, size = 72, className = '', mood = 'idle', costume = null }) {
  /* 同頁若有多個角色,漸層 id 需唯一 (useId 會含冒號,需清掉才能用於 url(#..)) */
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowId = `sprGlow${uid}`;
  const bodyId = `sprBody${uid}`;
  const limb = { stroke: '#1F2937', strokeWidth: 2.1, fill: 'none', strokeLinecap: 'round' };
  /* 小尺寸 (如結果頁 header) 時省略四肢與星光,否則細線會糊成一團看不清 */
  const compact = size < 56;
  const happy = mood === 'happy';
  const oops = mood === 'oops';
  /* 情緒動畫優先於說話動畫 */
  const motionClass = happy ? 'sprite-jump' : oops ? 'sprite-wobble' : speaking ? 'sprite-float-talking' : 'sprite-float';

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
      aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FCA5A5" stopOpacity="0.45" />
          <stop offset="65%"  stopColor="#FCA5A5" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FCA5A5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F4593F" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      {/* 外圈暖色光暈 */}
      <circle cx="50" cy="58" r="42" fill={`url(#${glowId})`} />

      {/* 說話時的音波 (置於身體下半部兩側,避免與手臂重疊) */}
      {speaking && (
        <g stroke="#FB923C" strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path className="sprite-wave" d="M19 70 Q13 76 19 82" />
          <path className="sprite-wave" style={{ animationDelay: '0.4s' }} d="M13 66 Q5 76 13 86" />
          <path className="sprite-wave" d="M81 70 Q87 76 81 82" />
          <path className="sprite-wave" style={{ animationDelay: '0.4s' }} d="M87 66 Q95 76 87 86" />
        </g>
      )}

      <g className={motionClass}>
        {!compact && (
          <>
            {/* 雙腳 (先畫,置於身體之後) */}
            <g {...limb}>
              <path d="M43 84 L41.5 93.5" />
              <path d="M57 84 L58.5 93.5" />
            </g>
            <g fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.9">
              <ellipse cx="39.5" cy="95.2" rx="5.2" ry="2.5" />
              <ellipse cx="60.5" cy="95.2" rx="5.2" ry="2.5" />
            </g>

            {/* 雙手:靜態姿勢放外層 g,揮動動畫放內層,避免 CSS transform 蓋掉 SVG transform
                答對時雙手高舉歡呼 */}
            <g className={`sprite-arm-l ${speaking || happy ? 'sprite-arm-fast-l' : ''}`}>
              <path d={happy ? 'M26 60 C 20 56, 16 48, 15 40' : 'M26 62 C 20 61, 15 57, 12.5 51'} {...limb} />
              <circle cx={happy ? 14.4 : 11.2} cy={happy ? 37.6 : 48.8} r="3.6"
                fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.9" />
            </g>
            <g className={`sprite-arm-r ${speaking || happy ? 'sprite-arm-fast-r' : ''}`}>
              <path d={happy ? 'M74 60 C 80 56, 84 48, 85 40' : 'M74 62 C 80 61, 85 57, 87.5 51'} {...limb} />
              <circle cx={happy ? 85.6 : 88.8} cy={happy ? 37.6 : 48.8} r="3.6"
                fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.9" />
            </g>
          </>
        )}

        {/* 蒂頭與葉子 */}
        <path d="M50 42 C 53 33, 56 27, 59 23" stroke="#7C3F1D" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M54 30 C 49 22, 41 22, 37 27 C 41 33, 50 34, 54 30 Z" fill="#22C55E" />

        {/* 蘋果身體 (上方有中央凹陷的雙弧形) */}
        <path fill={`url(#${bodyId})`} d="M50 44
          C 46 34, 35 30, 29 36
          C 21 43, 20 57, 24 69
          C 28 81, 39 88, 50 88
          C 61 88, 72 81, 76 69
          C 80 57, 79 43, 71 36
          C 65 30, 54 34, 50 44 Z" />
        {/* 左上柔和高光 */}
        <ellipse cx="38" cy="49" rx="8.5" ry="5.5" fill="#FFFFFF" opacity="0.2" transform="rotate(-28 38 49)" />

        {/* 眼睛:答對時瞇眼笑,其餘為圓眼 (待機時偶爾眨眼) */}
        {happy ? (
          <g stroke="#0F172A" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M31.5 58 Q38.5 50 45.5 58" />
            <path d="M54.5 58 Q61.5 50 68.5 58" />
          </g>
        ) : (
          <g className={speaking ? '' : 'sprite-blink'}>
            <ellipse cx="38.5" cy="57" rx="8.2" ry="9.8" fill="#FFFFFF" />
            <ellipse cx="61.5" cy="57" rx="8.2" ry="9.8" fill="#FFFFFF" />
            {/* 答錯時眼睛往下看 */}
            <ellipse cx="39.6" cy={oops ? 59.5 : 54.4} rx="5.4" ry="6.2" fill="#0F172A" />
            <ellipse cx="62.6" cy={oops ? 59.5 : 54.4} rx="5.4" ry="6.2" fill="#0F172A" />
            <circle cx="36.9" cy={oops ? 56.5 : 51.4} r="1.5" fill="#FFFFFF" />
            <circle cx="59.9" cy={oops ? 56.5 : 51.4} r="1.5" fill="#FFFFFF" />
          </g>
        )}

        {/* 嘴巴 */}
        {happy
          /* 答對:大笑開口 */
          ? <path d="M41.5 68 Q50 81 58.5 68 Z" fill="#0F172A" />
          : oops
            /* 答錯:波浪嘴 (尷尬但不難過) */
            ? <path d="M44.5 71.5 Q47 68.8 49.5 71.5 T54.5 71.5" stroke="#0F172A" strokeWidth="2.3" fill="none" strokeLinecap="round" />
            : speaking
              /* 說話:開合 */
              ? <ellipse cx="50" cy="72" rx="5.2" ry="4.6" fill="#0F172A" className="sprite-mouth-talk" />
              /* 待機:微笑 */
              : <path d="M45.4 70.5 Q50 75.5 54.6 70.5" stroke="#0F172A" strokeWidth="2.4" fill="none" strokeLinecap="round" />}

        {/* 模組配件 (畫在最上層) */}
        {!compact && costume && SPRITE_COSTUMES[costume]}
      </g>

      {/* 答對時向外炸開的星光
          定位用外層 g,縮放動畫放內層 — 否則 CSS transform 會蓋掉 translate,星星會全部疊在臉上 */}
      {happy && (
        <g fill="#FBBF24">
          {[[16, 30], [84, 32], [26, 12], [74, 14], [10, 62], [90, 64]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x - 53} ${y - 53})`}>
              <path className="sprite-burst" style={{ animationDelay: `${i * 0.09}s` }}
                d="M50 50 l1.7 4.6 4.6 1.7 -4.6 1.7 -1.7 4.6 -1.7 -4.6 -4.6 -1.7 4.6 -1.7z" />
            </g>
          ))}
        </g>
      )}

      {/* 待機／說話時的周圍星光 */}
      {!compact && !happy && (
        <g fill="#FDE047">
          <path className="sprite-sparkle" d="M20 26 l1.6 4.3 4.3 1.6 -4.3 1.6 -1.6 4.3 -1.6 -4.3 -4.3 -1.6 4.3 -1.6z" />
          <path className="sprite-sparkle" style={{ animationDelay: '0.8s' }}
            d="M79 28 l1.3 3.5 3.5 1.3 -3.5 1.3 -1.3 3.5 -1.3 -3.5 -3.5 -1.3 3.5 -1.3z" />
        </g>
      )}
    </svg>
  );
}

/* ⭐ 階段語音的角色 + 「再聽一次 / 暫停」控制鈕，Intro / ModuleIntro 共用 */
function ClipButtons({ onReplay, onPause, speaking = false, costume = null }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-4">
      <button onClick={onReplay} aria-label="再聽一次語音" className="active:scale-95 transition-transform">
        <TalkingSprite speaking={speaking} size={76} costume={costume} />
      </button>
      <div className="flex flex-col gap-1.5">
        <button onClick={onReplay}
          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />再聽一次
        </button>
        <button onClick={onPause}
          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5">
          <Pause className="w-3.5 h-3.5" />暫停語音
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   進場畫面 (含學生資料 + 語音選擇器)
   ═══════════════════════════════════════════════════════════════ */
function IntroScreen({ modules, totalQuestions, gradeGroup, onBack,
                      studentName, setStudentName, studentGrade, setStudentGrade,
                      availableVoices, selectedVoiceName, setSelectedVoiceName, onTestVoice, onStart, playClip, pauseClip, clipPlaying }) {
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  useEffect(() => { playClip?.('welcome'); }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-white relative overflow-y-auto">
      <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-[1.75rem] flex items-center justify-center mb-5 shadow-md relative">
        <Apple className="w-9 h-9 text-white" strokeWidth={2.2} fill="currentColor" />
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-stone-100 flex items-center justify-center shadow-sm">
          <span className="text-[10px] font-black text-red-500">+</span>
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1.5">
        I.E.E. System<span className="text-red-500">: English Assessment</span>
      </h1>
      <p className="text-slate-500 font-medium text-sm mb-1">{SCHOOL_NAME} · {SCHOOL_TAGLINE}</p>
      <p className="text-emerald-600 text-xs font-bold mb-6">五大模組綜合診斷 · 自主作答版</p>

      <ClipButtons onReplay={() => playClip('welcome')} onPause={pauseClip} speaking={clipPlaying} />

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
function ModuleIntro({ module, idx, total, onStart, playClip, pauseClip, clipPlaying }) {
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
      <ClipButtons onReplay={() => playClip(`module-${module.id}`)} onPause={pauseClip} speaking={clipPlaying} costume={module.id} />
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
        {/* ⭐ 進度陪跑員:角色站在進度條上隨作答往前走,讓「還有多遠」看得見 */}
        <div className="relative mt-0.5 pt-5">
          <div
            className="sprite-runner absolute top-0 -translate-x-1/2 pointer-events-none"
            style={{ left: `${Math.min(Math.max(overallProgress, 2), 98)}%` }}>
            <TalkingSprite size={30} costume={module.id} />
          </div>
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(overallProgress, 100)}%` }} />
          </div>
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
          <QuestionContent question={question} moduleId={module.id} isSpeaking={isSpeaking} onReplayAudio={onReplayAudio} audioBlocked={audioBlocked} />
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
          <div className="mt-3 p-2 pr-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1">
            <TalkingSprite mood="happy" size={60} className="shrink-0 -my-1" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-800">答對了!做得好。</span>
            </div>
          </div>
        )}
        {feedback === 'incorrect' && (
          <div className="mt-3 p-2 pr-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1">
            <TalkingSprite mood="oops" size={60} className="shrink-0 -my-1" />
            <div className="flex items-start gap-1.5">
              <Heart className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span className="text-xs font-medium text-amber-800">沒關係,錯誤是學習的好機會。完整解析會在最後的報告中。</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* 題目主體 (依題型渲染) */
function QuestionContent({ question, moduleId, isSpeaking, onReplayAudio, audioBlocked }) {
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
      <div className="flex flex-col items-center gap-2 w-full">
        {/* 角色本身就是播放鍵:點一下播放題目語音 */}
        <button onClick={onReplayAudio} aria-label="播放題目語音"
          className={`rounded-full transition-transform active:scale-95 ${needsTap ? 'animate-pulse' : 'hover:scale-105'}`}>
          <TalkingSprite speaking={isSpeaking} size={124} costume={moduleId} />
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-700">
          {isSpeaking ? '正在播放題目...' : '按一下聆聽題目'}
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
function Dashboard({ modules = MODULES, savedOk, cloudSyncOk, answers, timeElapsed, formatTime, studentName, studentGrade, campus, gradeGroup, onRestart, playClip, pauseClip, clipPlaying }) {
  const [view, setView] = useState('student');
  const [exportingPdf, setExportingPdf] = useState(false);
  const contentRef = useRef(null);

  /* 教育者／顧問版需要密碼才能切換過去,解鎖後這次瀏覽期間都不用再輸入 */
  const [viewUnlocked, setViewUnlocked] = useState(false);
  const [pendingView, setPendingView] = useState(null);
  const requestView = (target) => {
    if (target === 'student' || viewUnlocked) { setView(target); return; }
    setPendingView(target);
  };

  /* 顯示於報告右上角,讓匯出的 PDF 一眼就能認出是哪位學生 */
  const reportTimestamp = useMemo(() => new Date().toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }), []);

  /* ⭐ 匯出 PDF：直接把結果內容畫成圖片再包成 PDF 下載，不依賴瀏覽器原生列印
     (window.print() 在部分機構管理的 iPad 上會被限制，完全沒有反應) */
  const exportPdf = async () => {
    if (!contentRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      /* 動態載入:這兩個套件只有這裡用得到,不放進初始 bundle */
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro')
      ]);
      const canvas = await html2canvas(contentRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`APLUS_${studentName || '測驗結果'}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF 匯出失敗', e);
      alert('PDF 匯出失敗，請確認網路連線後再試一次。');
    } finally {
      setExportingPdf(false);
    }
  };

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
  const levelOutlier = useMemo(() => checkLevelOutlier(gradeGroup, estimatedLevel), [gradeGroup, estimatedLevel]);

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
            <button onClick={() => requestView('student')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${view === 'student' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
              <User className="w-3 h-3" /><span className="hidden sm:inline">學生</span>
            </button>
            <button onClick={() => requestView('educator')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${view === 'educator' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
              <GraduationCap className="w-3 h-3" />
              {!viewUnlocked && <Lock className="w-2.5 h-2.5" />}
              <span className="hidden sm:inline">教育者</span>
            </button>
            <button onClick={() => requestView('consultant')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${view === 'consultant' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
              <Users className="w-3 h-3" />
              {!viewUnlocked && <Lock className="w-2.5 h-2.5" />}
              <span className="hidden sm:inline">顧問</span>
            </button>
          </div>
          <button onClick={() => playClip('complete')} title="再聽一次語音" aria-label="再聽一次語音"
            className="px-1 rounded-lg active:scale-95 transition-transform">
            <TalkingSprite speaking={clipPlaying} size={38} />
          </button>
          <button onClick={pauseClip} title="暫停語音"
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1">
            <Pause className="w-3 h-3" />
          </button>
          <button onClick={exportPdf} disabled={exportingPdf} title="下載本次結果為 PDF 檔案"
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg font-bold text-[11px] flex items-center gap-1">
            <Printer className="w-3 h-3" /><span className="hidden sm:inline">{exportingPdf ? '匯出中...' : '匯出 PDF'}</span>
          </button>
          <button onClick={onRestart} className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /><span className="hidden sm:inline">重測</span>
          </button>
        </div>
      </div>

      <div ref={contentRef} className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-5 max-w-7xl mx-auto w-full pb-12 bg-stone-50">
        {/* 左側 */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-emerald-600 p-7 rounded-[1.75rem] shadow-lg text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-10"><Globe2 className="w-56 h-56" /></div>
            <div className="relative z-10">
              <p className="text-emerald-100 uppercase tracking-widest text-xs font-bold mb-2">CEFR 國際等級</p>
              <h1 className="text-6xl sm:text-7xl font-black mb-5 tracking-tighter">{levelData.cefr}</h1>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-emerald-50 uppercase tracking-widest text-[10px] font-bold mb-1">A.P.L.U.S 對標</p>
                <h3 className="text-xl font-bold">
                  {estimatedLevel === PRE_A ? 'Pre-A 預備階段' : `Level ${estimatedLevel}`}
                </h3>
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
          {/* 學生基本資訊 — 顯示在報告區塊內,確保匯出 PDF 時能一眼看出是哪位學生 */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-white px-4 py-2.5 rounded-xl border border-stone-100 mb-5 text-xs">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-500">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-700">{studentName || '未填寫姓名'}</span>
              {studentGrade && <span>· {studentGrade}</span>}
              {campus && <span>· {campus}</span>}
              <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                {estimatedLevel === PRE_A ? 'Pre-A 預備階段' : `Level ${estimatedLevel}`}
              </span>
            </div>
            <span className="text-slate-400 whitespace-nowrap">{reportTimestamp}</span>
          </div>

          {/* 特例提醒 — 僅教育者/顧問版可見,避免讓家長在學生版直接看到「特例」字樣 */}
          {view !== 'student' && levelOutlier && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">這個結果對這個年齡層來說較不常見</p>
                <p className="text-[11.5px] text-amber-700 mt-1 leading-relaxed">
                  {levelOutlier.typicalNote}。建議複核：作答用時是否
                  {levelOutlier.direction === 'high' ? '過短(可能隨機作答)' : '過長或中途分心'}、
                  錯題是否{levelOutlier.direction === 'high' ? '集中在特定概念而非隨機亂猜' : '為粗心所致而非真的不會'}，
                  必要時可安排重測，或與家長了解孩子實際的英語學習背景，確認無誤後再定案分班建議。
                </p>
              </div>
            </div>
          )}

          {view === 'student' && (
            <StudentView
              modules={modules}
              levelData={levelData} estimatedLevel={estimatedLevel}
              nextLevel={nextLevel} nextLevelData={nextLevelData}
              moduleStats={moduleStats} mistakes={mistakes}
            />
          )}
          {view === 'educator' && (
            <EducatorView
              levelData={levelData} estimatedLevel={estimatedLevel}
              nextLevel={nextLevel} nextLevelData={nextLevelData}
              moduleStats={moduleStats} levelStats={levelStats}
              mistakes={mistakes} answers={answers}
            />
          )}
          {view === 'consultant' && (
            <ConsultantView
              levelData={levelData} estimatedLevel={estimatedLevel}
              moduleStats={moduleStats} studentName={studentName}
              totalCorrect={totalCorrect} totalAnswered={totalAnswered}
              overallAccuracy={overallAccuracy} timeElapsed={timeElapsed}
            />
          )}
        </div>
      </div>

      {pendingView && (
        <ViewPasswordModal
          onCancel={() => setPendingView(null)}
          onUnlock={() => { setViewUnlocked(true); setView(pendingView); setPendingView(null); }}
        />
      )}
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
  /* 接下來要就讀的級數 (Pre-A → Level A);「下一步」卡片一律呈現該級的說明與課程重點 */
  const studyLevel = studyLevelOf(estimatedLevel);
  const studyInfo = LEVEL_INFO[studyLevel];
  const currentHighlights = COURSE_HIGHLIGHTS[studyLevel] || [];

  return (
    <div className="flex flex-col gap-5">
      {/* 鼓勵性開場 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white relative overflow-hidden">
        <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-20" />
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Star className="w-5 h-5" fill="currentColor" />恭喜完成測驗!
        </h3>
        <p className="text-emerald-50 text-sm leading-relaxed">
          {estimatedLevel === PRE_A ? (
            <>你目前在 <strong>Pre-A 預備階段</strong> — {levelData.name}!{levelData.desc}</>
          ) : (
            <>你目前的程度是 <strong>Level {estimatedLevel} ({levelData.cefr})</strong> — {levelData.name}!{levelData.desc}</>
          )}
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
      {estimatedLevel !== 'AP' && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 sm:p-6 rounded-2xl relative overflow-hidden">
          <Rocket className="absolute -top-2 -right-2 w-24 h-24 text-amber-200 opacity-50 rotate-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">YOUR NEXT STEP</p>
            <h3 className="text-lg sm:text-xl font-black text-amber-900 mb-2">
              {estimatedLevel === PRE_A
                ? '🎓 接下來,你將預備進入 Level A,你會學到'
                : `🎓 接下來,在 Level ${studyLevel} 你會學到`}
            </h3>
            <p className="text-amber-800/90 text-sm mb-3">
              <strong>{studyInfo.name}</strong> ({studyInfo.cefr}) · 適合 {studyInfo.grade} · {studyInfo.desc}
            </p>
            {(COURSE_MODULES[studyLevel] || []).length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1.5">本級課程組成</p>
                <div className="flex flex-wrap gap-1.5">
                  {COURSE_MODULES[studyLevel].map(m => (
                    <span key={m} className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-md px-2 py-0.5">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white/70 backdrop-blur-sm border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5" />課程重點
              </p>
              <ul className="space-y-2.5">
                {currentHighlights.map((h, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-800">{h.label}｜</strong>{h.text}</span>
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

/* 能力表現分級 — 與 SkillBar 共用同一組門檻,避免兩處說法不一致 */
function skillTier(pct, total) {
  if (!total) return { label: '尚未測試', tone: 'stone', strong: false };
  if (pct >= 80) return { label: '表現極佳', tone: 'emerald', strong: true };
  if (pct >= 60) return { label: '基礎扎實', tone: 'sky',     strong: true };
  if (pct >= 40) return { label: '需要練習', tone: 'amber',   strong: false };
  return              { label: '建議加強', tone: 'rose',    strong: false };
}

/* 顧問報表的步驟外框 */
function ConsultStep({ n, title, hint, children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="flex items-start gap-2.5 px-4 py-3 bg-stone-50 border-b border-stone-200">
        <span className="w-6 h-6 shrink-0 rounded-full bg-slate-800 text-white text-xs font-black flex items-center justify-center">{n}</span>
        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-tight">{title}</h3>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* 顧問要照著唸的話術框 */
function Script({ children }) {
  return (
    <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-r-xl p-3.5">
      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1.5">顧問說</p>
      <p className="text-sm text-slate-800 leading-relaxed">{children}</p>
    </div>
  );
}

/* 手冊裡的「話術提醒」 */
function Tip({ children }) {
  return (
    <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-[11.5px] text-amber-900 leading-relaxed">{children}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ⭐ 教育顧問視角 — 依《教育顧問培訓手冊》六步驟編排,
   話術中的空格已自動帶入該學生的實際測驗數據,顧問可直接照著介紹。
   ═══════════════════════════════════════════════════════════════ */
function ConsultantView({ levelData, estimatedLevel, moduleStats, studentName,
                          totalCorrect, totalAnswered, overallAccuracy, timeElapsed }) {
  const who = studentName?.trim() || '這位同學';
  const studyLevel = studyLevelOf(estimatedLevel);
  const studyInfo = LEVEL_INFO[studyLevel];
  const minutes = Math.max(1, Math.round(timeElapsed / 60));

  /* 下一個目標要以「即將就讀的級數」往後推,不能用 estimatedLevel —
     否則 Pre-A 學生的起點與目標會同時算出 Level A */
  const studyIdx = LEVELS.indexOf(studyLevel);
  const isTopLevel = studyIdx >= LEVELS.length - 1;
  const targetLevel = isTopLevel ? studyLevel : LEVELS[studyIdx + 1];
  const targetInfo = LEVEL_INFO[targetLevel];

  /* 五大能力:依表現由高到低排序,確保「先說強項、後說弱項」 */
  const skills = useMemo(() => Object.keys(SKILL_TAGS).map(s => {
    const st = moduleStats[s.toLowerCase()] || { correct: 0, total: 0 };
    const pct = st.total ? Math.round(st.correct / st.total * 100) : 0;
    return { skill: s, ...st, pct, tier: skillTier(pct, st.total),
             label: SKILL_TAGS[s].label, consult: SKILL_CONSULT[s] };
  }).sort((a, b) => b.pct - a.pct), [moduleStats]);

  const strengths = skills.filter(s => s.tier.strong);
  const weaks = skills.filter(s => s.total > 0 && !s.tier.strong);
  const topWeak = weaks.slice(-2).reverse();          /* 最需補強的兩項 */
  const normalizeItems = weaks.filter(s => NORMALIZE_NOTE[s.skill]);

  const toneCls = {
    emerald: 'bg-emerald-100 text-emerald-700', sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700', rose: 'bg-rose-100 text-rose-800',
    stone: 'bg-stone-100 text-slate-500'
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-start gap-3">
        <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-indigo-900 font-bold text-sm mb-1">教育顧問介紹報表</h4>
          <p className="text-indigo-700/90 text-xs leading-relaxed">
            依《教育顧問培訓手冊》六步驟編排,話術中的數據已自動帶入 {who} 的實際結果,可直接照著向家長介紹。
          </p>
        </div>
      </div>

      {/* STEP 1 */}
      <ConsultStep n="1" title="開場 — 肯定孩子完成測驗" hint="先讓家長放鬆,也讓孩子感到被肯定">
        <Script>
          Hello,〔家長稱謂〕您好,我是英語老師〔請說出您的姓名〕。恭喜 <strong>{who}</strong> 完成了這次的程度測驗!
          我們已經按照 TA 的測驗結果,安排英語班級讓 TA 試讀,想抽空和爸爸媽媽聊聊孩子的試讀狀況,
          以及一起來看看測驗結果,了解 TA 目前的英語能力,和接下來最適合的學習方向。
        </Script>
        <Tip>開場以「恭喜完成」為主軸。不要說「先看看考了幾分」,避免家長直覺進入評分模式。測驗完會直接安排試讀,不會有「尚未安排試讀」的情況。</Tip>
      </ConsultStep>

      {/* STEP 2 */}
      <ConsultStep n="2" title="說明整體成績 — 建立正確期待" hint="先點亮亮點,再帶出程度定位">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[['答對題數', `${totalCorrect} / ${totalAnswered}`], ['正確率', `${overallAccuracy}%`], ['用時', `約 ${minutes} 分鐘`]]
            .map(([k, v]) => (
              <div key={k} className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-center">
                <div className="text-base font-black text-slate-800">{v}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">{k}</div>
              </div>
            ))}
        </div>
        <Script>
          <strong>{who}</strong>這次測驗共答對 <strong>{totalCorrect}</strong> 題,正確率 <strong>{overallAccuracy}%</strong>,
          用時大約 <strong>{minutes}</strong> 分鐘。
          {strengths.length > 0 && <>其中 <strong>{strengths[0].label}</strong> 的表現特別好,答對 {strengths[0].correct}/{strengths[0].total}。</>}
          {' '}根據結果,TA 目前對應到國際標準 CEFR 的「<strong>{levelData.cefr}</strong>」等級,
          在我們 A.P.L.U.S 系統裡對標的是「<strong>{estimatedLevel === PRE_A ? 'Pre-A 預備階段' : `Level ${estimatedLevel} — ${levelData.name}`}</strong>」,
          這個級數最適合 <strong>{levelData.grade}</strong> 的孩子。
          也因此在英語班級,TA 今天試讀的正是「<strong>{estimatedLevel === PRE_A ? 'Pre-A 預備階段' : `Level ${estimatedLevel}`}</strong>」,
          TA 今天上課的時候〔請分享一則正向的觀察,以及孩子可以優化的部分〕,那我們接下來就一起看看測驗結果的細節。
        </Script>
        <Tip>先說成績的亮點(例如「速度很快」或「閱讀表現很好」),再帶出程度定位,家長感受會截然不同。試讀班級的級數會跟測驗結果一致,可順勢連結今天上課的實際觀察。</Tip>
      </ConsultStep>

      {/* STEP 3 */}
      <ConsultStep n="3" title="解讀五大能力 — 亮點先說,弱項正常化" hint="下表已依表現由高到低排序,由上往下唸即可">
        <div className="overflow-x-auto border border-stone-200 rounded-xl mb-3">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-slate-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">能力</th><th className="px-3 py-2">分數</th>
                <th className="px-3 py-2">評語</th><th className="px-3 py-2">代表意義</th>
                <th className="px-3 py-2">課程對應</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {skills.map(s => (
                <tr key={s.skill}>
                  <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">{s.skill} {s.label}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{s.correct} / {s.total}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${toneCls[s.tier.tone]}`}>
                      {s.tier.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-[12.5px]">
                    {s.total === 0 ? '本次未測到此能力' : s.tier.strong ? s.consult.strong : s.consult.weak}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[11.5px]">{s.consult.course}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Script>
          我們來看五個面向的表現。
          {strengths.length > 0
            ? <>TA 的「<strong>{strengths[0].label}</strong>」表現很好,答對 {strengths[0].correct}/{strengths[0].total},
                {strengths[0].consult.strong}!
                {strengths[1] && <>「{strengths[1].label}」也有一定基礎,拿到 {strengths[1].correct}/{strengths[1].total}。</>}</>
            : <>這次每個面向都還在建立基礎的階段,這正是課程要幫 TA 打底的地方。</>}
          {topWeak.length > 0 && <>{' '}需要特別加強的是
            「<strong>{topWeak.map(w => `${w.label} ${w.correct}/${w.total}`).join('」和「')}</strong>」。</>}
        </Script>
        {normalizeItems.length > 0 && (
          <div className="mt-2.5 space-y-2">
            {normalizeItems.map(s => (
              <div key={s.skill} className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                <Heart className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-sky-900 leading-relaxed">
                  <strong>{s.label}要正常化：</strong>{NORMALIZE_NOTE[s.skill]}
                </p>
              </div>
            ))}
          </div>
        )}
        <Tip>弱項一定要「正常化」,讓家長知道這是課程設計要補足的地方,而不是孩子的問題。</Tip>
      </ConsultStep>

      {/* STEP 4 */}
      <ConsultStep n="4" title="說明推薦班級 — 現在的起點 × 下一個目標" hint="讓家長看到成長藍圖,而不是弱點清單">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">現在的起點</p>
            <p className="font-black text-emerald-900">Level {studyLevel} — {studyInfo.name}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{studyInfo.cefr} · 適合 {studyInfo.grade}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
          <div className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">下一個目標</p>
            {isTopLevel ? (
              <>
                <p className="font-black text-slate-700">已達國小部最高級數</p>
                <p className="text-[11px] text-slate-500 mt-0.5">穩定後可挑戰耶加中學部系統,銜接國中會考</p>
              </>
            ) : (
              <>
                <p className="font-black text-slate-700">Level {targetLevel} — {targetInfo.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{targetInfo.cefr} · 適合 {targetInfo.grade}</p>
              </>
            )}
          </div>
        </div>
        <Script>
          根據測驗的結果,還有今天在班上的學習評估,我們建議 TA 從「<strong>Level {studyLevel} — {studyInfo.name}</strong>」開始學習。
          這個班正好在建立「{studyInfo.desc.replace(/[。．]$/, '')}」這些基礎,是 TA 目前程度最好的銜接點。
          {isTopLevel ? (
            <>{' '}接下來就是透過每兩個月的 Level-up 進階考持續精進,穩定後可挑戰耶加中學部系統,持續銜接國中會考。</>
          ) : (
            <>{' '}Level {studyLevel} 穩定之後,下一個目標就是挑戰「<strong>Level {targetLevel} — {targetInfo.name}</strong>」,
              屆時 TA 會學到{(COURSE_HIGHLIGHTS[targetLevel] || []).slice(0, 3).map(h => h.label).join('、')}等重點,
              是 {targetInfo.grade} 非常重要的關鍵階段。</>
          )}
        </Script>
        <Tip>用「現在的起點 → 下一個目標」描繪學習路徑,讓家長看到成長藍圖。</Tip>
      </ConsultStep>

      {/* STEP 5 */}
      <ConsultStep n="5" title="說明課程如何補強弱項" hint="把弱項直接對應到課程特色,增強報名信心">
        {topWeak.length > 0 ? (
          <div className="space-y-2 mb-3">
            {topWeak.map(s => (
              <div key={s.skill} className="flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl p-3">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${toneCls[s.tier.tone]}`}>{s.label}</span>
                <div>
                  <p className="text-[12.5px] text-slate-700">{s.consult.weak}</p>
                  <p className="text-[11.5px] text-emerald-700 font-bold mt-1">→ 由「{s.consult.course}」補強</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 mb-3">這次沒有明顯弱項,可著重說明課程如何幫助 TA 繼續往上挑戰。</p>
        )}
        <Script>
          對了!剛才說到{topWeak.length > 0 ? `「${topWeak.map(w => w.label).join('」和「')}」` : '需要加強的地方'}是需要加強的部分,
          在我們課程裡都有系統性的設計:文法是「六級循序進階」,不會跳關,從 Be 動詞一路到完成式,
          每個概念都要達到「讀、寫、造句、中文解釋、舉一反三」五合一通過,確保孩子是真正理解而非短期記憶。
          {' '}發音與拼字的部分,我們有耶加獨創的 PPS 學習法 (Phonics 發音規則 / Pronunciation 嘴型矯正 / Spelling 拼寫),
          用顏色分類記憶各式發音,讓孩子看字就能唸、唸了就能拼,不需要死記。
        </Script>
        <Tip>這是把「弱項」轉化為「課程賣點」的關鍵步驟,讓家長從「孩子有問題」轉變成「這裡剛好可以補足」。</Tip>
      </ConsultStep>

      {/* STEP 6 */}
      <ConsultStep n="6" title="收尾 — 引導下一步" hint="測驗完已直接安排試讀,收尾只需確認入班日期與上課資訊,再用二擇一降低決策負擔">
        <Script>
          接下來的英語課是在每週〔請說出上課星期〕,也是由我 Ms. / Mr.〔請說出您的姓名〕
          擔任 TA 的英語總導師來進行課程,那我們就直接幫 TA 安排入班,
          <strong>是這週開始上課,還是下週呢?</strong>老師也會開始預備教材給孩子。
        </Script>
        <Tip>因為測驗完會直接安排試讀,不會有「尚未安排試讀」的情況,收尾不必再問要不要試聽,直接確認入班日期即可。用「這週還是下週?」而不是「要不要入班?」——二擇一大幅提高成交機率。</Tip>
      </ConsultStep>

      {/* 五大核心課程 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
          <BookMarked className="w-4 h-4 text-emerald-600" />五大核心課程(每週 5 小時)
        </h3>
        <p className="text-[11px] text-slate-500 mb-2.5">每堂 60 分鐘,家長問到課程結構時可直接引用</p>
        <ul className="space-y-1.5">
          {CORE_COURSES.map(c => (
            <li key={c} className="text-[12.5px] text-slate-700 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />{c}
            </li>
          ))}
        </ul>
      </div>

      {/* Q&A */}
      <details className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Info className="w-4 h-4 text-sky-600" />常見家長問題 Q&A（{CONSULT_FAQ.length} 題)
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {CONSULT_FAQ.map((f, i) => (
            <div key={i} className="border-l-2 border-stone-200 pl-3">
              <p className="text-[12.5px] font-bold text-slate-800">Q {f.q}</p>
              <p className="text-[12px] text-slate-600 leading-relaxed mt-1">A {f.a}</p>
            </div>
          ))}
        </div>
      </details>

      {/* 自我檢核 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-2.5 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-violet-600" />介紹後自我檢核
        </h3>
        <ul className="space-y-1.5">
          {CONSULT_CHECKLIST.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-700">
              <span className="w-4 h-4 shrink-0 mt-0.5 border-2 border-stone-300 rounded" />{c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   教育者視角 — 教學藍圖 + 各級達成度
   ═══════════════════════════════════════════════════════════════ */
function EducatorView({ levelData, estimatedLevel, nextLevel, nextLevelData, moduleStats, levelStats, mistakes, answers }) {
  /* 接下來要就讀的級數 (Pre-A → Level A) */
  const studyLevel = studyLevelOf(estimatedLevel);
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
        {estimatedLevel === PRE_A && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              本次判定為 <strong>Pre-A 預備階段</strong>：Level A 未達 {Math.round(PASS_RATE * 100)}% 門檻,因此下列各級皆未標記為當前級數。
            </p>
          </div>
        )}
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
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= PASS_RATE * 100 ? '#10B981' : pct >= PASS_RATE * 50 ? '#F59E0B' : '#F43F5E' }} />
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
          <Target className="w-4 h-4 text-emerald-600" />
          Level {studyLevel} 學習目標{estimatedLevel === PRE_A ? '' : '達成'}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {estimatedLevel === PRE_A
            ? `Level A 未達 ${Math.round(PASS_RATE * 100)}% 門檻,以下為接下來需優先建立的能力`
            : '基於本級實際作答表現估計'}
        </p>
        <div className="space-y-2">
          {(LEVEL_INFO[studyLevel]?.objectives || []).map((obj, i) => {
            const lvlStat = levelStats[estimatedLevel] || { correct: 0, total: 0 };
            /* Pre-A 尚未達 A 級,其 A 級學習目標一律標記為需加強 */
            const isMaster = estimatedLevel !== PRE_A &&
              (lvlStat.total === 0 || (lvlStat.correct / lvlStat.total) >= PASS_RATE);
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
