import type {
  GrammarContent,
  LessonDoc,
  PartOfSpeech,
  QuizQuestion,
  SentencePattern,
  VocabularyItem,
} from '../types';

export type VocabSeedTuple = [
  word: string,
  ipa: string,
  pos: PartOfSpeech,
  meaningVi: string,
  exampleEn: string,
  exampleVi: string,
];

export type PatternSeedTuple = [
  structure: string,
  meaningVi: string,
  usageVi: string,
  exampleEn: string,
  exampleVi: string,
  dialogueAEn: string,
  dialogueAVi: string,
  dialogueBEn: string,
  dialogueBVi: string,
];

export interface LessonBlueprint {
  lessonId: string;
  levelId: 'A1' | 'A2' | 'B1' | 'ESP';
  topic: string;
  topicOrder: number;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  dialogueSpeakers?: [string, string];
  vocabulary: VocabSeedTuple[];
  sentencePatterns: PatternSeedTuple[];
  grammar: GrammarContent;
  customQuiz: Omit<QuizQuestion, 'id'>[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildOptions<T>(
  correct: T,
  distractors: T[],
  seed: number
): { options: [T, T, T, T]; correctIndex: number } {
  const uniqueDistractors = distractors.filter((d) => d !== correct).slice(0, 3);
  const pool: T[] = [correct, ...uniqueDistractors];
  while (pool.length < 4) {
    pool.push(correct);
  }
  const shift = seed % 4;
  const rotated: [T, T, T, T] = [
    pool[(0 + shift) % 4],
    pool[(1 + shift) % 4],
    pool[(2 + shift) % 4],
    pool[(3 + shift) % 4],
  ];
  const correctIndex = rotated.indexOf(correct);
  return { options: rotated, correctIndex: correctIndex >= 0 ? correctIndex : 0 };
}

export function buildLesson(bp: LessonBlueprint): LessonDoc {
  const vocabulary: VocabularyItem[] = bp.vocabulary.map((item, idx) => ({
    id: `${bp.lessonId}_v${String(idx + 1).padStart(2, '0')}`,
    word: item[0],
    ipa: item[1],
    partOfSpeech: item[2],
    meaningVi: item[3],
    exampleEn: item[4],
    exampleVi: item[5],
    category: bp.topic,
  }));

  const [speakerA, speakerB] = bp.dialogueSpeakers ?? ['Lan', 'Minh'];

  const sentencePatterns: SentencePattern[] = bp.sentencePatterns.map((p, idx) => ({
    id: `${bp.lessonId}_p${String(idx + 1).padStart(2, '0')}`,
    structure: p[0],
    meaningVi: p[1],
    usageVi: p[2],
    exampleEn: p[3],
    exampleVi: p[4],
    dialogue: [
      { speaker: speakerA, en: p[5], vi: p[6] },
      { speaker: speakerB, en: p[7], vi: p[8] },
    ],
  }));

  // Build 15 varied quiz questions:
  // - 7 custom handcrafted questions (grammar x2, sentence_pattern x2, word_order x1, reading_comprehension x2)
  // - 8 verified vocabulary & context questions (vocab_en_to_vi x3, vocab_vi_to_en x3, fill_blank x2)
  const generatedQuiz: Omit<QuizQuestion, 'id'>[] = [];

  // 3 vocab_en_to_vi questions
  const enToViIndices = [0, 4, 9];
  enToViIndices.forEach((vIdx, qOffset) => {
    const target = vocabulary[vIdx];
    if (!target) return;
    const distractors = [
      vocabulary[(vIdx + 2) % vocabulary.length].meaningVi,
      vocabulary[(vIdx + 5) % vocabulary.length].meaningVi,
      vocabulary[(vIdx + 8) % vocabulary.length].meaningVi,
    ];
    const { options, correctIndex } = buildOptions(target.meaningVi, distractors, bp.order + qOffset);
    generatedQuiz.push({
      type: 'vocab_en_to_vi',
      question: `Nghĩa tiếng Việt chính xác của từ "${target.word}" (${target.ipa}) là gì?`,
      options,
      correctIndex,
      explanationVi: `"${target.word}" (${target.partOfSpeech}) có nghĩa là "${target.meaningVi}". Ví dụ: "${target.exampleEn}" (${target.exampleVi}).`,
    });
  });

  // 3 vocab_vi_to_en questions
  const viToEnIndices = [1, 6, 11];
  viToEnIndices.forEach((vIdx, qOffset) => {
    const target = vocabulary[vIdx];
    if (!target) return;
    const distractors = [
      vocabulary[(vIdx + 3) % vocabulary.length].word,
      vocabulary[(vIdx + 6) % vocabulary.length].word,
      vocabulary[(vIdx + 10) % vocabulary.length].word,
    ];
    const { options, correctIndex } = buildOptions(target.word, distractors, bp.order + qOffset + 1);
    generatedQuiz.push({
      type: 'vocab_vi_to_en',
      question: `Từ tiếng Anh nào có nghĩa là "${target.meaningVi}"?`,
      options,
      correctIndex,
      explanationVi: `"${target.meaningVi}" trong tiếng Anh là "${target.word}" (${target.ipa}).`,
    });
  });

  // 2 fill_blank questions using real examples from the lesson
  const fillCandidates = vocabulary.filter((v) =>
    new RegExp(`\\b${escapeRegExp(v.word)}\\b`, 'i').test(v.exampleEn)
  );
  const chosenFill = [
    fillCandidates[2] || fillCandidates[0] || vocabulary[2],
    fillCandidates[7] || fillCandidates[1] || vocabulary[7],
  ].filter(Boolean);

  chosenFill.forEach((target, qOffset) => {
    const regex = new RegExp(`\\b${escapeRegExp(target.word)}\\b`, 'i');
    const blankSentence = regex.test(target.exampleEn)
      ? target.exampleEn.replace(regex, '_______')
      : `Choose the best word meaning "${target.meaningVi}": _______`;
    const targetIdx = vocabulary.findIndex((v) => v.id === target.id);
    const distractors = [
      vocabulary[(targetIdx + 1) % vocabulary.length].word,
      vocabulary[(targetIdx + 4) % vocabulary.length].word,
      vocabulary[(targetIdx + 7) % vocabulary.length].word,
    ];
    const { options, correctIndex } = buildOptions(target.word, distractors, bp.order + qOffset + 2);
    generatedQuiz.push({
      type: 'fill_blank',
      question: `Điền từ thích hợp vào chỗ trống: "${blankSentence}"`,
      options,
      correctIndex,
      explanationVi: `Đáp án đúng là "${target.word}" (${target.meaningVi}). Câu hoàn chỉnh: "${target.exampleEn}" — "${target.exampleVi}".`,
    });
  });

  const combinedQuiz: QuizQuestion[] = [...generatedQuiz, ...bp.customQuiz]
    .slice(0, 15)
    .map((q, idx) => ({
      ...q,
      id: `${bp.lessonId}_q${String(idx + 1).padStart(2, '0')}`,
    }));

  return {
    lessonId: bp.lessonId,
    levelId: bp.levelId,
    topic: bp.topic,
    topicOrder: bp.topicOrder,
    title: bp.title,
    description: bp.description,
    order: bp.order,
    estimatedMinutes: bp.estimatedMinutes,
    isPublished: true,
    vocabulary,
    sentencePatterns,
    grammar: bp.grammar,
    quiz: combinedQuiz,
  };
}
