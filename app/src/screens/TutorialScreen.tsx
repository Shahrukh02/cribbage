import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { GoldButton } from '../components/Buttons';
import { PlayingCard } from '../components/PlayingCard';
import { Body, Heading, Panel, ScreenFrame } from '../components/ScreenFrame';
import { parseCards } from '../game/deck';
import { countOf } from '../game/pegging';
import { scoreHand } from '../game/scoring';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { evaluateStep, findSolution } from '../tutorial/evaluate';
import { Lesson, LESSONS, Step, TUTORIAL_KEY } from '../tutorial/lessons';

type Props = NativeStackScreenProps<RootStackParamList, 'Tutorial'>;

export const TutorialScreen = ({ navigation }: Props) => {
  const [done, setDone] = useState<string[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY)
      .then(raw => raw && setDone(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const complete = useCallback((id: string) => {
    setDone(prev => {
      if (prev.includes(id)) {
        return prev;
      }
      const next = [...prev, id];
      AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  if (lesson) {
    const idx = LESSONS.findIndex(l => l.id === lesson.id);
    return (
      <LessonView
        key={lesson.id}
        lesson={lesson}
        onExit={() => setLesson(null)}
        onComplete={() => complete(lesson.id)}
        onNext={idx < LESSONS.length - 1 ? () => setLesson(LESSONS[idx + 1]) : undefined}
        onPlay={() => navigation.replace('Game', undefined)}
      />
    );
  }

  return (
    <ScreenFrame title="Learn Cribbage" onBack={() => navigation.goBack()}>
      <Body style={{ marginBottom: 14, color: colors.textDim }}>
        {done.length} of {LESSONS.length} lessons complete. Each lesson lets you make real moves, scored by the same
        rules the game uses. You can replay any lesson.
      </Body>
      {LESSONS.map((l, i) => {
        const isDone = done.includes(l.id);
        return (
          <Animated.View key={l.id} entering={FadeInDown.delay(i * 40).duration(300)}>
            <Pressable
              onPress={() => setLesson(l)}
              accessibilityRole="button"
              accessibilityLabel={`Lesson ${i + 1}: ${l.title}${isDone ? ', completed' : ''}`}
              style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.num, isDone && styles.numDone]}>
                <Text style={[styles.numText, isDone && { color: '#2A1A08' }]}>{isDone ? '✓' : i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lessonTitle}>{l.title}</Text>
                <Text style={styles.lessonSummary}>{l.summary}</Text>
              </View>
              <Text style={styles.replay}>{isDone ? 'Replay' : 'Start'}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScreenFrame>
  );
};

interface LessonProps {
  lesson: Lesson;
  onExit: () => void;
  onComplete: () => void;
  onNext?: () => void;
  onPlay: () => void;
}

const LessonView = ({ lesson, onExit, onComplete, onNext, onPlay }: LessonProps) => {
  const [stepIdx, setStepIdx] = useState(0);
  const step = lesson.steps[stepIdx];
  const last = stepIdx === lesson.steps.length - 1;

  const next = () => {
    if (last) {
      onComplete();
      onExit();
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  return (
    <ScreenFrame title={lesson.title} onBack={() => (stepIdx > 0 ? setStepIdx(stepIdx - 1) : onExit())}>
      <View style={styles.dots} accessible accessibilityLabel={`Step ${stepIdx + 1} of ${lesson.steps.length}`}>
        {lesson.steps.map((_, i) => (
          <View key={i} style={[styles.dot, i <= stepIdx && styles.dotOn]} />
        ))}
      </View>
      <StepView
        key={`${lesson.id}-${stepIdx}`}
        step={step}
        last={last}
        onContinue={next}
        onPlay={() => {
          onComplete();
          onPlay();
        }}
        onRestart={() => setStepIdx(0)}
        onNextLesson={
          last && onNext
            ? () => {
                onComplete();
                onNext();
              }
            : undefined
        }
      />
    </ScreenFrame>
  );
};

const StepView = ({
  step,
  last,
  onContinue,
  onPlay,
  onRestart,
  onNextLesson,
}: {
  step: Step;
  last: boolean;
  onContinue: () => void;
  onPlay: () => void;
  onRestart: () => void;
  onNextLesson?: () => void;
}) => {
  const { width } = useWindowDimensions();
  const cards = useMemo(() => parseCards(step.cards ?? ''), [step.cards]);
  const starter = useMemo(() => parseCards(step.starter ?? '')[0], [step.starter]);
  const pile = useMemo(() => parseCards(step.pile ?? ''), [step.pile]);
  const [selected, setSelected] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<{ ok: boolean; message: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeItem, setActiveItem] = useState(0);

  const interactive = !!step.check;
  const solved = !interactive || verdict?.ok === true;
  const cardW = Math.max(44, Math.min(64, Math.floor((width - 32 - 32 - (cards.length - 1) * 8) / Math.max(cards.length, 1))));

  const reveal = useMemo(() => {
    if (!step.reveal) {
      return null;
    }
    const hand = parseCards(step.reveal.hand);
    const st = parseCards(step.reveal.starter)[0];
    return { hand, starter: st, result: scoreHand(hand, st, !!step.reveal.crib), crib: !!step.reveal.crib };
  }, [step.reveal]);

  const activeIds = reveal && revealed ? reveal.result.items[activeItem]?.cardIds ?? [] : [];

  const toggle = (id: string) => {
    if (!interactive || verdict?.ok) {
      return;
    }
    setVerdict(null);
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const check = () => setVerdict(evaluateStep(step, selected));
  const showMe = () => {
    const sol = findSolution(step);
    if (sol) {
      setSelected(sol);
      setVerdict(evaluateStep(step, sol));
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <Panel>
        <Heading>{step.title}</Heading>
        <Body>{step.body}</Body>
      </Panel>

      {pile.length > 0 && (
        <Panel style={{ alignItems: 'center' }}>
          <Text style={styles.small}>Cards played so far · Count {countOf(pile)}</Text>
          <View style={[styles.cardRow, { marginTop: 8 }]}>
            {pile.map(c => (
              <PlayingCard key={c.id} card={c} width={50} />
            ))}
          </View>
        </Panel>
      )}

      {cards.length > 0 && (
        <Panel style={{ alignItems: 'center' }}>
          {step.ask ? <Text style={styles.ask}>{step.ask}</Text> : null}
          <View style={[styles.cardRow, { paddingTop: interactive ? 14 : 0 }]}>
            {cards.map(c => (
              <PlayingCard
                key={c.id}
                card={c}
                width={cardW}
                selected={selected.includes(c.id)}
                highlight={verdict?.ok && selected.includes(c.id)}
                onPress={interactive ? () => toggle(c.id) : undefined}
              />
            ))}
            {starter && (
              <View style={{ marginLeft: 10, alignItems: 'center' }}>
                <PlayingCard card={starter} width={cardW} />
                <Text style={[styles.small, { marginTop: 4 }]}>Starter</Text>
              </View>
            )}
          </View>
        </Panel>
      )}

      {reveal && (
        <Panel>
          <View style={[styles.cardRow, { justifyContent: 'center', marginBottom: 10 }]}>
            {reveal.hand.map(c => (
              <PlayingCard key={c.id} card={c} width={52} highlight={activeIds.includes(c.id)} />
            ))}
            <View style={{ marginLeft: 8 }}>
              <PlayingCard card={reveal.starter} width={52} highlight={activeIds.includes(reveal.starter.id)} />
              <Text style={[styles.small, { textAlign: 'center', marginTop: 3 }]}>Starter</Text>
            </View>
          </View>
          {!revealed ? (
            <GoldButton label={reveal.crib ? 'Count the crib' : 'Count it'} onPress={() => setRevealed(true)} small />
          ) : (
            <>
              <Text style={styles.total}>{reveal.result.total} points</Text>
              <View style={styles.chips}>
                {reveal.result.items.map((it, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setActiveItem(i)}
                    style={[styles.chip, i === activeItem && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, i === activeItem && { color: '#2A1A08' }]}>{it.label}</Text>
                  </Pressable>
                ))}
              </View>
              {reveal.result.items.length === 0 ? (
                <Body style={{ fontSize: 14 }}>
                  Nothing scores here{reveal.crib ? ': a crib flush needs all five cards to match.' : '.'}
                </Body>
              ) : (
                <Body style={{ fontSize: 14 }}>{reveal.result.items[activeItem]?.explanation}</Body>
              )}
            </>
          )}
        </Panel>
      )}

      {verdict && (
        <Animated.View entering={FadeIn.duration(200)}>
          <Panel style={{ borderColor: verdict.ok ? colors.success : colors.danger }}>
            <Text style={[styles.verdictHead, { color: verdict.ok ? colors.success : colors.danger }]}>
              {verdict.ok ? 'Correct' : 'Not yet'}
            </Text>
            <Body style={{ fontSize: 14.5 }}>{verdict.message}</Body>
          </Panel>
        </Animated.View>
      )}

      <View style={{ gap: 10, marginTop: 4 }}>
        {interactive && !verdict?.ok && (
          <>
            <GoldButton label="Check" onPress={check} disabled={selected.length === 0} />
            <GoldButton label="Show me" variant="dark" onPress={showMe} small />
          </>
        )}
        {step.playNow ? (
          <GoldButton label="Play a game" onPress={onPlay} />
        ) : (
          solved &&
          (!reveal || revealed) && (
            <GoldButton label={last ? 'Finish lesson' : 'Continue'} onPress={onContinue} />
          )
        )}
        {last && onNextLesson && <GoldButton label="Next lesson" variant="dark" onPress={onNextLesson} />}
        {last && <GoldButton label="Replay this lesson" variant="dark" small onPress={onRestart} />}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,8,4,0.62)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.4)',
    padding: 14,
    marginBottom: 10,
  },
  num: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numDone: { backgroundColor: colors.gold },
  numText: { color: colors.goldLight, fontFamily: fonts.serifBold, fontWeight: '700' },
  lessonTitle: { color: colors.text, fontFamily: fonts.serifBold, fontSize: 16.5, fontWeight: '700' },
  lessonSummary: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  replay: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, marginLeft: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 6 },
  dot: { width: 22, height: 4, borderRadius: 2, backgroundColor: 'rgba(216,178,90,0.25)' },
  dotOn: { backgroundColor: colors.gold },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  ask: { color: colors.goldLight, fontFamily: fonts.serifBold, fontSize: 15.5, marginBottom: 10, textAlign: 'center' },
  small: { color: colors.textDim, fontSize: 12.5, fontFamily: fonts.serif },
  total: { color: colors.goldLight, fontFamily: fonts.serifBold, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 8 },
  chip: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    margin: 3,
  },
  chipOn: { backgroundColor: colors.gold },
  chipText: { color: colors.goldLight, fontSize: 13, fontFamily: fonts.serif },
  verdictHead: { fontFamily: fonts.serifBold, fontWeight: '700', fontSize: 16, marginBottom: 4 },
});
