/**
 * TeeBot mascot — single swappable robot picture source.
 *
 * SOT character: the transparent cat-eared TeeBot pose family.
 * The `r4-*` mobile exports keep their public names for compatibility, but
 * they intentionally point at the transparency-verified `alive-*` cutouts.
 *
 *   • head  → small spots (nav avatars, chips)
 *   • body  → hero / command-center robot card
 */
export const teeBody = require('./alive-wave.png');
export const teeHead = require('./tee-head.png');
export const teeIcon = require('./tee-icon.png');
export const r4Wave = teeBody;
export const r4Head = teeHead;

export const mascot = { body: teeBody, head: teeHead, icon: teeIcon, r4Wave, r4Head } as const;

export default mascot;
