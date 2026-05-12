module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Match the tsconfig.json @/* → src/* alias so Metro can resolve at runtime.
    ['module-resolver', { root: ['./'], alias: { '@': './src' } }],
    // 'react-native-reanimated/plugin' MUST be listed last per v3 docs.
    'react-native-reanimated/plugin',
  ],
};

