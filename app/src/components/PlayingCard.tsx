import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Card } from '../game/types';
import { CARD_H, CARD_W, colors, shadow } from '../theme';
import { CardBackArt, CardFaceArt } from './CardArt';

interface Props {
  card?: Card;
  /** Rendered width; height follows the card aspect ratio. */
  width?: number;
  faceDown?: boolean;
  selected?: boolean;
  highlight?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
}

/**
 * A static card used outside the animated table (tutorial, rules, score breakdowns).
 * Selected cards rise smoothly.
 */
export const PlayingCard = React.memo(
  ({ card, width = CARD_W, faceDown, selected, highlight, dimmed, onPress }: Props) => {
    const height = (width * CARD_H) / CARD_W;
    const lift = useSharedValue(0);
    React.useEffect(() => {
      lift.value = withSpring(selected ? -height * 0.18 : 0, {
        damping: 14,
        stiffness: 220,
      });
    }, [selected, height, lift]);
    const style = useAnimatedStyle(() => ({
      transform: [{ translateY: lift.value }],
    }));
    const body = (
      <Animated.View style={[{ width, height }, style]}>
        <View style={[styles.shadow, { borderRadius: width * 0.08 }]}>
          {faceDown || !card ? (
            <CardBackArt width={width} />
          ) : (
            <CardFaceArt rank={card.rank} suit={card.suit} width={width} />
          )}
        </View>
        {highlight && (
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              { borderRadius: width * 0.1, borderColor: colors.gold },
            ]}
          />
        )}
        {dimmed && (
          <View
            pointerEvents="none"
            style={[styles.dim, { borderRadius: width * 0.1 }]}
          />
        )}
      </Animated.View>
    );
    if (!onPress) {
      return body;
    }
    return (
      <Pressable onPress={onPress} hitSlop={4}>
        {body}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  shadow: { ...shadow.card, backgroundColor: 'transparent' },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2.5,
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,10,10,0.38)' },
});
