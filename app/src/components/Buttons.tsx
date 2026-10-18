import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fonts, shadow } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GoldButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'gold' | 'dark';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Draws attention with a slow pulse when the button is the expected next step. */
  emphasis?: boolean;
}

export const GoldButton = ({
  label,
  onPress,
  disabled,
  variant = 'gold',
  small,
  style,
  emphasis,
}: GoldButtonProps) => {
  const press = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const gold = variant === 'gold';
  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.95, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[anim, shadow.soft, { opacity: disabled ? 0.45 : 1 }, style]}
    >
      <LinearGradient
        colors={gold ? [colors.goldLight, colors.gold, colors.goldDark] : ['#2A1A10', '#1A0F08']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[
          styles.btn,
          small && styles.btnSmall,
          !gold && { borderWidth: 1, borderColor: colors.gold },
          emphasis && !disabled && { borderWidth: 1.5, borderColor: colors.goldLight },
        ]}
      >
        <Text
          style={[
            styles.btnText,
            small && { fontSize: 14 },
            { color: gold ? '#2A1A08' : colors.goldLight },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
};

type IconName = 'menu' | 'hint' | 'back' | 'close';

export const IconButton = ({
  icon,
  onPress,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={8}
    style={({ pressed }) => [styles.icon, pressed && { opacity: 0.7 }]}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24">
      {icon === 'menu' && (
        <>
          <Rect x={3} y={5} width={18} height={2.2} rx={1.1} fill={colors.goldLight} />
          <Rect x={3} y={10.9} width={18} height={2.2} rx={1.1} fill={colors.goldLight} />
          <Rect x={3} y={16.8} width={18} height={2.2} rx={1.1} fill={colors.goldLight} />
        </>
      )}
      {icon === 'hint' && (
        <>
          <Path
            d="M12 3a6 6 0 0 0-3.4 10.9c.6.5.9 1.1.9 1.9V17h5v-1.2c0-.8.3-1.4.9-1.9A6 6 0 0 0 12 3Z"
            fill="none"
            stroke={colors.goldLight}
            strokeWidth={1.8}
          />
          <Rect x={9.5} y={19} width={5} height={2} rx={1} fill={colors.goldLight} />
        </>
      )}
      {icon === 'back' && (
        <Path d="M15 5l-7 7 7 7" fill="none" stroke={colors.goldLight} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {icon === 'close' && (
        <Path d="M6 6l12 12M18 6L6 18" stroke={colors.goldLight} strokeWidth={2.4} strokeLinecap="round" />
      )}
    </Svg>
  </Pressable>
);

/** A labelled on/off row used on settings and the pause menu. */
export const ToggleRow = ({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Pressable
    onPress={() => onChange(!value)}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    accessibilityLabel={label}
    style={styles.row}
  >
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
    </View>
    <View style={[styles.track, value && styles.trackOn]}>
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </View>
  </Pressable>
);

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <View style={styles.seg}>
    {options.map(o => {
      const on = o.value === value;
      return (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          style={[styles.segItem, on && styles.segOn]}
        >
          <Text style={[styles.segText, on && { color: '#2A1A08' }]}>{o.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

export const Divider = () => (
  <Svg height={6} width="100%">
    <Circle cx="50%" cy={3} r={1.5} fill={colors.gold} />
  </Svg>
);

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 18, minHeight: 42, borderRadius: 12 },
  btnText: {
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.6,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,10,5,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.5)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(216,178,90,0.25)',
    minHeight: 56,
  },
  rowLabel: { color: colors.text, fontSize: 16, fontFamily: fonts.serif },
  rowDetail: { color: colors.textDim, fontSize: 12.5, marginTop: 2 },
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2118',
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.5)',
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.goldDark },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textDim,
    marginLeft: 3,
  },
  thumbOn: { backgroundColor: colors.goldLight, marginLeft: 25 },
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.55)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segItem: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: 'rgba(20,10,5,0.5)' },
  segOn: { backgroundColor: colors.gold },
  segText: { color: colors.text, fontFamily: fonts.serif, fontSize: 14.5 },
});
