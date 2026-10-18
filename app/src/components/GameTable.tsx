import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameState } from '../game/types';
import { colors, fonts } from '../theme';
import { makeLayout, placeCards, TableLayout } from '../utils/layout';
import { AnimatedCard, CardHandlers } from './AnimatedCard';
import { CountBadge, DeckStack } from './Effects';

interface Props {
  state: GameState;
  layout: TableLayout;
  selected: string[];
  highlight: string[];
  shake: Record<string, number>;
  dealing: boolean;
  /** True when the human may pick up cards right now. */
  inputEnabled: boolean;
  handlers: CardHandlers;
  onDeckPress?: () => void;
}

/**
 * Renders every card on the table. Positions are derived purely from the game
 * state, so the visuals can never disagree with the rules engine: when the state
 * changes each card simply springs to its new place.
 */
export const GameTable = ({
  state,
  layout,
  selected,
  highlight,
  shake,
  dealing,
  inputEnabled,
  handlers,
  onDeckPress,
}: Props) => {
  const placed = useMemo(
    () => placeCards(state, layout, { selected, dealing }),
    [state, layout, selected, dealing],
  );
  const hl = useMemo(() => new Set(highlight), [highlight]);
  const sel = useMemo(() => new Set(selected), [selected]);
  const origin = layout.deck;
  const peg = state.pegging;
  const mustCut = state.phase === 'cut' && state.dealer === 'ai';
  const s = layout.s;
  const cribPos = state.dealer === 'player' ? layout.cribPlayer : layout.cribAi;
  const showCrib = state.phase !== 'counting' || state.counting?.target !== 'crib';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* deck */}
      <DeckStack x={origin.x} y={origin.y + 6 * s} scale={s} pulse={mustCut && inputEnabled} />
      {mustCut && inputEnabled && onDeckPress && (
        <View
          accessibilityRole="button"
          accessibilityLabel="Cut the deck"
          onTouchEnd={onDeckPress}
          style={{
            position: 'absolute',
            left: origin.x - 44 * s,
            top: origin.y - 54 * s,
            width: 88 * s,
            height: 110 * s,
            zIndex: 1500,
          }}
        />
      )}
      {/* labels under stacks */}
      <Text style={[styles.label, { left: origin.x - 40, top: origin.y + 56 * s, width: 80 }]}>
        {state.starter ? 'Starter' : 'Deck'}
      </Text>
      {showCrib && state.crib.length > 0 && (
        <Text style={[styles.label, { left: cribPos.x - 45, top: cribPos.y + 40 * s, width: 90 }]}>
          {state.dealer === 'player' ? 'Your crib' : "Opponent's crib"}
        </Text>
      )}
      {peg && state.phase === 'pegging' && (
        <View style={{ position: 'absolute', left: layout.count.x - 31, top: layout.count.y - 31 }}>
          <CountBadge count={peg.count} go={peg.goBy !== null} />
        </View>
      )}
      {placed.map(p => {
        const id = p.card.id;
        const interactive = inputEnabled && p.zone === 'hand' && p.playable;
        return (
          <AnimatedCard
            key={`${state.round}-${id}`}
            card={p.card}
            target={p.target}
            origin={origin}
            interactive={interactive}
            selected={sel.has(id)}
            highlight={hl.has(id)}
            dimmed={
              p.zone === 'hand' &&
              state.phase === 'pegging' &&
              state.pegging?.turn === 'player' &&
              !p.playable
            }
            handlers={handlers}
            shakeKey={shake[id] ?? 0}
          />
        );
      })}
    </View>
  );
};

export { makeLayout };

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.serif,
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
