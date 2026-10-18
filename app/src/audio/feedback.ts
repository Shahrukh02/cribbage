import { Platform } from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import Sound from 'react-native-sound';

export type SoundName = 'deal' | 'select' | 'place' | 'reveal' | 'score' | 'win' | 'lose';
export type HapticName = 'light' | 'medium' | 'select' | 'success' | 'warning';

const NAMES: SoundName[] = ['deal', 'select', 'place', 'reveal', 'score', 'win', 'lose'];
const loaded: Partial<Record<SoundName, Sound>> = {};
let ready = false;

/** Load all sound effects once. Failures are ignored: the game works silently. */
export const initAudio = () => {
  if (ready) {
    return;
  }
  ready = true;
  try {
    Sound.setCategory('Ambient', true);
  } catch {}
  NAMES.forEach(name => {
    try {
      const s = new Sound(`${name}.wav`, Sound.MAIN_BUNDLE, err => {
        if (!err) {
          s.setVolume(name === 'deal' || name === 'select' ? 0.55 : 0.8);
          loaded[name] = s;
        }
      });
    } catch {}
  });
};

export const playSound = (name: SoundName, enabled: boolean) => {
  if (!enabled) {
    return;
  }
  const s = loaded[name];
  if (!s) {
    return;
  }
  try {
    s.stop(() => s.play());
  } catch {}
};

const HAPTIC_TYPES: Record<HapticName, string> = {
  light: Platform.OS === 'ios' ? 'impactLight' : 'effectTick',
  medium: Platform.OS === 'ios' ? 'impactMedium' : 'effectClick',
  select: Platform.OS === 'ios' ? 'selection' : 'effectTick',
  success: Platform.OS === 'ios' ? 'notificationSuccess' : 'effectHeavyClick',
  warning: Platform.OS === 'ios' ? 'notificationWarning' : 'effectDoubleClick',
};

export const haptic = (name: HapticName, enabled: boolean) => {
  if (!enabled) {
    return;
  }
  try {
    HapticFeedback.trigger(HAPTIC_TYPES[name] as any, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {}
};
