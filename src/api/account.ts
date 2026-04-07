import client from './client';

export async function deleteAccount(password: string): Promise<void> {
  await client.delete('/v1/account', { data: { password } });
}

export async function exportData(): Promise<object> {
  const response = await client.get('/v1/account/export');
  return response.data.data ?? response.data;
}
