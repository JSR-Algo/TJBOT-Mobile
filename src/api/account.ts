import client from './client';
import { User } from '../types';

export async function deleteAccount(password: string): Promise<void> {
  await client.delete('/v1/account', { data: { password } });
}

export async function exportData(): Promise<object> {
  const response = await client.get('/v1/account/export');
  return response.data.data ?? response.data;
}

/**
 * Fetch the current user's account summary.
 *
 * TODO(backend): replace with /v1/me when deployed — see task-s5-backend-v1-me-endpoint.
 * Until then, we piggy-back on /v1/account/export and project out the user fields.
 */
export async function getAccountSummary(): Promise<User | null> {
  const response = await client.get('/v1/account/export');
  const data = (response.data.data ?? response.data) as {
    account?: { id?: string; email?: string; name?: string };
  };
  const account = data?.account;
  if (!account?.id || !account.email) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name ?? '',
  };
}
