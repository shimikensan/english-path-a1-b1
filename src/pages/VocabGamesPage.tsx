import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gamepad2,
  Grid3x3,
  Pickaxe,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GoldMinerVocabGame,
  toGameVocabEntry,
  type GameVocabEntry,
} from '../components/games/GoldMinerVocabGame';
import { VocabCatcherGame } from '../components/games/VocabCatcherGame';
import { WordalotGame } from '../components/games/WordalotGame';
import { useApp } from '../context/AppContext';
import { isGameSfxMuted, setGameSfxMuted } from '../utils/gameSfx';

type ActiveVocabGame = 'wordalot' | 'gold-miner' | 'catcher';

interface GameHighScores {
  wordalot: number;
  goldMiner: number;
  catcher: number;
  wordsMastered: number;
}

const DEFAULT_SCORES: GameHighScores = {
  wordalot: 0,
  goldMiner: 0,
  catcher: 0,
  wordsMastered: 0,
};

function readScores(storageKey: string): GameHighScores {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_SCORES;
    const parsed = JSON.parse(raw) as Partial<GameHighScores>;
    return {
      wordalot: typeof parsed.wordalot === 'number' ? parsed.wordalot : 0,
      goldMiner: typeof parsed.goldMiner === 'number' ? parsed.goldMiner : 0,
      catcher: typeof parsed.catcher === 'number' ? parsed.catcher : 0,
      wordsMastered: typeof parsed.wordsMastered === 'number' ? parsed.wordsMastered : 0,
    };
  } catch {
    return DEFAULT_SCORES;
  }
}

