import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Divider, GoldButton, IconButton, Segmented, ToggleRow } from '../components/Buttons';
import { CountingPanel } from '../components/CountingPanel';
import { CribbageBoard } from '../components/CribbageBoard';
import { Confetti } from '../components/Effects';
import { GameTable } from '../components/GameTable';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { ToastLayer } from '../components/ScoreNotification';
import { TableBackground } from '../components/TableBackground';
import { playableCards } from '../game/pegging';
import { pone } from '../game/rules';
import { useGame } from '../hooks/useGame';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { makeLayout } from '../utils/layout';
import { useSettings } from '../utils/settings';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export const GameScreen = ({ navigation, route }: Props) => {
  const { width: W, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const game = useGame(route.params?.resume ?? null);
  const { state, actions } = game;
  const [menu, setMenu] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const H = screenH - insets.top - insets.bottom;
  const L = useMemo(() => makeLayout(W, H), [W, H]);
  const s = L.s;

  // Android back button opens the pause menu instead of leaving mid-game.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMenu(m => !m);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    game.setPaused(menu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  useEffect(() => {
    if (state.winner) {
      const t = setTimeout(() => setShowResult(true), 1700);
      return () => clearTimeout(t);
    }
    setShowResult(false);
  }, [state.winner]);

  const handlers = useMemo(
    () => ({ onTap: actions.tapCard, onDrop: actions.dropCard }),
    [actions.tapCard, actions.dropCard],
  );

  const peg = state.pegging;
  const myTurn = state.phase === 'pegging' && peg?.turn === 'player';
  const aiTurn = state.phase === 'pegging' && peg?.turn === 'ai';
  const iCut = state.phase === 'cut' && pone(state.dealer) === 'player';
  const discarding = state.phase === 'discard' && state.hands.player.length === 6 && !game.dealing;

  let action: { label: string; onPress?: () => void; disabled?: boolean; emphasis?: boolean } | null = null;
  if (discarding) {
    action = {
      label: game.selected.length === 2 ? 'Send to crib' : `Pick 2 cards (${game.selected.length}/2)`,
      onPress: actions.confirmDiscard,
      disabled: game.selected.length !== 2 || game.busy,
      emphasis: game.selected.length === 2,
    };
  } else if (iCut) {
    action = { label: 'Cut the deck', onPress: actions.cutDeck, disabled: game.busy, emphasis: true };
  } else if (myTurn && peg) {
    const hasLegal = playableCards(peg.remaining.player, peg.count).length > 0;
    action = hasLegal
      ? {
          label: game.selected.length === 1 ? 'Play card' : 'Select a card',
          onPress: () => game.selected[0] && actions.tapCard(game.selected[0]),
          disabled: game.selected.length !== 1 || game.busy,
          emphasis: game.selected.length === 1,
        }
      : { label: 'Go', disabled: true };
  } else if (state.phase === 'counting' && state.counting) {
    const c = state.counting;
    action = {
      label:
        c.result.total > 0
          ? `Score ${c.result.total} for ${c.owner === 'player' ? 'you' : 'opponent'}`
          : 'Continue',
      onPress: actions.confirmCount,
      disabled: game.busy,
      emphasis: true,
    };
  }

  const restart = () => {
    setMenu(false);
    setShowResult(false);
    actions.restart();
  };

  const winner = state.winner;
  const dealerLabel = state.dealer === 'player' ? 'Your crib' : "Opponent's crib";

  return (
    <View style={styles.root}>
      <TableBackground width={W} height={screenH} />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: W, height: H }}>
          {/* Top bar */}
          <View style={[styles.topBar, { height: L.topBarH, top: 4 * s }]}>
            <IconButton icon="menu" label="Open menu" onPress={() => setMenu(true)} />
            <View style={styles.roundInfo} accessible accessibilityLabel={`Round ${state.round}. ${dealerLabel}`}>
              <Text style={styles.roundText}>Round {state.round}</Text>
              <Text style={styles.roundSub}>{dealerLabel}</Text>
            </View>
            <IconButton icon="hint" label="Show a hint" onPress={actions.showHint} />
          </View>

          {/* Opponent */}
          <View style={{ position: 'absolute', left: 18 * s, top: L.oppCy - 26 * s }}>
            <ScoreDisplay
              who="ai"
              name="Edmund"
              score={game.displayScores.ai.front}
              active={aiTurn || (state.phase === 'discard' && state.hands.ai.length === 6 && !game.dealing)}
              dealer={state.dealer === 'ai'}
              scale={s}
            />
          </View>

          {/* Board */}
          <View style={{ position: 'absolute', left: 12, top: L.boardTop }}>
            <CribbageBoard width={W - 24} height={L.boardH} scores={game.displayScores} />
          </View>

          {/* Cards */}
          <GameTable
            state={state}
            layout={L}
            selected={game.selected}
            highlight={game.highlight}
            shake={game.shake}
            dealing={game.dealing}
            inputEnabled={!game.busy && !winner}
            handlers={handlers}
            onDeckPress={actions.cutDeck}
          />

          {state.phase === 'counting' && state.counting && (
            <CountingPanel
              key={`${state.round}-${state.counting.step}`}
              counting={state.counting}
              activeItem={game.activeItem}
              showExplanation={settings.explanations}
              onSelect={game.setActiveItem}
              width={W - 24}
              top={L.tableTop}
            />
          )}

          <ToastLayer
            toasts={game.toasts}
            top={L.cyT + L.tH * 0.14}
            width={W}
            showExplanation={settings.explanations}
          />

          {/* Coach strip */}
          {settings.hints && game.coach ? (
            <View style={[styles.coach, { top: L.msgY, left: 14, width: W - 28, minHeight: 40 * s }]}>
              <Text style={styles.coachText} accessibilityLiveRegion="polite">
                {game.coach}
              </Text>
            </View>
          ) : null}

          {/* Player + action */}
          <View style={{ position: 'absolute', left: 16 * s, top: L.actionY - 26 * s }}>
            <ScoreDisplay
              who="player"
              name="You"
              score={game.displayScores.player.front}
              active={myTurn || discarding}
              dealer={state.dealer === 'player'}
              scale={s}
            />
          </View>
          {action && (
            <View style={{ position: 'absolute', right: 14, top: L.actionY - 24 * s, left: 140 * s + 16 * s }}>
              <GoldButton
                label={action.label}
                onPress={action.onPress}
                disabled={action.disabled}
                emphasis={action.emphasis}
                small
              />
            </View>
          )}
        </View>
      </View>

      {/* Pause menu */}
      {menu && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Paused</Text>
            <Divider />
            <ToggleRow label="Sound" value={settings.sound} onChange={v => update({ sound: v })} />
            <ToggleRow label="Haptics" value={settings.haptics} onChange={v => update({ haptics: v })} />
            <ToggleRow
              label="Explain every score"
              detail="Plain-English reasons after each scoring event"
              value={settings.explanations}
              onChange={v => update({ explanations: v })}
            />
            <ToggleRow label="Coaching hints" value={settings.hints} onChange={v => update({ hints: v })} />
            <View style={{ marginTop: 14 }}>
              <Segmented
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                value={settings.difficulty}
                onChange={v => update({ difficulty: v })}
              />
            </View>
            <View style={{ marginTop: 18, gap: 10 }}>
              <GoldButton label="Resume" onPress={() => setMenu(false)} />
              <GoldButton
                label="How scoring works"
                variant="dark"
                onPress={() => {
                  setMenu(false);
                  navigation.navigate('Rules');
                }}
              />
              <GoldButton label="New game" variant="dark" onPress={restart} />
              <GoldButton label="Quit to menu" variant="dark" onPress={() => navigation.popToTop()} />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Game over */}
      {winner && <Confetti width={W} height={screenH} />}
      {winner && showResult && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.sheet}>
            <Text style={styles.resultKicker}>{winner === 'player' ? 'VICTORY' : 'DEFEAT'}</Text>
            <Text style={styles.sheetTitle}>
              {winner === 'player' ? 'You win!' : 'Edmund wins'}
            </Text>
            <Text style={styles.resultBody}>
              {winner === 'player'
                ? 'You pegged out first. Well played.'
                : 'Edmund reached 121 first. Every hand teaches something — try again.'}
            </Text>
            <View style={styles.finalRow}>
              <Final label="You" value={state.scores.player.front} />
              <Final label="Edmund" value={state.scores.ai.front} />
            </View>
            <View style={{ gap: 10, marginTop: 16 }}>
              <GoldButton label="Play again" onPress={restart} />
              <GoldButton label="Main menu" variant="dark" onPress={() => navigation.popToTop()} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

const Final = ({ label, value }: { label: string; value: number }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: colors.goldLight, fontFamily: fonts.serifBold, fontSize: 38, fontWeight: '700' }}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.walnutDark },
  topBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundInfo: { alignItems: 'center' },
  roundText: { color: colors.goldLight, fontFamily: fonts.serifBold, fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  roundSub: { color: colors.textDim, fontFamily: fonts.serif, fontSize: 11.5, marginTop: 1 },
  coach: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(8,20,13,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(216,178,90,0.5)',
  },
  coachText: { color: colors.text, fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 18, textAlign: 'center' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 5000,
    elevation: 50,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1A0F08',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: 22,
  },
  sheetTitle: {
    color: colors.goldLight,
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultKicker: { color: colors.gold, textAlign: 'center', letterSpacing: 4, fontSize: 12, fontWeight: '700' },
  resultBody: { color: colors.text, textAlign: 'center', fontFamily: fonts.serif, fontSize: 15, lineHeight: 21 },
  finalRow: { flexDirection: 'row', marginTop: 12 },
});
