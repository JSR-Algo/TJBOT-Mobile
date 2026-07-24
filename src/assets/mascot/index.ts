/**
 * TeeBot mascot — single swappable robot picture source.
 *
 * SOT character: R4 REAL ROBOT / cat-eared TeeBot
 * (docs/design-references/cat-teebot/poses-r4-2026-07-07/).
 *
 *   • head  → small spots (nav avatars, chips)
 *   • body  → hero / command-center robot card
 */
export const teeBody = require('./r4-wave.png');
export const teeHead = require('./r4-head.png');
export const teeIcon = require('./tee-icon.png');
export const r4Wave = require('./r4-wave.png');
export const r4Head = require('./r4-head.png');

export const mascot = { body: teeBody, head: teeHead, icon: teeIcon, r4Wave, r4Head } as const;

export default mascot;
