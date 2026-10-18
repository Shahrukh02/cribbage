import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { RANK_LABEL } from '../game/deck';
import { Rank, Suit } from '../game/types';
import { colors, fonts } from '../theme';

/** Card artwork is drawn on a 100 x 140 canvas and scales to any size. */
export const VIEW_W = 100;
export const VIEW_H = 140;

const SUIT_PATHS: Record<Exclude<Suit, 'C'>, string> = {
  H: 'M50 90 C22 66 6 48 6 31 C6 17 17 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C83 8 94 17 94 31 C94 48 78 66 50 90 Z',
  D: 'M50 3 C57 24 75 40 92 50 C75 60 57 76 50 97 C43 76 25 60 8 50 C25 40 43 24 50 3 Z',
  S: 'M50 3 C60 24 94 40 94 62 C94 78 82 87 69 87 C61 87 55 83 52 77 C53 87 57 94 65 97 L35 97 C43 94 47 87 48 77 C45 83 39 87 31 87 C18 87 6 78 6 62 C6 40 40 24 50 3 Z',
};
const CLUB_STEM = 'M50 55 C50 76 46 88 35 97 L65 97 C54 88 50 76 50 55 Z';

export const suitColor = (s: Suit) => (s === 'H' || s === 'D' ? colors.red : colors.ink);

interface GlyphProps {
  suit: Suit;
  cx: number;
  cy: number;
  size: number;
  color?: string;
  flip?: boolean;
}

/** A suit symbol centred on (cx, cy) with the given pixel size. */
export const SuitGlyph = ({ suit, cx, cy, size, color, flip }: GlyphProps) => {
  const k = size / 100;
  const fill = color ?? suitColor(suit);
  const transform = `translate(${cx} ${cy}) ${flip ? 'rotate(180)' : ''} scale(${k}) translate(-50 -50)`;
  return (
    <G transform={transform}>
      {suit === 'C' ? (
        <>
          <Circle cx={50} cy={27} r={21} fill={fill} />
          <Circle cx={27} cy={61} r={21} fill={fill} />
          <Circle cx={73} cy={61} r={21} fill={fill} />
          <Circle cx={50} cy={54} r={13} fill={fill} />
          <Path d={CLUB_STEM} fill={fill} />
        </>
      ) : (
        <Path d={SUIT_PATHS[suit]} fill={fill} />
      )}
    </G>
  );
};

const PIPS: Record<number, [number, number][]> = {
  2: [[1, 0], [1, 1]],
  3: [[1, 0], [1, 0.5], [1, 1]],
  4: [[0, 0], [2, 0], [0, 1], [2, 1]],
  5: [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]],
  6: [[0, 0], [2, 0], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  7: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [0, 1], [2, 1]],
  8: [[0, 0], [2, 0], [1, 0.25], [0, 0.5], [2, 0.5], [1, 0.75], [0, 1], [2, 1]],
  9: [[0, 0], [2, 0], [0, 0.333], [2, 0.333], [1, 0.5], [0, 0.667], [2, 0.667], [0, 1], [2, 1]],
  10: [[0, 0], [2, 0], [1, 0.167], [0, 0.333], [2, 0.333], [0, 0.667], [2, 0.667], [1, 0.833], [0, 1], [2, 1]],
};

const PIP_X = [33, 50, 67];
const PIP_Y0 = 32;
const PIP_Y1 = 108;

const Pips = ({ rank, suit }: { rank: Rank; suit: Suit }) => {
  if (rank === 1) {
    return <SuitGlyph suit={suit} cx={50} cy={70} size={46} />;
  }
  return (
    <>
      {PIPS[rank].map(([col, row], i) => (
        <SuitGlyph
          key={i}
          suit={suit}
          cx={PIP_X[col]}
          cy={PIP_Y0 + (PIP_Y1 - PIP_Y0) * row}
          size={rank >= 9 ? 19 : 21}
          flip={row > 0.5}
        />
      ))}
    </>
  );
};

/** Half of a double-ended court figure, drawn in the upper half of the panel. */
const CourtHalf = ({ rank, suit }: { rank: 11 | 12 | 13; suit: Suit }) => {
  const main = suit === 'H' || suit === 'D' ? colors.red : '#23242C';
  const trim = colors.gold;
  const skin = '#F1D9B8';
  return (
    <G>
      {/* robe */}
      <Path
        d="M24 70 C24 56 36 52 50 52 C64 52 76 56 76 70 L76 70 L24 70 Z"
        fill={main}
      />
      <Path d="M24 70 L76 70" stroke={trim} strokeWidth={2} />
      <Path d="M50 52 L42 70 M50 52 L58 70" stroke={trim} strokeWidth={1.6} />
      <Path d="M30 62 L70 62" stroke={trim} strokeWidth={1} opacity={0.7} />
      {/* neck + face */}
      <Rect x={46} y={46} width={8} height={8} fill={skin} />
      <Circle cx={50} cy={38} r={11} fill={skin} stroke="#C4A67C" strokeWidth={0.8} />
      {/* eyes */}
      <Circle cx={46} cy={37} r={1.1} fill="#33291E" />
      <Circle cx={54} cy={37} r={1.1} fill="#33291E" />
      {rank === 13 && (
        <>
          {/* beard and crown */}
          <Path d="M40 40 C40 52 60 52 60 40 C56 46 44 46 40 40 Z" fill="#8A6A3A" />
          <Path d="M38 28 L38 16 L44 22 L50 12 L56 22 L62 16 L62 28 Z" fill={trim} stroke="#8A6A2A" strokeWidth={0.8} />
          <Circle cx={50} cy={12} r={2} fill={main} />
        </>
      )}
      {rank === 12 && (
        <>
          {/* long hair and tiara */}
          <Path d="M38 38 C36 26 64 26 62 38 C64 50 60 58 58 60 L58 40 L42 40 L42 60 C40 58 36 50 38 38 Z" fill="#8B5A2B" />
          <Path d="M40 26 L44 18 L47 24 L50 14 L53 24 L56 18 L60 26 Z" fill={trim} stroke="#8A6A2A" strokeWidth={0.8} />
          <Circle cx={50} cy={14} r={1.8} fill={main} />
        </>
      )}
      {rank === 11 && (
        <>
          {/* cap with a feather */}
          <Path d="M38 34 C38 22 62 22 62 34 L62 30 C58 26 42 26 38 30 Z" fill={main} />
          <Path d="M36 31 L64 31" stroke={trim} strokeWidth={2.2} />
          <Path d="M58 26 C68 14 76 14 80 8 C76 22 68 26 60 30 Z" fill={trim} opacity={0.95} />
        </>
      )}
    </G>
  );
};

