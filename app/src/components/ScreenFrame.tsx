import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { IconButton } from './Buttons';
import { TableBackground } from './TableBackground';

interface Props {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  right?: React.ReactNode;
}

/** Common chrome for secondary screens: felt background, back button and title. */
export const ScreenFrame = ({ title, onBack, children, scroll = true, right }: Props) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <TableBackground width={width} height={height} frame={false} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
        <View style={styles.header}>
          <IconButton icon="back" label="Go back" onPress={onBack} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
        </View>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }]}>{children}</View>
        )}
      </View>
    </View>
  );
};

export const Panel = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[styles.panel, style]}>{children}</View>
);

export const Heading = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.heading}>{children}</Text>
);

export const Body = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={[styles.body, style]}>{children}</Text>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.feltDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    color: colors.goldLight,
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: 1,
  },
  content: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 6 },
  panel: {
    backgroundColor: 'rgba(14,8,4,0.62)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,178,90,0.45)',
    padding: 16,
    marginBottom: 14,
  },
  heading: {
    color: colors.goldLight,
    fontFamily: fonts.serifBold,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
  },
  body: { color: colors.text, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
});
