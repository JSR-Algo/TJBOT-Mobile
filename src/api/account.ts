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
 * Fetch the current user's profile by reusing the existing account export
 * endpoint. The staging backend does not yet expose a `/v1/me` route, so we
 * extract the user fields from `account/export` instead.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await client.get('/v1/account/export');
  const data = (response.data.data ?? response.data) as {
    account?: {
      id?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };
  };
  const account = data?.account;
  if (!account?.id || !account.email) return null;
  return {
    id: account.id,
    email: account.email,
    name: account.name ?? '',
    email_verified: Boolean(account.email_verified),
  };
}