const FacePanel = ({ rank, suit }: { rank: 11 | 12 | 13; suit: Suit }) => {
  return (
    <G>
      <Rect x={20} y={22} width={60} height={96} rx={3} fill="#F7EBCB" stroke={colors.goldDark} strokeWidth={1} />
      <Rect x={23} y={25} width={54} height={90} rx={2} fill="none" stroke={colors.gold} strokeWidth={0.6} />
      <G>
        <CourtHalf rank={rank} suit={suit} />
        <SuitGlyph suit={suit} cx={30} cy={32} size={11} />
      </G>
      <G transform="rotate(180 50 70)">
        <CourtHalf rank={rank} suit={suit} />
        <SuitGlyph suit={suit} cx={30} cy={32} size={11} />
      </G>
      <Line x1={22} y1={70} x2={78} y2={70} stroke={colors.gold} strokeWidth={0.8} />
    </G>
  );
};

interface FaceProps {
  rank: Rank;
  suit: Suit;
  width: number;
  highlight?: boolean;
}

export const CardFaceArt = React.memo(({ rank, suit, width }: FaceProps) => {
  const height = (width * VIEW_H) / VIEW_W;
  const col = suitColor(suit);
  const label = RANK_LABEL[rank];
  const small = label.length > 1;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Defs>
        <LinearGradient id="ivory" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFDF4" />
          <Stop offset="1" stopColor="#F1E7CC" />
        </LinearGradient>
      </Defs>
      <Rect x={1} y={1} width={98} height={138} rx={8} fill="url(#ivory)" stroke="#B9AA86" strokeWidth={1.2} />
      {/* corner indices */}
      <SvgText
        x={13}
        y={24}
        fontSize={small ? 19 : 23}
        fontWeight="bold"
        fontFamily={fonts.serifBold}
        fill={col}
        textAnchor="middle"
      >
        {label}
      </SvgText>
      <SuitGlyph suit={suit} cx={13} cy={37} size={13} />
      <G transform="rotate(180 50 70)">
        <SvgText
          x={13}
          y={24}
          fontSize={small ? 19 : 23}
          fontWeight="bold"
          fontFamily={fonts.serifBold}
          fill={col}
          textAnchor="middle"
        >
          {label}
        </SvgText>
        <SuitGlyph suit={suit} cx={13} cy={37} size={13} />
      </G>
      {rank >= 11 ? (
        <FacePanel rank={rank as 11 | 12 | 13} suit={suit} />
      ) : (
        <Pips rank={rank} suit={suit} />
      )}
    </Svg>
  );
});

export const CardBackArt = React.memo(({ width }: { width: number }) => {
  const height = (width * VIEW_H) / VIEW_W;
  const lines = [];
  for (let i = -140; i <= 140; i += 12) {
    lines.push(
      <Line key={`a${i}`} x1={i} y1={0} x2={i + 140} y2={140} stroke={colors.gold} strokeWidth={0.7} opacity={0.38} />,
      <Line key={`b${i}`} x1={i + 140} y1={0} x2={i} y2={140} stroke={colors.gold} strokeWidth={0.7} opacity={0.38} />,
    );
  }
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Defs>
        <LinearGradient id="back" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7C1A2D" />
          <Stop offset="1" stopColor="#4F0D1B" />
        </LinearGradient>
        <ClipPath id="inner">
          <Rect x={8} y={8} width={84} height={124} rx={4} />
        </ClipPath>
      </Defs>
      <Rect x={1} y={1} width={98} height={138} rx={8} fill="#F6EFD9" stroke="#B9AA86" strokeWidth={1.2} />
      <Rect x={6} y={6} width={88} height={128} rx={5} fill="url(#back)" />
      <G clipPath="url(#inner)">{lines}</G>
      <Rect x={8} y={8} width={84} height={124} rx={4} fill="none" stroke={colors.gold} strokeWidth={1.4} />
      <Circle cx={50} cy={70} r={19} fill="#5A0F20" stroke={colors.gold} strokeWidth={1.6} />
      <Circle cx={50} cy={70} r={14} fill="none" stroke={colors.gold} strokeWidth={0.8} />
      <SuitGlyph suit="S" cx={50} cy={70} size={17} color={colors.gold} />
    </Svg>
  );
});
