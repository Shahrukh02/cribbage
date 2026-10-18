import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CountingState } from '../game/types';
import { colors, fonts } from '../theme';

interface Props {
  counting: CountingState;
  activeItem: number;
  showExplanation: boolean;
  onSelect: (i: number) => void;
  width: number;
  top: number;
}

const TITLES = {
  pone: 'Non-dealer’s hand',
  dealer: 'Dealer’s hand',
  crib: 'The crib',
} as const;

/** Breakdown of how a hand or crib scores; the active item's cards glow on the table. */
export const CountingPanel = ({ counting, activeItem, showExplanation, onSelect, width, top }: Props) => {
  const { result, owner, target } = counting;
  const active = result.items[activeItem % Math.max(1, result.items.length)];
  const who = owner === 'player' ? 'You' : 'Opponent';
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[styles.panel, { width, top, left: 12 }]}
    >
      <View style={styles.head}>
        <Text style={styles.title}>
          {who} · {TITLES[target]}
        </Text>
        <Text style={styles.total}>{result.total}</Text>
      </View>
      {result.items.length === 0 ? (
        <Text style={styles.none}>No points in this hand — it happens to everyone.</Text>
      ) : (
        <View style={styles.chips}>
          {result.items.map((it, i) => {
            const on = i === activeItem % result.items.length;
            return (
              <Pressable key={i} onPress={() => onSelect(i)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: '#2A1A08' }]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {showExplanation && active ? (
        <Text style={styles.explain}>{active.explanation}</Text>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    backgroundColor: 'rgba(14,8,4,0.86)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 1800,
    elevation: 20,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { color: colors.text, fontFamily: fonts.serif, fontSize: 14 },
  total: { color: colors.goldLight, fontFamily: fonts.serifBold, fontSize: 26, fontWeight: '700' },
  none: { color: colors.textDim, fontSize: 12.5, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.goldLight },
  chipText: { color: colors.goldLight, fontSize: 12.5, fontFamily: fonts.serif },
  explain: { color: colors.text, fontSize: 12, lineHeight: 16, opacity: 0.92, marginTop: 1 },
});
