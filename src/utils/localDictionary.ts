import type { LessonDoc, ReadingPassageDoc } from '../types';

export interface DictionaryEntry {
  text: string;
  ipa: string;
  partOfSpeech: string;
  meaningVi: string;
  noteVi?: string;
  source: 'curriculum' | 'reading' | 'cache' | 'ai';
}

const CACHE_STORAGE_KEY = 'pilot_tooltip_dict_cache_v1';
const MAX_CACHE_ENTRIES = 300;

interface CachedDictStore {
  [normalizedKey: string]: {
    entry: Omit<DictionaryEntry, 'source'>;
    savedAt: number;
  };
}

const VIETNAMESE_DIACRITIC_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const ENGLISH_LETTER_REGEX = /[A-Za-z]/;

export function isLikelyEnglishText(raw: string): boolean {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length < 2) return false;
  if (VIETNAMESE_DIACRITIC_REGEX.test(cleaned)) return false;
  const asciiLetters = (cleaned.match(/[A-Za-z]/g) || []).length;
  if (asciiLetters < 2) return false;
  // Require majority alphabetic characters (allowing punctuation/spaces/hyphens/apostrophes)
  const nonSpace = cleaned.replace(/\s+/g, '').length;
  return nonSpace > 0 && asciiLetters / nonSpace >= 0.55;
}

export function normalizeLookupKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    .replace(/\s+/g, ' ');
}

function candidateStems(word: string): string[] {
  const w = normalizeLookupKey(word);
  const forms = new Set<string>([w]);
  if (w.endsWith('ies') && w.length > 4) forms.add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es') && w.length > 3) forms.add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 3) forms.add(w.slice(0, -1));
  if (w.endsWith('ied') && w.length > 4) forms.add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ed') && w.length > 4) {
    forms.add(w.slice(0, -2));
    forms.add(w.slice(0, -1));
  }
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    forms.add(base);
    forms.add(`${base}e`);
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
      forms.add(base.slice(0, -1));
    }
  }
  return Array.from(forms);
}

export function buildLocalCurriculumDictionary(
  lessons: LessonDoc[],
  readingPassages: ReadingPassageDoc[]
): Map<string, DictionaryEntry> {
  const map = new Map<string, DictionaryEntry>();

  for (const lesson of lessons) {
    for (const vocab of lesson.vocabulary) {
      const key = normalizeLookupKey(vocab.word);
      if (key && !map.has(key)) {
        map.set(key, {
          text: vocab.word,
          ipa: vocab.ipa || '',
          partOfSpeech: vocab.partOfSpeech || '',
          meaningVi: vocab.meaningVi,
          noteVi: vocab.exampleEn
            ? `Ví dụ: "${vocab.exampleEn}" — ${vocab.exampleVi}`
            : undefined,
          source: 'curriculum',
        });
      }
      const exKey = normalizeLookupKey(vocab.exampleEn || '');
      if (exKey && vocab.exampleVi && !map.has(exKey)) {
        map.set(exKey, {
          text: vocab.exampleEn,
          ipa: '',
          partOfSpeech: 'Câu ví dụ',
          meaningVi: vocab.exampleVi,
          source: 'curriculum',
        });
      }
    }

    for (const pattern of lesson.sentencePatterns) {
      const pKey = normalizeLookupKey(pattern.structure || '');
      if (pKey && pattern.meaningVi && !map.has(pKey)) {
        map.set(pKey, {
          text: pattern.structure,
          ipa: '',
          partOfSpeech: 'Mẫu câu',
          meaningVi: pattern.meaningVi,
          noteVi: pattern.usageVi || undefined,
          source: 'curriculum',
        });
      }
      const exKey = normalizeLookupKey(pattern.exampleEn || '');
      if (exKey && pattern.exampleVi && !map.has(exKey)) {
        map.set(exKey, {
          text: pattern.exampleEn,
          ipa: '',
          partOfSpeech: 'Câu giao tiếp',
          meaningVi: pattern.exampleVi,
          source: 'curriculum',
        });
      }
      for (const line of pattern.dialogue || []) {
        const lineKey = normalizeLookupKey(line.en || '');
        if (lineKey && line.vi && !map.has(lineKey)) {
          map.set(lineKey, {
            text: line.en,
            ipa: '',
            partOfSpeech: 'Câu hội thoại',
            meaningVi: line.vi,
            source: 'curriculum',
          });
        }
      }
    }
  }

  for (const passage of readingPassages) {
    const titleKey = normalizeLookupKey(passage.titleEn || '');
    if (titleKey && passage.titleVi && !map.has(titleKey)) {
      map.set(titleKey, {
        text: passage.titleEn,
        ipa: '',
        partOfSpeech: 'Tiêu đề bài đọc',
        meaningVi: passage.titleVi,
        source: 'reading',
      });
    }
    const contentKey = normalizeLookupKey(passage.contentEn || '');
    if (contentKey && passage.contentVi && !map.has(contentKey)) {
      map.set(contentKey, {
        text: passage.titleEn || passage.contentEn.slice(0, 60),
        ipa: '',
        partOfSpeech: 'Đoạn văn',
        meaningVi: passage.contentVi,
        source: 'reading',
      });
    }
  }

  return map;
}

