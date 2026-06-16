/**
 * Metro configuration — Expo SDK 55
 * Uses expo/metro-config for correct Hermes support.
 *
 * Note: expo/virtual/streams.js has been removed from the polyfills list in
 * node_modules/@expo/cli/.../withMetroMultiPlatform.js because Metro's Babel
 * transform converts its inline UMD helpers to require() calls, crashing Hermes
 * before the module registry is ready. RN 0.83 + Hermes provides streams natively.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support @google/genai/web which uses "module" field and .mjs files
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];
config.resolver.resolverMainFields = ['react-native', 'module', 'main'];

module.exports = config;
