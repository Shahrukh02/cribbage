import { GameState } from '../game/types';

export type RootStackParamList = {
  Home: undefined;
  Game: { resume?: GameState; tutorialMode?: boolean } | undefined;
  Tutorial: undefined;
  Rules: undefined;
  Settings: undefined;
};
