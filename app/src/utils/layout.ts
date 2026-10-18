import { CardTarget } from '../components/AnimatedCard';
import { playableCards } from '../game/pegging';
import { Card, GameState, PlayerId } from '../game/types';
import { CARD_H, CARD_W } from '../theme';

export interface Pt {
  x: number;
  y: number;
}

export interface TableLayout {
  W: number;
  H: number;
  s: number;
  topBarH: number;
  oppCy: number;
  oppPanel: { top: number; height: number };
  boardTop: number;
  boardH: number;
  tableTop: number;
  tableBottom: number;
  cyT: number;
  tH: number;
  msgY: number;
  actionY: number;
  handCy: number;
  deck: Pt;
  count: Pt;
  pile: Pt;
  dead: Pt;
  cribPlayer: Pt;
  cribAi: Pt;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const makeLayout = (W: number, H: number): TableLayout => {
  const s = clamp(Math.min(W / 390, H / 760), 0.72, 1.12);
  const topBarH = 46 * s;
  const oppH = CARD_H * 0.62 * s;
  const oppCy = topBarH + 8 * s + oppH / 2;
  const boardTop = oppCy + oppH / 2 + 10 * s;
  const boardH = 82 * s;
  const handCy = H - (CARD_H * s) / 2 - 10 * s;
  const handTop = handCy - (CARD_H * s) / 2;
  const actionY = handTop - 24 * s - 24 * s;
  const msgY = actionY - 48 * s;
  const tableTop = boardTop + boardH + 6 * s;
  const tableBottom = msgY - 26 * s;
  const tH = Math.max(120, tableBottom - tableTop);
  const cyT = tableTop + tH / 2;
  return {
    W,
    H,
    s,
    topBarH,
    oppCy,
    oppPanel: { top: topBarH, height: oppH + 14 * s },
    boardTop,
    boardH,
    tableTop,
    tableBottom,
    cyT,
    tH,
    msgY,
    actionY,
    handCy,
    deck: { x: 48 * s, y: cyT - tH * 0.16 },
    count: { x: W / 2, y: cyT - tH * 0.3 },
    pile: { x: W / 2, y: cyT + tH * 0.06 },
    dead: { x: 48 * s, y: cyT + tH * 0.3 },
    cribPlayer: { x: W - 48 * s, y: cyT + tH * 0.24 },
    cribAi: { x: W - 48 * s, y: cyT - tH * 0.16 },
  };
};

const hashRot = (id: string, range: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 997;
  }
  return ((h % 9) - 4) * (range / 4);
};

/** Fan of `n` cards centred on `cx` that fits within `maxWidth`. */
const fan = (
  n: number,
  cx: number,
  cy: number,
  cardW: number,
  maxWidth: number,
  maxStep: number,
  arcDeg: number,
  arcDrop: number,
): { x: number; y: number; rot: number }[] => {
  if (n === 0) {
    return [];
  }
  const step = n > 1 ? Math.min(maxStep, (maxWidth - cardW) / (n - 1)) : 0;
  const mid = (n - 1) / 2;
  return Array.from({ length: n }, (_, i) => {
    const d = i - mid;
    return {
      x: cx + d * step,
      y: cy + d * d * arcDrop,
      rot: n > 1 ? d * arcDeg : 0,
    };
  });
};

export interface TableContext {
  selected: string[];
  /** True while a fresh round is being dealt (enables stagger). */
  dealing: boolean;
}

export interface PlacedCard {
  card: Card;
  target: CardTarget;
  owner: PlayerId | 'table';
  /** Whether the human can interact with this card right now. */
  zone: 'hand' | 'other';
  playable: boolean;
}