export function lookupLocalDictionary(
  dict: Map<string, DictionaryEntry>,
  rawText: string
): DictionaryEntry | null {
  const exactKey = normalizeLookupKey(rawText);
  if (!exactKey) return null;

  const exactHit = dict.get(exactKey);
  if (exactHit) return exactHit;

  // For single English words, also try lightweight inflection stems
  if (!exactKey.includes(' ')) {
    for (const stem of candidateStems(exactKey)) {
      const hit = dict.get(stem);
      if (hit) {
        return {
          ...hit,
          text: rawText.trim(),
        };
      }
    }
  }

  return null;
}

function readPersistentDictCache(): CachedDictStore {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CachedDictStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function lookupCachedTranslation(rawText: string): DictionaryEntry | null {
  const key = normalizeLookupKey(rawText);
  if (!key) return null;
  const store = readPersistentDictCache();
  const hit = store[key];
  if (!hit?.entry?.meaningVi) return null;
  return {
    ...hit.entry,
    source: 'cache',
  };
}

export function saveCachedTranslation(rawText: string, entry: Omit<DictionaryEntry, 'source'>): void {
  const key = normalizeLookupKey(rawText);
  if (!key) return;
  try {
    const store = readPersistentDictCache();
    store[key] = { entry, savedAt: Date.now() };
    const entries = Object.entries(store);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => b[1].savedAt - a[1].savedAt);
      const trimmed: CachedDictStore = {};
      for (const [k, v] of entries.slice(0, MAX_CACHE_ENTRIES)) {
        trimmed[k] = v;
      }
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Extracts the English word (and its surrounding English sentence) at a pointer position.
 */
export function extractEnglishTextAtPoint(
  clientX: number,
  clientY: number,
  targetEl: HTMLElement | null
): { word: string; sentence: string } | null {
  // 1. Respect existing user text selection if it is English
  const selectionText = window.getSelection()?.toString().trim() ?? '';
  if (selectionText && selectionText.length <= 450 && isLikelyEnglishText(selectionText)) {
    return {
      word: selectionText,
      sentence: '',
    };
  }

  // 2. Locate exact text node and character offset under pointer
  let textNode: Node | null = null;
  let offset = 0;

  const docWithCaret = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof docWithCaret.caretPositionFromPoint === 'function') {
    const pos = docWithCaret.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      textNode = pos.offsetNode;
      offset = pos.offset;
    }
  } else if (typeof docWithCaret.caretRangeFromPoint === 'function') {
    const range = docWithCaret.caretRangeFromPoint(clientX, clientY);
    if (range) {
      textNode = range.startContainer;
      offset = range.startOffset;
    }
  }

  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const fullText = textNode.textContent || '';
    if (fullText.trim()) {
      const clamped = Math.max(0, Math.min(fullText.length - 1, offset));
      const wordChar = /[A-Za-z'-]/;

      // Find nearest English letter within +-2 chars of caret
      let anchor = clamped;
      if (!wordChar.test(fullText[anchor] || '')) {
        for (const delta of [-1, 1, -2, 2]) {
          const idx = clamped + delta;
          if (idx >= 0 && idx < fullText.length && wordChar.test(fullText[idx])) {
            anchor = idx;
            break;
          }
        }
      }

      if (wordChar.test(fullText[anchor] || '')) {
        let start = anchor;
        let end = anchor;
        while (start > 0 && wordChar.test(fullText[start - 1])) start -= 1;
        while (end < fullText.length && wordChar.test(fullText[end])) end += 1;
        const word = fullText.slice(start, end).replace(/^['-]+|['-]+$/g, '');

        // Extract enclosing sentence around the word for context & "Translate full sentence"
        let sentStart = start;
        while (sentStart > 0 && !/[.!?\n]/.test(fullText[sentStart - 1])) sentStart -= 1;
        let sentEnd = end;
        while (sentEnd < fullText.length && !/[.!?\n]/.test(fullText[sentEnd])) sentEnd += 1;
        if (sentEnd < fullText.length && /[.!?]/.test(fullText[sentEnd])) sentEnd += 1;

        const rawSentence = fullText.slice(sentStart, sentEnd).trim().replace(/\s+/g, ' ');
        const sentence =
          rawSentence.length <= 280 && isLikelyEnglishText(rawSentence) ? rawSentence : '';

        if (word && isLikelyEnglishText(word)) {
          return {
            word,
            sentence:
              sentence && normalizeLookupKey(sentence) !== normalizeLookupKey(word) ? sentence : '',
          };
        }
      }
    }
  }

  // 3. Fallback: check target element's own concise English text
  if (targetEl) {
    const elText = (targetEl.innerText || targetEl.textContent || '').trim().replace(/\s+/g, ' ');
    if (
      elText &&
      elText.length >= 2 &&
      elText.length <= 240 &&
      ENGLISH_LETTER_REGEX.test(elText) &&
      isLikelyEnglishText(elText)
    ) {
      return {
        word: elText,
        sentence: '',
      };
    }
  }

  return null;
}
