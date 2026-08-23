// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo-export/*', '.vercel/*'],
  },
  {
    // react-three-fiber renders three.js objects as JSX, so props like
    // `castShadow`, `args` and `intensity` are legitimate even though the React
    // DOM plugin has never heard of them.
    files: ['src/ui/CarScene.tsx', 'src/ui/CarModel3D*.tsx'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
]);
