function inlineExpoPublicEnvPlugin({ types: t }) {
  return {
    name: 'inline-expo-public-env',
    visitor:
      process.env.NODE_ENV === 'test'
        ? {}
        : {
            MemberExpression(path) {
              const { node } = path;
              if (node.computed || !t.isIdentifier(node.property)) return;
              if (!node.property.name.startsWith('EXPO_PUBLIC_')) return;

              const envAccess = node.object;
              if (
                !t.isMemberExpression(envAccess) ||
                envAccess.computed ||
                !t.isIdentifier(envAccess.property, { name: 'env' }) ||
                !t.isIdentifier(envAccess.object, { name: 'process' })
              ) {
                return;
              }

              path.replaceWith(t.valueToNode(process.env[node.property.name]));
            },
          },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    inlineExpoPublicEnvPlugin,
    // Match the tsconfig.json @/* → src/* alias so Metro can resolve at runtime.
    ['module-resolver', { root: ['./'], alias: { '@': './src' } }],
    // Worklets plugin must be listed last for Reanimated 4.
    ['react-native-worklets/plugin', { bundleMode: false }],
  ],
};
