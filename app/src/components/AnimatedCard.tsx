import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Card } from '../game/types';
import { CARD_H, CARD_W, colors, shadow } from '../theme';
import { CardBackArt, CardFaceArt } from './CardArt';

export interface CardTarget {
  /** Centre of the card on the table. */
  x: number;
  y: number;
  rot: number;
  scale: number;
  faceUp: boolean;
  /** Milliseconds to wait before moving (used for staggered dealing). */
  delay: number;
  z: number;
}

export interface CardHandlers {
  onTap?: (id: string) => void;
  /** Called when the card is dragged up past the threshold and released. */
  onDrop?: (id: string) => void;
}

interface Props {
  card: Card;
  target: CardTarget;
  /** Where the card appears from (the deck) so it flies in on mount. */
  origin: { x: number; y: number };
  interactive: boolean;
  selected: boolean;
  highlight: boolean;
  dimmed: boolean;
  handlers: CardHandlers;
  /** Increment to play a small "nope" shake. */
  shakeKey: number;
}

const DRAG_THRESHOLD = 70;
const SPRING = { damping: 17, stiffness: 190, mass: 0.75 };

const AnimatedCardImpl = ({
  card,
  target,
  origin,
  interactive,
  selected,
  highlight,
  dimmed,
  handlers,
  shakeKey,
}: Props) => {
  const x = useSharedValue(origin.x);
  const y = useSharedValue(origin.y);
  const rot = useSharedValue(-12);
  const scale = useSharedValue(0.7);
  const flip = useSharedValue(1); // 0 = face up, 1 = face down
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const shake = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    const d = target.delay;
    x.value = withDelay(d, withSpring(target.x, SPRING));
    y.value = withDelay(d, withSpring(target.y, SPRING));
    rot.value = withDelay(d, withSpring(target.rot, SPRING));
    scale.value = withDelay(d, withSpring(target.scale, SPRING));
    flip.value = withDelay(d + 60, withTiming(target.faceUp ? 0 : 1, { duration: 380 }));
  }, [target.x, target.y, target.rot, target.scale, target.faceUp, target.delay, x, y, rot, scale, flip]);

  useEffect(() => {
    glow.value = withTiming(highlight ? 1 : 0, { duration: 220 });
  }, [highlight, glow]);

  useEffect(() => {
    if (shakeKey > 0) {
      shake.value = withSequence(
        withTiming(7, { duration: 50 }),
        withTiming(-7, { duration: 80 }),
        withTiming(4, { duration: 70 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [shakeKey, shake]);

  const ref = useRef(handlers);
  ref.current = handlers;
  const fireTap = useCallback(() => ref.current.onTap?.(card.id), [card.id]);
  const fireDrop = useCallback(() => ref.current.onDrop?.(card.id), [card.id]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(interactive)
      .minDistance(8)
      .onBegin(() => {
        dragging.value = 1;
      })
      .onUpdate(e => {
        dragX.value = e.translationX;
        dragY.value = e.translationY;
      })
      .onEnd(e => {
        if (e.translationY < -DRAG_THRESHOLD) {
          runOnJS(fireDrop)();
        }
      })
      .onFinalize(() => {
        dragging.value = 0;
        dragX.value = withSpring(0, SPRING);
        dragY.value = withSpring(0, SPRING);
      });
    const tap = Gesture.Tap()
      .enabled(interactive)
      .maxDistance(10)
      .onEnd((_e, success) => {
        if (success) {
          runOnJS(fireTap)();
        }
      });
    return Gesture.Exclusive(pan, tap);
  }, [interactive, dragX, dragY, dragging, fireDrop, fireTap]);

  const container = useAnimatedStyle(() => ({
    zIndex: dragging.value ? 1000 : target.z,
    transform: [
      { translateX: x.value + dragX.value + shake.value - CARD_W / 2 },
      { translateY: y.value + dragY.value - CARD_H / 2 },
      { rotate: `${rot.value + dragX.value * 0.04}deg` },
      { scale: scale.value * (dragging.value ? 1.08 : 1) },
    ],
  }));

  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flip.value * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${flip.value * 180 + 180}deg` }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        exiting={FadeOut.duration(160)}
        pointerEvents={interactive ? 'auto' : 'none'}
        style={[styles.card, container]}
      >
        <Animated.View style={[styles.face, front]}>
          <CardFaceArt rank={card.rank} suit={card.suit} width={CARD_W} />
        </Animated.View>
        <Animated.View style={[styles.face, back]}>
          <CardBackArt width={CARD_W} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.ring, ring]} />
        {dimmed && <View pointerEvents="none" style={styles.dim} />}
        {selected && <View pointerEvents="none" style={styles.selected} />}
      </Animated.View>
    </GestureDetector>
  );
};

export const AnimatedCard = React.memo(AnimatedCardImpl);

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CARD_W,
    height: CARD_H,
    ...shadow.card,
  },
  face: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    borderRadius: 7,
    backgroundColor: 'rgba(10,10,10,0.42)',
  },
  selected: {
    ...StyleSheet.absoluteFill,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
});
