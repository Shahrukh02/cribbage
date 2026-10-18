import { Platform } from 'react-native';

export const colors = {
  felt: '#0F3B27',
  feltLight: '#17573A',
  feltDark: '#082418',
  walnut: '#3A2113',
  walnutLight: '#5A3520',
  walnutDark: '#22120A',
  gold: '#D8B25A',
  goldLight: '#F2D98E',
  goldDark: '#9C7A2E',
  ivory: '#FBF6E8',
  ivoryShade: '#EDE3C8',
  ink: '#1D1B20',
  red: '#B2202B',
  burgundy: '#6B1424',
  text: '#F4EBD4',
  textDim: '#B9AE91',
  danger: '#D2564A',
  success: '#7CC38A',
  overlay: 'rgba(5,16,10,0.72)',
};

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
  serifBold: Platform.select({ ios: 'Georgia-Bold', default: 'serif' }) as string,
  sans: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }) as string,
  sansMedium: Platform.select({ ios: 'Avenir Next', default: 'sans-serif-medium' }) as string,
};

export const radius = { card: 6, button: 14, panel: 16 };

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
};

/** Base card size; the table scales cards from here. */
export const CARD_W = 70;
export const CARD_H = 98;
