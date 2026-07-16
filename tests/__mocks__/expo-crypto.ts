/** Jest stub: unit tests rely on Node globalThis.crypto.getRandomValues. */
export function getRandomBytes(byteCount: number): Uint8Array {
  const bytes = new Uint8Array(byteCount);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  throw new Error('Mock expo-crypto requires crypto.getRandomValues');
}

export default { getRandomBytes };
