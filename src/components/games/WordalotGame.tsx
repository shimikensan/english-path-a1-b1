import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Delete,
  Image as ImageIcon,
  Lightbulb,
  RotateCcw,
  Trophy,
  Volume2,
} from 'lucide-react';
import { WORDALOT_PUZZLES, type WordalotClueWord, type WordalotPuzzle } from '../../data/wordalotPuzzles';
import {
  playCorrectChime,
  playLevelFanfare,
  playTileClick,
  playWrongBuzz,
} from '../../utils/gameSfx';
import { speakEnglish } from '../../utils/speech';

interface WordalotGameProps {
  onScoreUpdate?: (points: number) => void;
  onWordMastered?: () => void;
}

interface CellMeta {
  row: number;
  col: number;
  solution: string;
  wordIds: string[];
  clueNumber?: number;
}

function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

function buildPuzzleCells(puzzle: WordalotPuzzle): Map<string, CellMeta> {
  const map = new Map<string, CellMeta>();
  for (const w of puzzle.words) {
    const letters = w.word.toUpperCase().split('');
    letters.forEach((ch, idx) => {
      const r = w.direction === 'down' ? w.row + idx : w.row;
      const c = w.direction === 'across' ? w.col + idx : w.col;
      const key = cellKey(r, c);
      const existing = map.get(key);
      if (existing) {
        if (!existing.wordIds.includes(w.id)) existing.wordIds.push(w.id);
        if (idx === 0 && existing.clueNumber === undefined) {
          existing.clueNumber = w.number;
        }
      } else {
        map.set(key, {
          row: r,
          col: c,
          solution: ch,
          wordIds: [w.id],
          clueNumber: idx === 0 ? w.number : undefined,
        });
      }
    });
  }
  return map;
}

function getWordCellKeys(w: WordalotClueWord): string[] {
  return w.word.split('').map((_, idx) => {
    const r = w.direction === 'down' ? w.row + idx : w.row;
    const c = w.direction === 'across' ? w.col + idx : w.col;
    return cellKey(r, c);
  });
}

