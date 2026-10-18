import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { CardBackArt } from './CardArt';

const CONFETTI = [colors.gold, colors.goldLight, '#E2554A', '#F4EBD4', '#4C9A6A', '#3F7DB5'];

const Piece = ({
  w,
  h,
  index,
}: {
  w: number;
  h: number;
  index: number;
}) => {
  const p = useSharedValue(0);
  const cfg = useMemo(() => {
    const r = (n: number) => {
      const x = Math.sin(index * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      startX: r(1) * w,
      drift: (r(2) - 0.5) * 140,
      fall: h * (0.7 + r(3) * 0.5),
      delay: r(4) * 700,
      dur: 2200 + r(5) * 1800,
      spin: (r(6) - 0.5) * 900,
      size: 6 + r(7) * 7,
      color: CONFETTI[Math.floor(r(8) * CONFETTI.length)],
    };
  }, [index, w, h]);
  useEffect(() => {
    p.value = withDelay(cfg.delay, withTiming(1, { duration: cfg.dur, easing: Easing.out(Easing.quad) }));
  }, [cfg, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [
      { translateX: cfg.startX + cfg.drift * p.value },
      { translateY: -20 + cfg.fall * p.value },
      { rotate: `${cfg.spin * p.value}deg` },
      { rotateX: `${cfg.spin * p.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: cfg.size, height: cfg.size * 0.55, backgroundColor: cfg.color },
        style,
      ]}
    />
  );
};

/** A subtle confetti shower for the winner. */
export const Confetti = ({ width, height }: { width: number; height: number }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Array.from({ length: 56 }, (_, i) => (
      <Piece key={i} index={i} w={width} h={height} />
    ))}
  </View>
);

/** Gold medallion showing the running pegging count. */
export const CountBadge = React.memo(({ count, go }: { count: number; go: boolean }) => {
  const pop = useSharedValue(1);
  useEffect(() => {
    pop.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, { damping: 8 }));
  }, [count, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      style={[styles.badge, style]}
      accessible
      accessibilityLabel={`Count ${count}${go ? ', go' : ''}`}
    >
      <Text style={styles.badgeLabel}>COUNT</Text>
      <Text style={styles.badgeNum}>{count}</Text>
      <Text style={styles.badgeSub}>{go ? 'GO' : 'of 31'}</Text>
    </Animated.View>
  );
});

/** Stacked card backs representing the deck; pulses when the player should cut. */
export const DeckStack = React.memo(
  ({ x, y, scale, pulse }: { x: number; y: number; scale: number; pulse: boolean }) => {
    const glow = useSharedValue(0);
    useEffect(() => {
      glow.value = pulse
        ? withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0.2, { duration: 650 })), -1)
        : withTiming(0, { duration: 150 });
    }, [pulse, glow]);
    const ring = useAnimatedStyle(() => ({ opacity: glow.value }));
    const w = 70 * 0.72 * scale;
    const h = 98 * 0.72 * scale;
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h }}>
        {[3, 2, 1, 0].map(i => (
          <View key={i} style={{ position: 'absolute', left: -i * 0.8, top: i * 1.2, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 2, elevation: 2 }}>
            <CardBackArt width={w} />
          </View>
        ))}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: -3,
              top: -3,
              right: -3,
              bottom: -3,
              borderRadius: 8,
              borderWidth: 2.5,
              borderColor: colors.goldLight,
              shadowColor: colors.gold,
              shadowOpacity: 1,
              shadowRadius: 10,
              elevation: 8,
            },
            ring,
          ]}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(14,8,4,0.85)',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  badgeLabel: { color: colors.textDim, fontSize: 8, letterSpacing: 1.4, fontWeight: '700', marginTop: 2 },
  badgeNum: { color: colors.goldLight, fontSize: 25, lineHeight: 27, fontFamily: fonts.serifBold, fontWeight: '700' },
  badgeSub: { color: colors.textDim, fontSize: 8.5, letterSpacing: 0.6 },
});
