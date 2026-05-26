module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Match the tsconfig.json @/* → src/* alias so Metro can resolve at runtime.
    ['module-resolver', { root: ['./'], alias: { '@': './src' } }],
    // Worklets plugin must be listed last for Reanimated 4.
    ['react-native-worklets/plugin', { bundleMode: false }],
  ],
};
