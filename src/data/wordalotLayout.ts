import type { LearnerCEFRLevel } from '../types';
import type { WordalotClueWord, WordalotPuzzle } from './wordalotPuzzles';

export interface WordalotRawWord {
  word: string;
  ipa: string;
  meaningVi: string;
  visualHintVi: string;
}

export interface WordalotRawPuzzle {
  id: string;
  titleVi: string;
  subtitleVi: string;
  levelId: LearnerCEFRLevel;
  image: string;
  words: WordalotRawWord[];
}

interface PlacedWord {
  raw: WordalotRawWord;
  upper: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

interface CellState {
  ch: string;
  across: boolean;
  down: boolean;
}

function keyOf(r: number, c: number): string {
  return `${r}:${c}`;
}

function canPlaceWord(
  grid: Map<string, CellState>,
  upper: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  requireIntersection: boolean
): { valid: boolean; intersections: number } {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  // Cell immediately before start and immediately after end must be empty
  if (grid.has(keyOf(row - dr, col - dc))) return { valid: false, intersections: 0 };
  if (grid.has(keyOf(row + dr * upper.length, col + dc * upper.length))) {
    return { valid: false, intersections: 0 };
  }

  let intersections = 0;

  for (let i = 0; i < upper.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const k = keyOf(r, c);
    const existing = grid.get(k);

    if (existing !== undefined) {
      if (existing.ch !== upper[i]) return { valid: false, intersections: 0 };
      if (direction === 'across' ? existing.across : existing.down) {
        return { valid: false, intersections: 0 };
      }
      intersections++;
    } else {
      // Non-intersecting cells cannot touch perpendicular neighbors
      const perp1 = grid.has(keyOf(r + dc, c + dr));
      const perp2 = grid.has(keyOf(r - dc, c - dr));
      if (perp1 || perp2) return { valid: false, intersections: 0 };
    }
  }

  if (requireIntersection && intersections === 0) {
    return { valid: false, intersections: 0 };
  }

  return { valid: true, intersections };
}

function applyWordToGrid(
  grid: Map<string, CellState>,
  upper: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): Map<string, CellState> {
  const next = new Map(grid);
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  for (let i = 0; i < upper.length; i++) {
    const k = keyOf(row + dr * i, col + dc * i);
    const prev = next.get(k);
    next.set(k, {
      ch: upper[i],
      across: (prev?.across ?? false) || direction === 'across',
      down: (prev?.down ?? false) || direction === 'down',
    });
  }
  return next;
}

function computeBounds(grid: Map<string, CellState>) {
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const k of grid.keys()) {
    const [rStr, cStr] = k.split(':');
    const r = Number(rStr);
    const c = Number(cStr);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  return { minR, maxR, minC, maxC, rows, cols };
}

function layoutScore(grid: Map<string, CellState>, totalIntersections: number): number {
  const { rows, cols } = computeBounds(grid);
  const maxDim = Math.max(rows, cols);
  const aspectPenalty = Math.abs(rows - cols) * 3;
  const widePenalty = cols > 11 ? (cols - 11) * 45 : 0;
  const tallPenalty = rows > 11 ? (rows - 11) * 30 : 0;
  return rows * cols + aspectPenalty + widePenalty + tallPenalty + maxDim * 2 - totalIntersections * 12;
}

function findOptionsForWord(
  grid: Map<string, CellState>,
  upper: string,
  totalIntersections: number
) {
  const seenPos = new Set<string>();
  const options: Array<{
    row: number;
    col: number;
    direction: 'across' | 'down';
    intersections: number;
    estScore: number;
  }> = [];

  for (const [cellKey, state] of grid.entries()) {
    const [rStr, cStr] = cellKey.split(':');
    const gr = Number(rStr);
    const gc = Number(cStr);

    for (let idx = 0; idx < upper.length; idx++) {
      if (upper[idx] !== state.ch) continue;

      const tryDirs: Array<'across' | 'down'> = [];
      if (!state.across) tryDirs.push('across');
      if (!state.down) tryDirs.push('down');

      for (const dir of tryDirs) {
        const startR = dir === 'down' ? gr - idx : gr;
        const startC = dir === 'across' ? gc - idx : gc;
        const posKey = `${startR}:${startC}:${dir}`;
        if (seenPos.has(posKey)) continue;
        seenPos.add(posKey);

        const check = canPlaceWord(grid, upper, startR, startC, dir, true);
        if (check.valid) {
          const nextGrid = applyWordToGrid(grid, upper, startR, startC, dir);
          options.push({
            row: startR,
            col: startC,
            direction: dir,
            intersections: check.intersections,
            estScore: layoutScore(nextGrid, totalIntersections + check.intersections),
          });
        }
      }
    }
  }

  options.sort((a, b) => a.estScore - b.estScore);
  return options;
}

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Deterministic multi-start crossword solver.
 * Explores 120 seeded placement orders & choice diversifications in milliseconds,
 * returning the most compact 100%-interlocking conflict-free grid.
 */
export function compileWordalotPuzzle(rawPuzzle: WordalotRawPuzzle): WordalotPuzzle {
  const normalizedWords = rawPuzzle.words.map((w) => ({
    raw: w,
    upper: w.word.toUpperCase().replace(/[^A-Z]/g, ''),
  }));

  let seedHash = 2166136261;
  for (let i = 0; i < rawPuzzle.id.length; i++) {
    seedHash ^= rawPuzzle.id.charCodeAt(i);
    seedHash = Math.imul(seedHash, 16777619);
  }
  const rng = createRng(seedHash);

  let bestSolution: { placed: PlacedWord[]; grid: Map<string, CellState>; score: number } | null = null;

  const TRIALS = 250;
  for (let trial = 0; trial < TRIALS; trial++) {
    const order = [...normalizedWords];
    // First 6 trials start each word deterministically; remaining trials shuffle order
    if (trial < order.length) {
      const first = order[trial];
      order.splice(trial, 1);
      order.sort((a, b) => b.upper.length - a.upper.length);
      order.unshift(first);
    } else {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }

    const seed = order[0];
    const seedDir: 'across' | 'down' = trial % 2 === 0 ? 'across' : 'down';
    let grid = applyWordToGrid(new Map(), seed.upper, 0, 0, seedDir);
    const placed: PlacedWord[] = [
      { raw: seed.raw, upper: seed.upper, row: 0, col: 0, direction: seedDir },
    ];
    let pending = order.slice(1);
    let totalIntersections = 0;

    // Repeatedly place words until all are placed or stuck
    let progress = true;
    while (pending.length > 0 && progress) {
      progress = false;
      const stillPending: typeof pending = [];

      for (const item of pending) {
        const options = findOptionsForWord(grid, item.upper, totalIntersections);
        if (options.length === 0) {
          stillPending.push(item);
          continue;
        }
        // Early trials pick greedily; mid trials pick top-3; late trials explore all valid options
        const pickPool =
          trial < 12 ? 1 : trial < 60 ? Math.min(3, options.length) : options.length;
        const chosen = options[Math.floor(rng() * pickPool)];
        grid = applyWordToGrid(grid, item.upper, chosen.row, chosen.col, chosen.direction);
        placed.push({
          raw: item.raw,
          upper: item.upper,
          row: chosen.row,
          col: chosen.col,
          direction: chosen.direction,
        });
        totalIntersections += chosen.intersections;
        progress = true;
      }

      pending = stillPending;
    }

    if (pending.length === 0) {
      const s = layoutScore(grid, totalIntersections);
      if (!bestSolution || s < bestSolution.score) {
        bestSolution = { placed, grid, score: s };
      }
      if (trial >= 48 && bestSolution.score <= 65) {
        break;
      }
    }
  }

  if (!bestSolution) {
    throw new Error(`Could not compile interlocking Wordalot puzzle: ${rawPuzzle.id}`);
  }

  const { placed, grid } = bestSolution;
  const { minR, minC, rows, cols } = computeBounds(grid);

  const shifted = placed
    .map((p) => ({
      ...p,
      row: p.row - minR,
      col: p.col - minC,
    }))
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.direction === 'across' ? -1 : 1;
    });

  const startNumberMap = new Map<string, number>();
  let nextNum = 1;
  const words: WordalotClueWord[] = shifted.map((p) => {
    const startKey = keyOf(p.row, p.col);
    let num = startNumberMap.get(startKey);
    if (num === undefined) {
      num = nextNum++;
      startNumberMap.set(startKey, num);
    }
    return {
      id: `${rawPuzzle.id}-${p.upper.toLowerCase()}`,
      number: num,
      direction: p.direction,
      row: p.row,
      col: p.col,
      word: p.upper,
      ipa: p.raw.ipa,
      meaningVi: p.raw.meaningVi,
      visualHintVi: p.raw.visualHintVi,
    };
  });

  return {
    id: rawPuzzle.id,
    titleVi: rawPuzzle.titleVi,
    subtitleVi: rawPuzzle.subtitleVi,
    levelId: rawPuzzle.levelId,
    image: rawPuzzle.image,
    rows,
    cols,
    words,
  };
}
