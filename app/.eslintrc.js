module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // The table positions cards with computed values, so inline styles are intentional.
    'react-native/no-inline-styles': 'off',
    // Used for subset enumeration and PRNG maths.
    'no-bitwise': 'off',
  },
};
