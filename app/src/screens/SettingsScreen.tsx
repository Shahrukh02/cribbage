import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { GoldButton, Segmented, ToggleRow } from '../components/Buttons';
import { Body, Heading, Panel, ScreenFrame } from '../components/ScreenFrame';
import { SAVE_KEY } from '../hooks/useGame';
import { RootStackParamList } from '../navigation/types';
import { TUTORIAL_KEY } from '../tutorial/lessons';
import { colors } from '../theme';
import { DEFAULT_SETTINGS, useSettings } from '../utils/settings';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen = ({ navigation }: Props) => {
  const { settings, update } = useSettings();
  const [note, setNote] = useState('');

  return (
    <ScreenFrame title="Settings" onBack={() => navigation.goBack()}>
      <Panel>
        <Heading>Feedback</Heading>
        <ToggleRow
          label="Sound effects"
          detail="Dealing, card placement, scoring and results"
          value={settings.sound}
          onChange={v => update({ sound: v })}
        />
        <ToggleRow
          label="Haptics"
          detail="Light vibration on supported devices"
          value={settings.haptics}
          onChange={v => update({ haptics: v })}
        />
      </Panel>
      <Panel>
        <Heading>Learning aids</Heading>
        <ToggleRow
          label="Explain every score"
          detail="Show why each point was scored, in plain English. Turn off once you are comfortable."
          value={settings.explanations}
          onChange={v => update({ explanations: v })}
        />
        <ToggleRow
          label="Coaching hints"
          detail="Tips about what to do next, shown above your hand"
          value={settings.hints}
          onChange={v => update({ hints: v })}
        />
      </Panel>
      <Panel>
        <Heading>Opponent</Heading>
        <Body style={{ marginBottom: 8, fontSize: 13.5, color: colors.textDim }}>Difficulty</Body>
        <Segmented
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
          value={settings.difficulty}
          onChange={v => update({ difficulty: v })}
        />
        <Body style={{ marginTop: 16, marginBottom: 8, fontSize: 13.5, color: colors.textDim }}>
          Thinking time
        </Body>
        <Segmented
          options={[
            { value: 'fast', label: 'Fast' },
            { value: 'normal', label: 'Normal' },
            { value: 'slow', label: 'Slow' },
          ]}
          value={settings.aiSpeed}
          onChange={v => update({ aiSpeed: v })}
        />
      </Panel>
      <Panel>
        <Heading>Data</Heading>
        <View style={{ gap: 10 }}>
          <GoldButton
            small
            variant="dark"
            label="Discard saved game"
            onPress={() => {
              AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
              setNote('Saved game removed.');
            }}
          />
          <GoldButton
            small
            variant="dark"
            label="Reset tutorial progress"
            onPress={() => {
              AsyncStorage.removeItem(TUTORIAL_KEY).catch(() => {});
              setNote('Tutorial progress reset.');
            }}
          />
          <GoldButton
            small
            variant="dark"
            label="Restore default settings"
            onPress={() => {
              update(DEFAULT_SETTINGS);
              setNote('Settings restored.');
            }}
          />
        </View>
        {note ? <Text style={{ color: colors.success, marginTop: 10 }}>{note}</Text> : null}
      </Panel>
    </ScreenFrame>
  );
};
