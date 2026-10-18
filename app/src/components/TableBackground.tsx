import React, { useMemo } from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  width: number;
  height: number;
  /** Draw the wooden frame (hidden on menu screens that want only felt). */
  frame?: boolean;
}

/** Pseudo-random but stable felt fibre speckle. */
const speckle = (w: number, h: number) => {
  let seed = 4242;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let d = '';
  const n = Math.min(520, Math.floor((w * h) / 900));
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(rnd() * 1.6).toFixed(1)} ${(rnd() * 1.6).toFixed(1)}`;
  }
  return d;
};

/** Deep-green felt inside a dark walnut frame, with soft lighting. */
export const TableBackground = React.memo(({ width, height, frame = true }: Props) => {
  const inset = frame ? 9 : 0;
  const dots = useMemo(() => speckle(width, height), [width, height]);
  const grain = useMemo(() => {
    const lines = [];
    for (let y = 3; y < height; y += 9) {
      lines.push(
        <Line
          key={y}
          x1={0}
          x2={width}
          y1={y}
          y2={y + ((y * 7) % 5) - 2}
          stroke="#000"
          strokeOpacity={0.12 + ((y * 13) % 10) / 100}
          strokeWidth={1}
        />,
      );
    }
    return lines;
  }, [width, height]);

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="walnut" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.walnutLight} />
          <Stop offset="0.5" stopColor={colors.walnut} />
          <Stop offset="1" stopColor={colors.walnutDark} />
        </LinearGradient>
        <RadialGradient id="felt" cx="50%" cy="42%" rx="75%" ry="70%" fx="50%" fy="38%">
          <Stop offset="0" stopColor={colors.feltLight} />
          <Stop offset="0.55" stopColor={colors.felt} />
          <Stop offset="1" stopColor={colors.feltDark} />
        </RadialGradient>
        <RadialGradient id="vignette" cx="50%" cy="50%" rx="70%" ry="70%">
          <Stop offset="0.6" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </RadialGradient>
      </Defs>
      {frame && (
        <>
          <Rect x={0} y={0} width={width} height={height} fill="url(#walnut)" />
          {grain}
        </>
      )}
      <Rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx={frame ? 20 : 0}
        fill="url(#felt)"
      />
      <Path d={dots} stroke="#fff" strokeOpacity={0.045} strokeWidth={0.6} />
      <Rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx={frame ? 20 : 0}
        fill="url(#vignette)"
      />
      {frame && (
        <>
          <Rect
            x={inset + 0.5}
            y={inset + 0.5}
            width={width - inset * 2 - 1}
            height={height - inset * 2 - 1}
            rx={20}
            fill="none"
            stroke="#000"
            strokeOpacity={0.55}
            strokeWidth={2}
          />
          <Rect
            x={inset + 5}
            y={inset + 5}
            width={width - inset * 2 - 10}
            height={height - inset * 2 - 10}
            rx={16}
            fill="none"
            stroke={colors.gold}
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />
        </>
      )}
    </Svg>
  );
});
