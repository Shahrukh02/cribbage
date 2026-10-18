import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haptic, playSound } from '../audio/feedback';
import { chooseDiscard, choosePlay, suggestDiscard } from '../game/ai';
import { cardName } from '../game/deck';
import { newGame, reduce } from '../game/gameEngine';
import { playableCards, scorePlay } from '../game/pegging';
import { pone } from '../game/rules';
import { Card, GameAction, GameEvent, GameState, PegScore, PlayerId, ScoreItem } from '../game/types';
import { AI_DELAY, useSettings } from '../utils/settings';

export const SAVE_KEY = 'cribbage.game.v1';

export interface Toast {
  key: number;
  event: GameEvent;
}

const DEAL_MS = 1500;

const sleepers = () => {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  return {
    set(fn: () => void, ms: number) {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
      return t;
    },
    clear(t?: ReturnType<typeof setTimeout>) {
      if (t) {
        clearTimeout(t);
        timers.delete(t);
      }
    },
    clearAll() {
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
};

export const useGame = (initial?: GameState | null) => {
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const stateRef = useRef<GameState>(initial ?? newGame());
  const [state, setState] = useState<GameState>(stateRef.current);
  const [displayScores, setDisplayScores] = useState<Record<PlayerId, PegScore>>(
    stateRef.current.scores,
  );
  const [busy, setBusy] = useState(true);
  const [dealing, setDealing] = useState(true);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [hintIds, setHintIds] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState(0);

  const timers = useRef(sleepers()).current;
  const lastEventId = useRef(initial?.eventSeq ?? 0);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const roundSeen = useRef(-1);

  const sfx = useCallback(
    (name: Parameters<typeof playSound>[0]) => playSound(name, settingsRef.current.sound),
    [],
  );
  const buzz = useCallback(
    (name: Parameters<typeof haptic>[0]) => haptic(name, settingsRef.current.haptics),
    [],
  );

  const lock = useCallback((ms: number) => {
    setBusy(true);
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
    }
    lockTimer.current = setTimeout(() => setBusy(false), ms);
  }, []);

  /** Apply an action through the rules engine. Returns false if it was rejected. */
  const apply = useCallback((action: GameAction): boolean => {
    const prev = stateRef.current;
    const next = reduce(prev, action);
    if (next === prev) {
      return false;
    }
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  /* ---- new round: deal animation, sounds, locks --------------------------- */
  useEffect(() => {
    if (roundSeen.current === state.round) {
      return;
    }
    roundSeen.current = state.round;
    setDealing(true);
    lock(DEAL_MS);
    for (let i = 0; i < 12; i++) {
      timers.set(() => sfx('deal'), 120 + i * 75);
    }
    timers.set(() => setDealing(false), DEAL_MS);
  }, [state.round, lock, sfx, timers]);

  /* ---- events: toasts, highlights, sounds ------------------------------ */
  useEffect(() => {
    const fresh = state.lastEvents.filter(e => e.id > lastEventId.current);
    if (!fresh.length) {
      return;
    }
    lastEventId.current = fresh[fresh.length - 1].id;
    fresh.forEach((e, i) => {
      timers.set(() => {
        setToasts(prev => [...prev.slice(-2), { key: e.id, event: e }]);
        if (e.points > 0) {
          sfx('score');
          buzz(e.points >= 6 ? 'success' : 'light');
        }
        if (e.cardIds.length) {
          setHighlight(e.cardIds);
          if (highlightTimer.current) {
            clearTimeout(highlightTimer.current);
          }
          highlightTimer.current = setTimeout(() => setHighlight([]), 1500);
        }
        const life = settingsRef.current.explanations ? 3600 : 2000;
        timers.set(() => setToasts(prev => prev.filter(t => t.key !== e.id)), life);
      }, 280 + i * 750);
    });
  }, [state.lastEvents, buzz, sfx, timers]);

  /* ---- displayed score lags a little behind the card landing ------------ */
  useEffect(() => {
    const t = timers.set(() => setDisplayScores(state.scores), state.lastEvents.length ? 420 : 0);
    return () => timers.clear(t);
  }, [state.scores, state.lastEvents.length, timers]);

  /* ---- starter reveal sound ------------------------------------------- */
  const starterId = state.starter?.id;
  useEffect(() => {
    if (starterId) {
      timers.set(() => {
        sfx('reveal');
        buzz('medium');
      }, 250);
    }
  }, [starterId, sfx, buzz, timers]);

  /* ---- game over -------------------------------------------------------- */
  useEffect(() => {
    if (state.winner) {
      timers.set(() => {
        sfx(state.winner === 'player' ? 'win' : 'lose');
        buzz(state.winner === 'player' ? 'success' : 'warning');
      }, 900);
    }
  }, [state.winner, sfx, buzz, timers]);

  /* ---- counting: cycle highlight through the scoring combinations -------- */
  const counting = state.counting;
  const countingKey = state.phase === 'counting' && counting ? `${state.round}-${counting.step}` : '';
  useEffect(() => {
    setActiveItem(0);
    if (!countingKey) {
      return;
    }
    const n = counting!.result.items.length;
    if (!n) {
      return;
    }
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % n;
      setActiveItem(i);
    }, 1700);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countingKey]);

  const countHighlight = useMemo(() => {
    if (state.phase !== 'counting' || !counting) {
      return [] as string[];
    }
    const item = counting.result.items[activeItem % Math.max(1, counting.result.items.length)];
    return item ? item.cardIds : [];
  }, [state.phase, counting, activeItem]);

  /* ---- auto-lock and unselect on state changes ------------------------- */
  const phaseKey = `${state.phase}-${state.hands.player.length}-${state.pegging?.pile.length ?? 0}-${state.counting?.step ?? 0}`;
  useEffect(() => {
    setSelected([]);
    setHintIds([]);
    if (state.phase === 'cut') {
      lock(700);
    } else if (state.phase === 'pegging') {
      lock(460);
    } else if (state.phase === 'counting') {
      lock(500);
    } else if (state.phase === 'discard') {
      lock(450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  /* ---- persistence ------------------------------------------------------ */
  useEffect(() => {
    if (state.phase === 'gameOver') {
      AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state]);

  /* ---- AI driver --------------------------------------------------------- */
  useEffect(() => {
    if (paused || state.phase === 'gameOver') {
      return;
    }
    const think = AI_DELAY[settings.aiSpeed];
    const jitter = () => think * (0.85 + Math.random() * 0.3);
    let t: ReturnType<typeof setTimeout> | undefined;

    if (state.phase === 'discard' && state.hands.ai.length === 6) {
      t = timers.set(() => {
        const ids = chooseDiscard(
          stateRef.current.hands.ai,
          stateRef.current.dealer === 'ai',
          settingsRef.current.difficulty,
        );
        if (apply({ type: 'discard', player: 'ai', cardIds: ids })) {
          sfx('place');
        }
      }, (dealing ? DEAL_MS : 0) + jitter());
    } else if (state.phase === 'cut' && pone(state.dealer) === 'ai') {
      t = timers.set(() => {
        apply({ type: 'cut' });
      }, 1100);
    } else if (state.phase === 'pegging' && state.pegging?.turn === 'ai') {
      t = timers.set(() => {
        const cur = stateRef.current;
        const peg = cur.pegging;
        if (!peg || peg.turn !== 'ai') {
          return;
        }
        const move = choosePlay(
          {
            hand: peg.remaining.ai,
            pile: peg.pile,
            count: peg.count,
            opponentCards: peg.remaining.player.length,
          },
          settingsRef.current.difficulty,
        );
        if (move && apply({ type: 'play', player: 'ai', cardId: move })) {
          timers.set(() => sfx('place'), 220);
        }
      }, jitter());
    }
    return () => timers.clear(t);
  }, [state, paused, dealing, settings.aiSpeed, apply, sfx, timers]);

  useEffect(() => () => {
    timers.clearAll();
    [lockTimer, highlightTimer, flashTimer].forEach(r => r.current && clearTimeout(r.current));
  }, [timers]);

  /* ---- player actions --------------------------------------------------- */
  const say = useCallback((msg: string) => {
    setFlash(msg);
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
    }
    flashTimer.current = setTimeout(() => setFlash(null), 2600);
  }, []);

  const bump = useCallback((id: string) => {
    setShake(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);

  const playCard = useCallback(
    (id: string) => {
      const cur = stateRef.current;
      const peg = cur.pegging;
      if (cur.phase !== 'pegging' || !peg || peg.turn !== 'player') {
        return;
      }
      const card = peg.remaining.player.find(c => c.id === id);
      if (!card || !playableCards([card], peg.count).length) {
        bump(id);
        buzz('warning');
        say('That card would take the count over 31. Choose a lower card.');
        return;
      }
      if (apply({ type: 'play', player: 'player', cardId: id })) {
        buzz('light');
        timers.set(() => sfx('place'), 200);
      }
    },
    [apply, buzz, bump, say, sfx, timers],
  );

  const toggleDiscard = useCallback(
    (id: string, forceOn = false) => {
      setSelected(prev => {
        if (prev.includes(id)) {
          return forceOn ? prev : prev.filter(x => x !== id);
        }
        return prev.length >= 2 ? [prev[1], id] : [...prev, id];
      });
      sfx('select');
      buzz('select');
    },
    [buzz, sfx],
  );

  const tapCard = useCallback(
    (id: string) => {
      if (busy || paused) {
        return;
      }
      const cur = stateRef.current;
      if (cur.phase === 'discard' && cur.hands.player.length === 6) {
        toggleDiscard(id);
      } else if (cur.phase === 'pegging' && cur.pegging?.turn === 'player') {
        const peg = cur.pegging;
        const card = peg.remaining.player.find(c => c.id === id);
        if (!card || !playableCards([card], peg.count).length) {
          bump(id);
          buzz('warning');
          say('That card would take the count over 31. Choose a lower card.');
        } else if (selected[0] === id) {
          playCard(id);
        } else {
          setSelected([id]);
          sfx('select');
          buzz('select');
        }
      }
    },
    [busy, paused, selected, toggleDiscard, bump, buzz, say, playCard, sfx],
  );

  const dropCard = useCallback(
    (id: string) => {
      if (busy || paused) {
        return;
      }
      const cur = stateRef.current;
      if (cur.phase === 'discard' && cur.hands.player.length === 6) {
        toggleDiscard(id, true);
      } else if (cur.phase === 'pegging') {
        playCard(id);
      }
    },
    [busy, paused, toggleDiscard, playCard],
  );

  const confirmDiscard = useCallback(() => {
    if (busy || paused || selected.length !== 2) {
      return;
    }
    if (apply({ type: 'discard', player: 'player', cardIds: selected })) {
      sfx('place');
      buzz('medium');
      setSelected([]);
    }
  }, [apply, busy, buzz, paused, selected, sfx]);

  const cutDeck = useCallback(() => {
    if (busy || paused) {
      return;
    }
    if (apply({ type: 'cut' })) {
      buzz('medium');
    }
  }, [apply, busy, buzz, paused]);

  const confirmCount = useCallback(() => {
    if (busy || paused) {
      return;
    }
    if (apply({ type: 'confirmCount' })) {
      sfx('place');
    }
  }, [apply, busy, paused, sfx]);

  const showHint = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase === 'discard' && cur.hands.player.length === 6) {
      const h = suggestDiscard(cur.hands.player, cur.dealer === 'player');
      setHintIds(h.cardIds);
      setSelected(h.cardIds);
      say(`Suggestion: send these two to the crib. ${h.reason}`);
    } else if (cur.phase === 'pegging' && cur.pegging?.turn === 'player') {
      const peg = cur.pegging;
      const legal = playableCards(peg.remaining.player, peg.count);
      if (!legal.length) {
        say('You have no card that fits under 31, so you must say Go.');
        return;
      }
      const id = choosePlay(
        { hand: peg.remaining.player, pile: peg.pile, count: peg.count, opponentCards: peg.remaining.ai.length },
        'hard',
      )!;
      const card = peg.remaining.player.find(c => c.id === id) as Card;
      const pts = scorePlay([...peg.pile, card]).reduce((s: number, i: ScoreItem) => s + i.points, 0);
      setHintIds([id]);
      setSelected([id]);
      say(
        pts > 0
          ? `Try the ${cardName(card)}: it scores ${pts} point${pts === 1 ? '' : 's'}.`
          : `Try the ${cardName(card)}: it is a safe play that avoids giving your opponent an easy 15 or 31.`,
      );
    } else if (cur.phase === 'cut' && pone(cur.dealer) === 'player') {
      say('Tap the deck to cut. The card that turns up is the starter, shared by every hand.');
    } else {
      say('Nothing to decide right now.');
    }
  }, [say]);

  const restart = useCallback(() => {
    timers.clearAll();
    const next = newGame();
    stateRef.current = next;
    lastEventId.current = 0;
    roundSeen.current = -1;
    setToasts([]);
    setHighlight([]);
    setSelected([]);
    setPaused(false);
    setDisplayScores(next.scores);
    setState(next);
  }, [timers]);

  /* ---- coaching text ----------------------------------------------------- */
  const coach = useMemo(() => {
    if (flash) {
      return flash;
    }
    const s = state;
    const mine = s.dealer === 'player';
    switch (s.phase) {
      case 'discard':
        if (dealing) {
          return 'Dealing six cards each…';
        }
        return s.hands.player.length === 6
          ? `Choose two cards for ${mine ? 'your' : "your opponent's"} crib.${
              settings.hints
                ? mine
                  ? ' It is your crib, so it scores for you.'
                  : ' Keep cards that make 15s, pairs and runs.'
                : ''
            }`
          : 'Waiting for your opponent to discard…';
      case 'cut':
        return pone(s.dealer) === 'player'
          ? 'Tap the deck to cut the starter card.'
          : 'Your opponent is cutting the deck…';
      case 'pegging': {
        const peg = s.pegging!;
        if (peg.turn === 'ai') {
          return peg.goBy === 'player' ? 'You said Go. Opponent plays on…' : 'Opponent is thinking…';
        }
        const legal = playableCards(peg.remaining.player, peg.count);
        if (peg.goBy === 'ai') {
          return 'Opponent said Go. Keep playing while you can stay at or under 31.';
        }
        return legal.length
          ? `Count is ${peg.count}. Tap a card twice, or drag it up, to play it.`
          : 'No playable card.';
      }
      case 'counting': {
        const c = s.counting!;
        const who = c.owner === 'player' ? 'Your' : "Opponent's";
        const what = c.target === 'crib' ? 'crib' : 'hand';
        return `${who} ${what}: ${c.result.total} point${c.result.total === 1 ? '' : 's'}.`;
      }
      default:
        return '';
    }
  }, [state, flash, dealing, settings.hints]);

  return {
    state,
    displayScores,
    busy: busy || paused,
    dealing,
    paused,
    setPaused,
    selected,
    toasts,
    highlight: hintIds.length ? hintIds : highlight.length ? highlight : countHighlight,
    shake,
    coach,
    activeItem,
    setActiveItem,
    actions: { tapCard, dropCard, confirmDiscard, cutDeck, confirmCount, showHint, restart },
  };
};

export type GameController = ReturnType<typeof useGame>;
