module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 'react-native-worklets/plugin' MUST be listed last per reanimated v4 docs.
    'react-native-worklets/plugin',
  ],
};