function buildLetterRack(word: WordalotClueWord, seedOffset: number): string[] {
  const letters = word.word.toUpperCase().split('');
  const extras = 'AEIOURSTLNMPBCDGKH';
  // Add 3-4 distractor letters for genuine puzzle fun without clutter
  let extraIdx = (word.word.length * 3 + seedOffset) % extras.length;
  while (letters.length < Math.min(10, word.word.length + 4)) {
    const ch = extras[extraIdx % extras.length];
    letters.push(ch);
    extraIdx += 5;
  }
  // Deterministic shuffle per word so letters don't jump on re-render
  const copy = [...letters];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (i * 7 + seedOffset + word.number * 3) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function WordalotGame({ onScoreUpdate, onWordMastered }: WordalotGameProps) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = WORDALOT_PUZZLES[puzzleIdx];

  const cellMap = useMemo(() => buildPuzzleCells(puzzle), [puzzle]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [solvedWordIds, setSolvedWordIds] = useState<string[]>([]);
  const [activeWordId, setActiveWordId] = useState<string>(puzzle.words[0].id);
  const [focusedKey, setFocusedKey] = useState<string>(() =>
    cellKey(puzzle.words[0].row, puzzle.words[0].col)
  );
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongFlashKey, setWrongFlashKey] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const activeWord = useMemo(
    () => puzzle.words.find((w) => w.id === activeWordId) || puzzle.words[0],
    [puzzle, activeWordId]
  );

  const activeWordKeys = useMemo(() => getWordCellKeys(activeWord), [activeWord]);

  const letterRack = useMemo(
    () => buildLetterRack(activeWord, puzzleIdx * 11 + activeWord.number),
    [activeWord, puzzleIdx]
  );

  const isPuzzleComplete = solvedWordIds.length === puzzle.words.length;

  const resetPuzzleState = useCallback((nextIdx: number) => {
    const target = WORDALOT_PUZZLES[nextIdx];
    setPuzzleIdx(nextIdx);
    setEntries({});
    setSolvedWordIds([]);
    setActiveWordId(target.words[0].id);
    setFocusedKey(cellKey(target.words[0].row, target.words[0].col));
    setHintsUsed(0);
    setWrongFlashKey(null);
    setImgFailed(false);
  }, []);

  const checkSolvedWords = useCallback(
    (nextEntries: Record<string, string>, prevSolved: string[]) => {
      const newlySolved: WordalotClueWord[] = [];
      for (const w of puzzle.words) {
        if (prevSolved.includes(w.id)) continue;
        const keys = getWordCellKeys(w);
        const complete = keys.every((k, i) => nextEntries[k] === w.word[i].toUpperCase());
        if (complete) {
          newlySolved.push(w);
        }
      }

      if (newlySolved.length > 0) {
        const updatedSolved = [...prevSolved, ...newlySolved.map((w) => w.id)];
        setSolvedWordIds(updatedSolved);
        const earned = newlySolved.length * 100;
        setScore((s) => {
          const nextScore = s + earned;
          onScoreUpdate?.(nextScore);
          return nextScore;
        });
        onWordMastered?.();
        speakEnglish(newlySolved[0].word);

        if (updatedSolved.length === puzzle.words.length) {
          playLevelFanfare();
        } else {
          playCorrectChime();
          // Auto-select next unsolved word cleanly
          const nextUnsolved = puzzle.words.find((w) => !updatedSolved.includes(w.id));
          if (nextUnsolved) {
            setActiveWordId(nextUnsolved.id);
            const nextKeys = getWordCellKeys(nextUnsolved);
            const firstEmpty = nextKeys.find((k) => !nextEntries[k]) || nextKeys[0];
            setFocusedKey(firstEmpty);
          }
        }
      }
    },
    [puzzle, onScoreUpdate, onWordMastered]
  );

  // Determine whether a cell is locked because one of its words is already solved
  const isCellLocked = useCallback(
    (k: string): boolean => {
      const meta = cellMap.get(k);
      if (!meta) return true;
      return meta.wordIds.some((id) => solvedWordIds.includes(id));
    },
    [cellMap, solvedWordIds]
  );

  const handleInputLetter = useCallback(
    (rawLetter: string) => {
      if (isPuzzleComplete) return;
      const letter = rawLetter.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;

      // Find best target cell in active word (focusedKey if unlocked, else next empty unlocked cell)
      let targetKey = focusedKey;
      if (!activeWordKeys.includes(targetKey) || isCellLocked(targetKey)) {
        const candidate = activeWordKeys.find((k) => !isCellLocked(k) && !entries[k]);
        targetKey = candidate || activeWordKeys.find((k) => !isCellLocked(k)) || '';
      }
      if (!targetKey) return;

      playTileClick();
      const nextEntries = { ...entries, [targetKey]: letter };
      setEntries(nextEntries);

      // Advance focus to next empty unlocked cell in active word
      const curIdx = activeWordKeys.indexOf(targetKey);
      const nextEmpty =
        activeWordKeys.slice(curIdx + 1).find((k) => !isCellLocked(k) && !nextEntries[k]) ||
        activeWordKeys.find((k) => !isCellLocked(k) && !nextEntries[k]);
      if (nextEmpty) {
        setFocusedKey(nextEmpty);
      }

      // Check if active word is now completely filled but wrong
      const allFilled = activeWordKeys.every((k) => Boolean(nextEntries[k]));
      const matchesSolution = activeWordKeys.every(
        (k, i) => nextEntries[k] === activeWord.word[i].toUpperCase()
      );
      if (allFilled && !matchesSolution) {
        playWrongBuzz();
        setWrongFlashKey(activeWord.id);
        window.setTimeout(() => setWrongFlashKey(null), 480);
      }

      checkSolvedWords(nextEntries, solvedWordIds);
    },
    [
      isPuzzleComplete,
      focusedKey,
      activeWordKeys,
      isCellLocked,
      entries,
      activeWord,
      checkSolvedWords,
      solvedWordIds,
    ]
  );

  const handleBackspace = useCallback(() => {
    if (isPuzzleComplete) return;
    let targetKey = focusedKey;
    if (!activeWordKeys.includes(targetKey)) {
      targetKey = activeWordKeys[activeWordKeys.length - 1];
    }

    if (entries[targetKey] && !isCellLocked(targetKey)) {
      playTileClick();
      const nextEntries = { ...entries };
      delete nextEntries[targetKey];
      setEntries(nextEntries);
      return;
    }

    // Move backward to previous unlocked filled cell
    const idx = activeWordKeys.indexOf(targetKey);
    for (let i = idx - 1; i >= 0; i--) {
      const prevK = activeWordKeys[i];
      if (!isCellLocked(prevK)) {
        playTileClick();
        const nextEntries = { ...entries };
        delete nextEntries[prevK];
        setEntries(nextEntries);
        setFocusedKey(prevK);
        break;
      }
    }
  }, [isPuzzleComplete, focusedKey, activeWordKeys, entries, isCellLocked]);

  const handleRevealHint = () => {
    if (isPuzzleComplete) return;
    // Reveal focused cell if wrong/empty, otherwise first empty/wrong cell in active word
    const targetKey =
      (activeWordKeys.includes(focusedKey) &&
        !isCellLocked(focusedKey) &&
        entries[focusedKey] !== cellMap.get(focusedKey)?.solution &&
        focusedKey) ||
      activeWordKeys.find(
        (k) => !isCellLocked(k) && entries[k] !== cellMap.get(k)?.solution
      );
    if (!targetKey) return;
    const solution = cellMap.get(targetKey)?.solution;
    if (!solution) return;

    playTileClick();
    setHintsUsed((h) => h + 1);
    const nextEntries = { ...entries, [targetKey]: solution };
    setEntries(nextEntries);

    const nextEmpty = activeWordKeys.find((k) => !isCellLocked(k) && !nextEntries[k]);
    if (nextEmpty) setFocusedKey(nextEmpty);
    checkSolvedWords(nextEntries, solvedWordIds);
  };

  // Physical keyboard support for desktop speed
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleInputLetter(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackspace, handleInputLetter]);

  const handleSelectCell = (k: string) => {
    const meta = cellMap.get(k);
    if (!meta) return;
    // If clicking an intersection already focused, toggle between across & down words
    if (k === focusedKey && meta.wordIds.length > 1) {
      const other = meta.wordIds.find((id) => id !== activeWordId);
      if (other) setActiveWordId(other);
      return;
    }
    setFocusedKey(k);
    if (!meta.wordIds.includes(activeWordId)) {
      const preferred =
        meta.wordIds.find((id) => !solvedWordIds.includes(id)) || meta.wordIds[0];
      setActiveWordId(preferred);
    }
  };

  return (
    <div className="space-y-5">
      {/* Scene Level Switcher & HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn màn chơi Wordalot">
          {WORDALOT_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => resetPuzzleState(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                idx === puzzleIdx
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Màn {idx + 1}: {p.titleVi}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          <span>
            Đã giải <strong className="text-slate-900 dark:text-white">{solvedWordIds.length}/{puzzle.words.length}</strong> từ
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Điểm <strong className="text-[#D94E00] dark:text-[#FF8C2E]">{score}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>Gợi ý: {hintsUsed}</span>
        </div>
      </div>

      {/* Main Split Wordalot Stage: Picture + Clue List (Left) | Interactive Crossword + Rack (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Illustrated Picture Clue Scene */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {imgFailed ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-500">
                  <ImageIcon className="w-8 h-8 mb-2 text-[#FF6B00]" />
                  <span className="text-xs font-semibold">{puzzle.titleVi}</span>
                </div>
              ) : (
                <img
                  src={puzzle.image}
                  alt={`Bức tranh gợi ý Wordalot: ${puzzle.titleVi}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-4 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                CEFR {puzzle.levelId} · Quan sát tranh &amp; giải ô chữ
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {puzzle.titleVi}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {puzzle.subtitleVi}
              </p>
            </div>
          </div>

          {/* Interactive Word Clue List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Danh sách gợi ý ({puzzle.words.length} từ trong tranh)
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {puzzle.words.map((w) => {
                const solved = solvedWordIds.includes(w.id);
                const selected = activeWord.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setActiveWordId(w.id);
                      const keys = getWordCellKeys(w);
                      const target = keys.find((k) => !isCellLocked(k) && !entries[k]) || keys[0];
                      setFocusedKey(target);
                    }}
                    className={`w-full py-2.5 px-2.5 text-left rounded-xl transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                      selected
                        ? 'bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-[#D94E00] dark:text-[#FF8C2E] tabular-nums">
                          {w.number}. {w.direction === 'across' ? 'Hàng ngang' : 'Hàng dọc'}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {w.meaningVi}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                          {w.word.length} chữ cái
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                        {w.visualHintVi}
                      </p>
                    </div>
                    {solved && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        {w.word}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Active Clue Header + Crossword Grid + Letter Tile Rack */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-5">
          {/* Active Clue Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-semibold text-[#D94E00] dark:text-[#FF8C2E]">
                Ô chữ #{activeWord.number} · {activeWord.direction === 'across' ? 'Hàng ngang' : 'Hàng dọc'} · {activeWord.word.length} chữ cái
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {activeWord.meaningVi}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeWord.visualHintVi}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => speakEnglish(activeWord.word)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
                title="Nghe gợi ý phát âm tiếng Anh"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe gợi ý</span>
              </button>
              <button
                type="button"
                disabled={isPuzzleComplete}
                onClick={handleRevealHint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300/80 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-40 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Mở 1 chữ</span>
              </button>
            </div>
          </div>

          {/* Interlocking Crossword Board */}
          <div className="overflow-x-auto pb-1">
            <div
              className="mx-auto grid gap-1.5 w-fit"
              style={{
                gridTemplateColumns: `repeat(${puzzle.cols}, minmax(34px, 44px))`,
              }}
            >
              {Array.from({ length: puzzle.rows * puzzle.cols }).map((_, flatIdx) => {
                const r = Math.floor(flatIdx / puzzle.cols);
                const c = flatIdx % puzzle.cols;
                const k = cellKey(r, c);
                const meta = cellMap.get(k);

                if (!meta) {
                  return <div key={k} className="w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true" />;
                }

                const inActiveWord = activeWordKeys.includes(k);
                const isFocused = focusedKey === k;
                const solved = isCellLocked(k);
                const isWrong = wrongFlashKey === activeWord.id && inActiveWord && !solved;
                const val = entries[k] || '';

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelectCell(k)}
                    aria-label={`Ô hàng ${r + 1} cột ${c + 1}${val ? `, chữ ${val}` : ', trống'}`}
                    className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg border-2 font-extrabold text-base sm:text-lg flex items-center justify-center transition-colors cursor-pointer select-none ${
                      solved
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : isWrong
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          : isFocused
                            ? 'border-[#FF6B00] bg-[#FF6B00]/15 dark:bg-[#FF6B00]/25 text-slate-900 dark:text-white ring-2 ring-[#FF6B00]/30'
                            : inActiveWord
                              ? 'border-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/35 text-slate-900 dark:text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:border-slate-400'
                    }`}
                  >
                    {meta.clueNumber !== undefined && (
                      <span className="absolute top-0.5 left-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-none">
                        {meta.clueNumber}
                      </span>
                    )}
                    <span>{val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Victory Summary OR Interactive Letter Tile Rack */}
          {isPuzzleComplete ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/30 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Hoàn thành xuất sắc màn “{puzzle.titleVi}”!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Bạn đã giải trọn bộ {puzzle.words.length} từ vựng qua tranh.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => resetPuzzleState(puzzleIdx)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Chơi lại
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzleState((puzzleIdx + 1) % WORDALOT_PUZZLES.length)}
                    className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#FF7E1F] cursor-pointer"
                  >
                    Màn tiếp theo →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60">
                {puzzle.words.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/70 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{w.word}</span>{' '}
                      <span className="font-mono text-blue-600 dark:text-blue-400">{w.ipa}</span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">— {w.meaningVi}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(w.word)}
                      className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 cursor-pointer"
                      aria-label={`Nghe phát âm ${w.word}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Chạm chữ cái bên dưới hoặc gõ trực tiếp bằng bàn phím</span>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  <Delete className="w-3.5 h-3.5" />
                  Xóa
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {letterRack.map((ch, idx) => (
                  <button
                    key={`${ch}-${idx}`}
                    type="button"
                    onClick={() => handleInputLetter(ch)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-base shadow-[0_2px_0_rgba(15,23,42,0.18)] dark:shadow-[0_2px_0_rgba(0,0,0,0.45)] hover:border-[#FF6B00] hover:text-[#D94E00] dark:hover:text-[#FF8C2E] active:translate-y-0.5 transition-transform cursor-pointer"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
