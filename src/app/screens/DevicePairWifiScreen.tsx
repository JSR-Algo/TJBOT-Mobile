// Phantom route alias — points at the canonical PairWifiScreen in the
// device/pairing feature. Maintained because some deep-links / older
// references navigate to `DevicePairWifiScreen`. Post-PR7 cleanup may remove
// this alias.
export { default } from '@/features/device/pairing/screens/PairWifiScreen';
