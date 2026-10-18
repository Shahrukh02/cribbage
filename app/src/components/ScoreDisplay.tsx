import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts } from '../theme';

/** Number that counts up/down one step at a time instead of jumping. */
export const AnimatedNumber = ({ value, style }: { value: number; style?: object }) => {
  const [shown, setShown] = useState(value);
  const target = useRef(value);
  target.current = value;
  useEffect(() => {
    if (shown === value) {
      return;
    }
    const iv = setInterval(() => {
      setShown(cur => {
        if (cur === target.current) {
          clearInterval(iv);
          return cur;
        }
        const step = Math.max(1, Math.round(Math.abs(target.current - cur) / 12));
        return cur < target.current
          ? Math.min(target.current, cur + step)
          : Math.max(target.current, cur - step);
      });
    }, 55);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <Text style={style}>{shown}</Text>;
};

const Avatar = ({ who, size }: { who: 'player' | 'ai'; size: number }) => {
  const skin = '#E8C9A0';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={`av-${who}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={who === 'player' ? '#2D5F8A' : '#6E1B2B'} />
          <Stop offset="1" stopColor={who === 'player' ? '#16304A' : '#3A0C16'} />
        </LinearGradient>
      </Defs>
      <Circle cx={24} cy={24} r={23} fill={`url(#av-${who})`} />
      <Path d="M8 44c1-9 8-13 16-13s15 4 16 13a23 23 0 0 1-32 0Z" fill={who === 'player' ? '#D8B25A' : '#C9C2B0'} />
      <Circle cx={24} cy={19} r={8} fill={skin} />
      {who === 'ai' ? (
        <Path d="M15 17c1-8 17-9 18 0-3-3-14-4-18 0Z" fill="#CFCABC" />
      ) : (
        <Path d="M16 18c0-8 16-8 16 0-4-3-12-3-16 0Z" fill="#3B2A1C" />
      )}
    </Svg>
  );
};

interface Props {
  who: 'player' | 'ai';
  name: string;
  score: number;
  active: boolean;
  dealer: boolean;
  scale?: number;
}

export const ScoreDisplay = React.memo(({ who, name, score, active, dealer, scale = 1 }: Props) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = active
      ? withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.25, { duration: 700 })), -1)
      : withTiming(0, { duration: 200 });
  }, [active, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const size = 40 * scale;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${name}, ${score} points${dealer ? ', dealer' : ''}`}>
      <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.ring,
            { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 },
            ring,
          ]}
        />
        <Avatar who={who} size={size} />
        {dealer && (
          <View style={styles.dealer}>
            <Text style={styles.dealerText}>D</Text>
          </View>
        )}
      </View>
      <View style={{ marginLeft: 8 }}>
        <Text style={[styles.name, { fontSize: 12.5 * scale }]} numberOfLines={1}>
          {name}
        </Text>
        <AnimatedNumber value={score} style={[styles.score, { fontSize: 24 * scale }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.goldLight,
    shadowColor: colors.gold,
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  dealer: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.walnutDark,
  },
  dealerText: { fontSize: 10, fontWeight: '800', color: '#2A1A08', fontFamily: fonts.serifBold },
  name: { color: colors.textDim, fontFamily: fonts.serif, letterSpacing: 0.4 },
  score: {
    color: colors.goldLight,
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    lineHeight: 28,
  },
});