/** Derive where every card in play should be from the authoritative game state. */
export const placeCards = (
  state: GameState,
  L: TableLayout,
  ctx: TableContext,
): PlacedCard[] => {
  const out: PlacedCard[] = [];
  const { s, W } = L;
  const cw = CARD_W;
  const phase = state.phase;
  const peg = state.pegging;
  const counting = phase === 'counting' || phase === 'gameOver';
  const cribPos = state.dealer === 'player' ? L.cribPlayer : L.cribAi;
  const dealing = ctx.dealing;

  /* --- hands --------------------------------------------------------- */
  const handFor = (p: PlayerId): Card[] => {
    if (phase === 'pegging' && peg) {
      return peg.remaining[p];
    }
    return state.hands[p];
  };

  // Deal order: the non-dealer receives the first card.
  const first: PlayerId = state.dealer === 'player' ? 'ai' : 'player';
  const dealIndex = (p: PlayerId, i: number) => i * 2 + (p === first ? 0 : 1);

  // Human hand.
  {
    const hand = handFor('player');
    const full = state.hands.player;
    const pos = fan(hand.length, W / 2, L.handCy, cw * s, W - 20 * s, cw * s * 0.9, 2.6, 1.6 * s);
    const canPlay = phase === 'pegging' && peg?.turn === 'player';
    const legal = new Set(peg ? playableCards(peg.remaining.player, peg.count).map(c => c.id) : []);
    hand.forEach((card, i) => {
      const sel = ctx.selected.includes(card.id);
      out.push({
        card,
        owner: 'player',
        zone: 'hand',
        playable: phase === 'discard' ? full.length === 6 : canPlay && legal.has(card.id),
        target: {
          x: pos[i].x,
          y: pos[i].y - (sel ? 26 * s : 0),
          rot: pos[i].rot,
          scale: s,
          faceUp: true,
          delay: dealing ? dealIndex('player', i) * 75 : 0,
          z: 10 + i,
        },
      });
    });
  }

  // Opponent hand: face down while playing, face up while counting.
  {
    const hand = handFor('ai');
    const scale = (counting ? 0.78 : 0.62) * s;
    const cy = L.oppCy + (counting ? 8 * s : 0);
    const pos = fan(hand.length, W / 2 + 46 * s, cy, cw * scale, 170 * s * (counting ? 1.1 : 1), cw * scale * 0.55, 2, 0.8 * s);
    hand.forEach((card, i) => {
      out.push({
        card,
        owner: 'ai',
        zone: 'other',
        playable: false,
        target: {
          x: pos[i].x,
          y: pos[i].y,
          rot: pos[i].rot,
          scale,
          faceUp: counting,
          delay: dealing ? dealIndex('ai', i) * 75 : 0,
          z: 10 + i,
        },
      });
    });
  }

  /* --- crib ----------------------------------------------------------- */
  {
    const showingCrib = phase === 'counting' && state.counting?.target === 'crib';
    const n = state.crib.length;
    state.crib.forEach((card, i) => {
      const target: CardTarget = showingCrib
        ? (() => {
            const p = fan(n, W / 2, L.tableBottom - 46 * s, cw * 0.85 * s, W - 90 * s, cw * 0.85 * s * 0.9, 3, 1.5 * s)[i];
            return { x: p.x, y: p.y, rot: p.rot, scale: 0.85 * s, faceUp: true, delay: i * 60, z: 40 + i };
          })()
        : {
            x: cribPos.x + i * 1.5,
            y: cribPos.y - i * 1.5,
            rot: hashRot(card.id, 3),
            scale: 0.62 * s,
            faceUp: false,
            delay: 0,
            z: 8 + i,
          };
      out.push({ card, owner: 'table', zone: 'other', playable: false, target });
    });
  }

  /* --- starter -------------------------------------------------------- */
  if (state.starter) {
    out.push({
      card: state.starter,
      owner: 'table',
      zone: 'other',
      playable: false,
      target: {
        x: L.deck.x,
        y: L.deck.y,
        rot: 0,
        scale: 0.86 * s,
        faceUp: true,
        delay: 0,
        z: 30,
      },
    });
  }

  /* --- pegging pile --------------------------------------------------- */
  if (peg && phase === 'pegging') {
    const n = peg.pile.length;
    const pos = fan(n, W / 2, L.pile.y, cw * 0.9 * s, W - 190 * s, cw * 0.9 * s * 0.55, 0, 0);
    peg.pile.forEach((card, i) => {
      out.push({
        card,
        owner: 'table',
        zone: 'other',
        playable: false,
        target: {
          x: pos[i].x,
          y: pos[i].y + (i % 2 === 0 ? -5 : 5) * s,
          rot: hashRot(card.id, 4),
          scale: 0.9 * s,
          faceUp: true,
          delay: 0,
          z: 20 + i,
        },
      });
    });
    peg.discarded.forEach((card, i) => {
      out.push({
        card,
        owner: 'table',
        zone: 'other',
        playable: false,
        target: {
          x: L.dead.x + (i % 4) * 2,
          y: L.dead.y - i * 1.2,
          rot: hashRot(card.id, 6),
          scale: 0.5 * s,
          faceUp: true,
          delay: 0,
          z: 5 + i,
        },
      });
    });
  }

  return out;
};
