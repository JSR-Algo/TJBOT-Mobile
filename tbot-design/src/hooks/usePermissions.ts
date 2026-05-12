export function usePermissions() {
  return { request: (_permission: string) => Promise.resolve('granted' as const) };
}
