import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { GameEvent } from '../game/types';
import { colors, fonts } from '../theme';

interface Props {
  event: GameEvent;
  showExplanation: boolean;
}

/** Floating "15 for 2" style message with an optional plain-English reason. */
export const ScoreNotification = React.memo(({ event, showExplanation }: Props) => {
  const mine = event.player === 'player';
  const isGo = event.points === 0;
  const who = mine ? 'You' : 'Opponent';
  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(16)}
      exiting={FadeOut.duration(260)}
      layout={LinearTransition.duration(200)}
      style={[styles.pill, { borderColor: mine ? colors.gold : '#E2554A' }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.who, { backgroundColor: mine ? colors.gold : '#C2453B' }]}>
        <Text style={styles.whoText}>{who}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, isGo && { color: colors.text }]}>
          {isGo ? `${who === 'You' ? 'You say' : 'Opponent says'} “Go”` : event.label}
        </Text>
        {showExplanation && event.explanation ? (
          <Text style={styles.explain}>{event.explanation}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

export const ToastLayer = ({
  toasts,
  top,
  width,
  showExplanation,
}: {
  toasts: { key: number; event: GameEvent }[];
  top: number;
  width: number;
  showExplanation: boolean;
}) => (
  <View pointerEvents="none" style={[styles.layer, { top, width }]}>
    {toasts.map(t => (
      <ScoreNotification key={t.key} event={t.event} showExplanation={showExplanation} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, alignItems: 'center', zIndex: 2000, elevation: 30 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 190,
    maxWidth: '84%',
    marginTop: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 14,
    borderWidth: 1.2,
    backgroundColor: 'rgba(18,10,5,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  who: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginRight: 9 },
  whoText: { fontSize: 10.5, fontWeight: '800', color: '#20120A', letterSpacing: 0.4 },
  label: { color: colors.goldLight, fontFamily: fonts.serifBold, fontWeight: '700', fontSize: 17 },
  explain: { color: colors.text, fontSize: 11.5, lineHeight: 15, marginTop: 2, opacity: 0.9 },
});
