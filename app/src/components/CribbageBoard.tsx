import React, { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { PegScore, PlayerId } from '../game/types';
import { colors, fonts } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  width: number;
  height: number;
  scores: Record<PlayerId, PegScore>;
}

const PLAYER_PEG = colors.goldLight;
const AI_PEG = '#E2554A';

export const CribbageBoard = React.memo(({ width, height, scores }: Props) => {
  const padX = 10;
  const padY = 7;
  const startW = 18;
  const endW = 20;
  const dx = (width - padX * 2 - startW - endW) / 40;
  const stripH = (height - padY * 2) / 3;
  const r = Math.min(2.2, dx * 0.28);
  const pegR = Math.min(4, dx * 0.5);

  // Geometry of the board: where each hole sits for each lane.
  const geo = useMemo(() => {
    const laneY = [stripH * 0.3, stripH * 0.72]; // [player lane, ai lane]
    const holeXY = (score: number, lane: 0 | 1): [number, number] => {
      'worklet';
      if (score <= 0) {
        return [padX + 6, padY + laneY[lane]];
      }
      if (score >= 121) {
        return [width - padX - 8, padY + 2 * stripH + stripH / 2];
      }
      const strip = Math.floor((score - 1) / 40);
      const k = score - strip * 40; // 1..40
      const along = strip % 2 === 0 ? k - 0.5 : 40 - k + 0.5;
      return [padX + startW + along * dx, padY + strip * stripH + laneY[lane]];
    };
    let d = '';
    ([0, 1] as const).forEach(lane => {
      for (let sc = 1; sc <= 120; sc++) {
        const [x, y] = holeXY(sc, lane);
        d += `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      }
    });
    return { d, holeXY };
  }, [dx, stripH, r, width, padX, padY]);

  // 5-hole group separators and skunk markers.
  const ticks = useMemo(() => {
    const t: { x: number; y1: number; y2: number; skunk: boolean }[] = [];
    for (let strip = 0; strip < 3; strip++) {
      for (let g = 1; g < 8; g++) {
        const along = g * 5;
        const x = padX + startW + along * dx;
        t.push({ x, y1: padY + strip * stripH + 3, y2: padY + (strip + 1) * stripH - 3, skunk: false });
      }
    }
    return t;
  }, [dx, stripH]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.walnutLight} />
          <Stop offset="1" stopColor={colors.walnut} />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={10} fill="url(#wood)" stroke={colors.gold} strokeWidth={1} />
      <Rect x={4} y={3} width={width - 8} height={height - 6} rx={7} fill="#2B180E" opacity={0.55} />
      {[1, 2].map(i => (
        <Line
          key={i}
          x1={padX}
          x2={width - padX}
          y1={padY + i * stripH}
          y2={padY + i * stripH}
          stroke={colors.gold}
          strokeOpacity={0.35}
          strokeWidth={0.8}
        />
      ))}
      {ticks.map((t, i) => (
        <Line key={i} x1={t.x} x2={t.x} y1={t.y1} y2={t.y2} stroke={colors.gold} strokeOpacity={0.22} strokeWidth={0.8} />
      ))}
      <Path d={geo.d} fill="#0E0703" />
      {/* start and finish holes */}
      {[0, 1].map(lane => {
        const [x, y] = geo.holeXY(0, lane as 0 | 1);
        return <Circle key={lane} cx={x} cy={y} r={r + 0.6} fill="#0E0703" stroke={colors.gold} strokeWidth={0.6} />;
      })}
      {(() => {
        const [x, y] = geo.holeXY(121, 0);
        return (
          <>
            <Circle cx={x} cy={y} r={r + 1.8} fill="#0E0703" stroke={colors.goldLight} strokeWidth={1} />
            <SvgText x={x} y={y - r - 4} fontSize={7} fill={colors.gold} fontFamily={fonts.serifBold} textAnchor="middle">
              121
            </SvgText>
          </>
        );
      })()}
      {/* pegs: back pegs first so the front pegs sit on top */}
      <Peg lane={0} value={scores.player.back} color={PLAYER_PEG} dim geo={geo} r={pegR} />
      <Peg lane={1} value={scores.ai.back} color={AI_PEG} dim geo={geo} r={pegR} />
      <Peg lane={0} value={scores.player.front} color={PLAYER_PEG} geo={geo} r={pegR} />
      <Peg lane={1} value={scores.ai.front} color={AI_PEG} geo={geo} r={pegR} />
    </Svg>
  );
});

interface PegProps {
  lane: 0 | 1;
  value: number;
  color: string;
  dim?: boolean;
  r: number;
  geo: { holeXY: (score: number, lane: 0 | 1) => [number, number] };
}

const Peg = ({ lane, value, color, dim, r, geo }: PegProps) => {
  const v = useSharedValue(value);
  const prev = React.useRef(value);
  useEffect(() => {
    const delta = Math.abs(value - prev.current);
    prev.current = value;
    v.value = withTiming(value, {
      duration: Math.min(1400, 260 + delta * 55),
      easing: Easing.inOut(Easing.cubic),
    });
  }, [value, v]);

  const holeXY = geo.holeXY;
  const props = useAnimatedProps(() => {
    const a = Math.floor(v.value);
    const t = v.value - a;
    const p0 = holeXY(a, lane);
    const p1 = holeXY(Math.min(121, a + 1), lane);
    return { cx: p0[0] + (p1[0] - p0[0]) * t, cy: p0[1] + (p1[1] - p0[1]) * t };
  });
  const [x0, y0] = holeXY(value, lane);
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={x0}
      cy={y0}
      r={r}
      fill={color}
      fillOpacity={dim ? 0.75 : 1}
      stroke="#1b0f08"
      strokeWidth={0.8}
    />
  );
};
