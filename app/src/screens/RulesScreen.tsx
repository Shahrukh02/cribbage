import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GoldButton } from '../components/Buttons';
import { PlayingCard } from '../components/PlayingCard';
import { Body, Heading, Panel, ScreenFrame } from '../components/ScreenFrame';
import { parseCards } from '../game/deck';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Rules'>;

const Cards = ({ ids, label }: { ids: string; label?: string }) => (
  <View style={{ marginTop: 10 }}>
    <View style={styles.row}>
      {parseCards(ids).map(c => (
        <PlayingCard key={c.id} card={c} width={46} />
      ))}
    </View>
    {label ? <Text style={styles.caption}>{label}</Text> : null}
  </View>
);

const Row = ({ name, pts, how }: { name: string; pts: string; how: string }) => (
  <View style={styles.table}>
    <View style={{ flex: 1 }}>
      <Text style={styles.tName}>{name}</Text>
      <Text style={styles.tHow}>{how}</Text>
    </View>
    <Text style={styles.tPts}>{pts}</Text>
  </View>
);

export const RulesScreen = ({ navigation }: Props) => (
  <ScreenFrame title="How to Play" onBack={() => navigation.goBack()}>
    <Panel>
      <Heading>The aim</Heading>
      <Body>
        Be the first to score 121 points. Points are scored by moving pegs along the cribbage board, both while you
        play your cards (“pegging”) and when hands are counted (“the show”). The game ends the instant a player
        reaches 121.
      </Body>
    </Panel>

    <Panel>
      <Heading>Card values</Heading>
      <Body>Ace = 1. Cards 2 to 10 are worth their number. Jack, Queen and King are each worth 10.</Body>
      <Cards ids="AS 7H 10D JC QH KS" />
    </Panel>

    <Panel>
      <Heading>A round, step by step</Heading>
      <Body>
        1. The dealer deals six cards to each player.{'\n'}
        2. Each player puts two cards face down into the crib, which belongs to the dealer.{'\n'}
        3. The non-dealer cuts the deck and the top card is turned up as the starter. If it is a Jack the dealer
        scores 2 (“his heels”).{'\n'}
        4. Pegging: starting with the non-dealer, players take turns playing a card and announcing the running
        count, which may not exceed 31.{'\n'}
        5. The show: the non-dealer counts their hand, then the dealer counts their hand, then the dealer counts
        the crib. The starter card counts in all of them.{'\n'}
        6. The deal passes to the other player.
      </Body>
    </Panel>

    <Panel>
      <Heading>Scoring the show</Heading>
      <Row name="Fifteens" pts="2 each" how="Every different set of cards adding to 15." />
      <Row name="Pair" pts="2" how="Two cards of the same rank." />
      <Row name="Three of a kind" pts="6" how="Three cards of one rank (three pairs)." />
      <Row name="Four of a kind" pts="12" how="Four cards of one rank (six pairs)." />
      <Row name="Run" pts="1 per card" how="Three or more consecutive ranks. Ace is low." />
      <Row name="Flush" pts="4 or 5" how="Four cards of a suit in your hand: 4. Add 1 if the starter matches." />
      <Row name="Crib flush" pts="5" how="In the crib all five cards (including starter) must match." />
      <Row name="Nobs" pts="1" how="A Jack in your hand matching the starter’s suit." />
      <Cards ids="4H 4S 5D 6C" label="Two fifteens with the 6 and 5, a pair of 4s and two runs of three." />
    </Panel>

    <Panel>
      <Heading>Pegging</Heading>
      <Body>
        Each card played adds to the count. Score as you play:
      </Body>
      <Row name="Fifteen" pts="2" how="The count reaches exactly 15." />
      <Row name="Thirty-one" pts="2" how="The count reaches exactly 31." />
      <Row name="Pair, triple, quad" pts="2 / 6 / 12" how="Cards of the same rank played in a row." />
      <Row name="Run" pts="1 per card" how="The last three or more cards played form a run, in any order." />
      <Row name="Go / last card" pts="1" how="Last to play when nobody can go on without passing 31." />
      <Body style={{ marginTop: 8 }}>
        If you cannot play without going over 31 you say “Go”. After 31 or a go the count restarts at zero.
      </Body>
    </Panel>

    <Panel>
      <Heading>The crib and the dealer</Heading>
      <Body>
        The crib is an extra hand that scores for the dealer. Because the dealer benefits, give the crib good cards
        when it is yours and awkward cards when it belongs to your opponent. The deal alternates each round.
      </Body>
    </Panel>

    <View style={{ gap: 10 }}>
      <GoldButton label="Interactive tutorial" onPress={() => navigation.replace('Tutorial')} />
    </View>
  </ScreenFrame>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  caption: { color: colors.textDim, fontFamily: fonts.serif, fontSize: 12.5, marginTop: 6 },
  table: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(216,178,90,0.25)',
  },
  tName: { color: colors.text, fontFamily: fonts.serifBold, fontWeight: '700', fontSize: 14.5 },
  tHow: { color: colors.textDim, fontSize: 12.5, marginTop: 1 },
  tPts: { color: colors.goldLight, fontFamily: fonts.serifBold, fontWeight: '700', fontSize: 14, marginLeft: 10 },
});
