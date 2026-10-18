/**
 * Cribbage
 * @format
 */

import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAudio } from './src/audio/feedback';
import { RootStackParamList } from './src/navigation/types';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TutorialScreen } from './src/screens/TutorialScreen';
import { colors } from './src/theme';
import { SettingsProvider } from './src/utils/settings';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.walnutDark,
    card: colors.walnutDark,
    primary: colors.gold,
    text: colors.text,
    border: colors.walnut,
  },
};

function App() {
  useEffect(() => {
    initAudio();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.walnutDark }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <StatusBar barStyle="light-content" />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
                animationDuration: 280,
                contentStyle: { backgroundColor: colors.walnutDark },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Game" component={GameScreen} options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="Rules" component={RulesScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
            </Stack.Navigator>
          </NavigationContainer>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