export function VocabGamesPage() {
  const { profile, lessons, recordStudyActivity } = useApp();
  const [activeGame, setActiveGame] = useState<ActiveVocabGame>('wordalot');
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => isGameSfxMuted());

  const storageKey = `pilot_vocab_games_scores_v1_${profile?.uid || 'guest'}`;
  const [scores, setScores] = useState<GameHighScores>(() => readScores(storageKey));

  useEffect(() => {
    setScores(readScores(storageKey));
  }, [storageKey]);

  const persistScores = useCallback(
    (updater: (prev: GameHighScores) => GameHighScores) => {
      setScores((prev) => {
        const next = updater(prev);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    [storageKey]
  );

  // Build deduplicated vocabulary pool from full CEFR + ESP curriculum
  const vocabPool = useMemo<GameVocabEntry[]>(() => {
    const seen = new Set<string>();
    const list: GameVocabEntry[] = [];
    for (const lesson of lessons) {
      for (const item of lesson.vocabulary) {
        const cleanWord = item.word.trim();
        const key = cleanWord.toLowerCase();
        if (!cleanWord || !item.meaningVi?.trim() || seen.has(key)) continue;
        seen.add(key);
        list.push(toGameVocabEntry(item, lesson.levelId));
      }
    }
    return list;
  }, [lessons]);

  const handleToggleSfx = () => {
    const nextMuted = !sfxMuted;
    setSfxMuted(nextMuted);
    setGameSfxMuted(nextMuted);
  };

  const handleWordMastered = useCallback(() => {
    recordStudyActivity();
    persistScores((prev) => ({
      ...prev,
      wordsMastered: prev.wordsMastered + 1,
    }));
  }, [persistScores, recordStudyActivity]);

  const handleWordalotScore = useCallback(
    (points: number) => {
      persistScores((prev) => ({
        ...prev,
        wordalot: Math.max(prev.wordalot, points),
      }));
    },
    [persistScores]
  );

  const handleGoldMinerScore = useCallback(
    (score: number) => {
      persistScores((prev) => ({
        ...prev,
        goldMiner: Math.max(prev.goldMiner, score),
      }));
    },
    [persistScores]
  );

  const handleCatcherScore = useCallback(
    (score: number) => {
      persistScores((prev) => ({
        ...prev,
        catcher: Math.max(prev.catcher, score),
      }));
    },
    [persistScores]
  );

  const gamesMeta = [
    {
      id: 'wordalot' as const,
      title: 'Wordalot',
      subtitle: 'Ô chữ ghép hình theo tranh',
      description: 'Quan sát tranh minh họa trực quan, ghép chữ cái điền kín bảng ô chữ đan xen.',
      bestScore: scores.wordalot,
      icon: Grid3x3,
      accentActive:
        'border-[#FF6B00] bg-[#FF6B00]/8 dark:bg-[#FF6B00]/12 ring-1 ring-[#FF6B00]/40',
      iconActive: 'bg-[#FF6B00] text-white',
    },
    {
      id: 'gold-miner' as const,
      title: 'Đào vàng từ vựng',
      subtitle: 'Trên nghĩa Việt · Dưới thỏi vàng Anh',
      description: 'Xem nghĩa tiếng Việt ở trên, canh móc cẩu đào trúng thỏi vàng chứa từ tiếng Anh.',
      bestScore: scores.goldMiner,
      icon: Pickaxe,
      accentActive:
        'border-amber-500 bg-amber-500/8 dark:bg-amber-500/12 ring-1 ring-amber-500/40',
      iconActive: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'catcher' as const,
      title: 'Hứng từ vựng theo nghĩa',
      subtitle: 'Bắt dù từ tiếng Anh rơi xuống',
      description: 'Di chuyển giỏ phi công hứng đúng từ tiếng Anh có nghĩa tiếng Việt được yêu cầu.',
      bestScore: scores.catcher,
      icon: Target,
      accentActive:
        'border-sky-500 bg-sky-500/8 dark:bg-sky-500/12 ring-1 ring-sky-500/40',
      iconActive: 'bg-sky-500 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D94E00] dark:text-[#FF8524]">
            <Gamepad2 className="w-4 h-4 shrink-0" />
            <span>Học từ vựng qua trò chơi tương tác</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Khu Vui Chơi Từ Vựng
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Ghi nhớ mặt chữ, phát âm và nghĩa tiếng Việt tự nhiên qua 3 trò chơi rèn phản xạ lấy dữ liệu trực tiếp từ kho từ vựng A1–C1 & Chuyên ngành.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            <span>
              Kho từ: <strong className="text-slate-900 dark:text-white">{vocabPool.length}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span>
              Đã chinh phục:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {scores.wordsMastered} từ
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleSfx}
            aria-pressed={!sfxMuted}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              !sfxMuted
                ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#D94E00] dark:text-[#FF8524] hover:bg-[#FF6B00]/15'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {!sfxMuted ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Âm thanh: Bật</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Âm thanh: Tắt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Game Switcher Cards */}
      <div
        role="tablist"
        aria-label="Chọn trò chơi học từ vựng"
        className="grid grid-cols-1 md:grid-cols-3 gap-3.5"
      >
        {gamesMeta.map((game) => {
          const Icon = game.icon;
          const isSelected = activeGame === game.id;
          return (
            <button
              key={game.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveGame(game.id)}
              className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? game.accentActive
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? game.iconActive
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {game.title}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                      {game.subtitle}
                    </div>
                  </div>
                </div>

                {game.bestScore > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{game.bestScore}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                {game.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Game Arena */}
      <section aria-live="polite">
        {activeGame === 'wordalot' && (
          <WordalotGame
            onScoreUpdate={handleWordalotScore}
            onWordMastered={handleWordMastered}
          />
        )}

        {activeGame === 'gold-miner' && (
          <GoldMinerVocabGame
            vocabPool={vocabPool}
            onHighScore={handleGoldMinerScore}
            onWordMastered={handleWordMastered}
          />
        )}

        {activeGame === 'catcher' && (
          <VocabCatcherGame
            vocabPool={vocabPool}
            onHighScore={handleCatcherScore}
            onWordMastered={handleWordMastered}
          />
        )}
      </section>
    </div>
  );
}
