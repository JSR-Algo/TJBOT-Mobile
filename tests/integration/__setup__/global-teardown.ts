// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const globalThis: any;

export default async function globalTeardown(): Promise<void> {
  const srv = globalThis.__MOCK_BACKEND_SERVER__;
  if (srv && typeof srv.close === 'function') {
    await new Promise<void>((resolve) => srv.close(() => resolve()));
    globalThis.__MOCK_BACKEND_SERVER__ = undefined;
  }
}
