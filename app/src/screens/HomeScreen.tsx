import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { CardFaceArt, SuitGlyph } from '../components/CardArt';
import { GoldButton } from '../components/Buttons';
import { TableBackground } from '../components/TableBackground';
import { parseCard } from '../game/deck';
import { isStateRestorable } from '../game/rules';
import { GameState } from '../game/types';
import { SAVE_KEY } from '../hooks/useGame';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { useSettings } from '../utils/settings';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FLOATERS = [
  { id: 'AS', x: 0.08, y: 0.1, rot: -18, size: 74, dur: 7000 },
  { id: 'KH', x: 0.78, y: 0.07, rot: 14, size: 66, dur: 8200 },
  { id: '5D', x: 0.86, y: 0.5, rot: 22, size: 58, dur: 6400 },
  { id: 'JC', x: -0.02, y: 0.58, rot: -12, size: 62, dur: 9000 },
  { id: '10H', x: 0.15, y: 0.86, rot: 10, size: 56, dur: 7600 },
  { id: 'QS', x: 0.74, y: 0.88, rot: -20, size: 70, dur: 8600 },
];

const Floater = ({ f, w, h }: { f: (typeof FLOATERS)[number]; w: number; h: number }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: f.dur, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [f.dur, t]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (t.value - 0.5) * 26 },
      { translateX: (0.5 - t.value) * 10 },
      { rotate: `${f.rot + (t.value - 0.5) * 8}deg` },
    ],
  }));
  const c = parseCard(f.id);
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: f.x * w, top: f.y * h, opacity: 0.2 }, style]}
    >
      <CardFaceArt rank={c.rank} suit={c.suit} width={f.size} />
    </Animated.View>
  );
};

const Logo = () => {
  const shine = useSharedValue(0);
  useEffect(() => {
    shine.value = withRepeat(
      withSequence(withTiming(1, { duration: 2400 }), withTiming(0, { duration: 2400 })),
      -1,
    );
  }, [shine]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.55 + shine.value * 0.45 }));
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={118} height={118} viewBox="0 0 118 118">
        <Defs>
          <LinearGradient id="logoGold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.goldLight} />
            <Stop offset="1" stopColor={colors.goldDark} />
          </LinearGradient>
        </Defs>
        <Circle cx={59} cy={59} r={55} fill="rgba(10,5,2,0.55)" stroke="url(#logoGold)" strokeWidth={2.4} />
        <Circle cx={59} cy={59} r={47} fill="none" stroke={colors.gold} strokeOpacity={0.5} strokeWidth={0.8} />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <Circle
              key={i}
              cx={59 + Math.cos(a) * 41}
              cy={59 + Math.sin(a) * 41}
              r={1.5}
              fill={i % 6 === 0 ? colors.goldLight : colors.gold}
              opacity={i % 6 === 0 ? 1 : 0.55}
            />
          );
        })}
        <Line x1={30} y1={84} x2={88} y2={34} stroke="url(#logoGold)" strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={88} y1={84} x2={30} y2={34} stroke="url(#logoGold)" strokeWidth={3.5} strokeLinecap="round" />
        <SuitGlyph suit="S" cx={59} cy={58} size={40} color={colors.goldLight} />
        <Path d="M44 90h30" stroke={colors.gold} strokeWidth={1.2} />
      </Svg>
      <Animated.Text style={[styles.logoText, glow]}>CRIBBAGE</Animated.Text>
      <View style={styles.rule}>
        <View style={styles.ruleLine} />
        <Svg width={92} height={14} style={{ marginHorizontal: 10 }}>
          {(['S', 'H', 'D', 'C'] as const).map((s, i) => (
            <SuitGlyph key={s} suit={s} cx={9 + i * 25} cy={7} size={12} color={colors.gold} />
          ))}
        </Svg>
        <View style={styles.ruleLine} />
      </View>
      <Text style={styles.tag}>The classic game of fifteens and pegs</Text>
    </View>
  );
};

export const HomeScreen = ({ navigation }: Props) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const [saved, setSaved] = useState<GameState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem(SAVE_KEY)
        .then(raw => {
          if (!alive) {
            return;
          }
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            setSaved(isStateRestorable(parsed) ? parsed : null);
          } catch {
            setSaved(null);
          }
        })
        .catch(() => alive && setSaved(null));
      return () => {
        alive = false;
      };
    }, []),
  );

  const startNew = () => {
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    setSaved(null);
    navigation.navigate('Game', undefined);
  };

  return (
    <View style={styles.root}>
      <TableBackground width={width} height={height} />
      {FLOATERS.map(f => (
        <Floater key={f.id} f={f} w={width} h={height} />
      ))}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24, minHeight: height },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(700)}>
          <Logo />
        </Animated.View>
        <View style={styles.menu}>
          {saved && (
            <Animated.View entering={FadeInDown.delay(120).duration(500)}>
              <GoldButton
                label={`Continue game · ${saved.scores.player.front}–${saved.scores.ai.front}`}
                onPress={() => navigation.navigate('Game', { resume: saved })}
              />
            </Animated.View>
          )}
          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <GoldButton label={saved ? 'New game' : 'Play game'} variant={saved ? 'dark' : 'gold'} onPress={startNew} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(500)}>
            <GoldButton label="Learn cribbage" variant="dark" onPress={() => navigation.navigate('Tutorial')} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(340).duration(500)}>
            <GoldButton label="How to play / Rules" variant="dark" onPress={() => navigation.navigate('Rules')} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(420).duration(500)}>
            <GoldButton label="Settings" variant="dark" onPress={() => navigation.navigate('Settings')} />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(520).duration(500)} style={styles.toggles}>
          <Chip label="Sound" on={settings.sound} onPress={() => update({ sound: !settings.sound })} />
          <Chip label="Haptics" on={settings.haptics} onPress={() => update({ haptics: !settings.haptics })} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="switch"
    accessibilityState={{ checked: on }}
    accessibilityLabel={label}
    style={[styles.chip, on && styles.chipOn]}
  >
    <View style={[styles.dot, on && { backgroundColor: colors.goldLight }]} />
    <Text style={[styles.chipText, on && { color: colors.goldLight }]}>
      {label} {on ? 'on' : 'off'}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.walnutDark },
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  logoText: {
    color: colors.goldLight,
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    fontSize: 40,
    letterSpacing: 8,
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  rule: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ruleLine: { height: 1, width: 48, backgroundColor: colors.gold, opacity: 0.6 },
  tag: { color: colors.textDim, fontFamily: fonts.serif, fontSize: 14, marginTop: 10, fontStyle: 'italic' },
  menu: { width: '100%', maxWidth: 340, marginTop: 38, gap: 12 },
  toggles: { flexDirection: 'row', gap: 10, marginTop: 26 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.4)',
    backgroundColor: 'rgba(14,8,4,0.55)',
  },
  chipOn: { borderColor: colors.gold },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textDim, marginRight: 8 },
  chipText: { color: colors.textDim, fontFamily: fonts.serif, fontSize: 13.5 },
});
