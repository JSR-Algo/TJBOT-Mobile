// Expo discovers config plugins via `main` in package.json, which points here.
// Re-export the real implementation so the `plugins` array in app.json can
// reference `./modules/voice-native` and Expo will pick this file up.
module.exports = require('./withVoiceNative');
