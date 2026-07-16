import client from '../http/client';
import { Household, Child } from '../../types';

function unwrap<T>(response: { data: { data?: T } | T }): T {
  const body = response.data as { data?: T } & T;
  return (body && typeof body === 'object' && 'data' in body && body.data !== undefined ? body.data : body) as T;
}

export async function list(): Promise<Household[]> {
  const response = await client.get('/households');
  return unwrap<Household[]>(response);
}

export async function create(name: string): Promise<Household> {
  const response = await client.post('/households', { name });
  return unwrap<Household>(response);
}

export async function get(id: string): Promise<Household> {
  const response = await client.get(`/households/${id}`);
  return unwrap<Household>(response);
}

export async function addChild(
  householdId: string,
  dto: { name: string; date_of_birth: string; vocabulary_level?: string; learning_style?: string },
  requestId?: string,
): Promise<Child> {
  const options = requestId ? { headers: { 'X-Request-Id': requestId } } : undefined;
  const response = await client.post(`/households/${householdId}/children`, dto, options);
  return unwrap<Child>(response);
}

export async function listChildren(householdId: string): Promise<Child[]> {
  const response = await client.get(`/households/${householdId}/children`);
  return unwrap<Child[]>(response);
}

export async function updateChild(
  householdId: string,
  childId: string,
  dto: Record<string, unknown>,
): Promise<Child> {
  const response = await client.put(`/households/${householdId}/children/${childId}`, dto);
  return unwrap<Child>(response);
}

export async function updateChildDisplayName(
  childId: string,
  displayName: string,
): Promise<{ id: string; displayName: string }> {
  const response = await client.patch(`/mobile/children/${childId}`, { displayName });
  const data = unwrap<unknown>(response);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw { code: 'INVALID_API_RESPONSE', message: 'Invalid child response.', retryable: false };
  }
  const item = data as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.displayName !== 'string') {
    throw { code: 'INVALID_API_RESPONSE', message: 'Invalid child response.', retryable: false };
  }
  return { id: item.id, displayName: item.displayName };
}

export async function archiveChild(childId: string): Promise<{ id: string; status: string }> {
  const response = await client.post(`/children/${childId}/archive`);
  return unwrap<{ id: string; status: string }>(response);
}

export async function deleteChild(childId: string): Promise<{ id: string; status: string }> {
  const response = await client.patch(`/identity/children/${childId}`, { status: 'scheduled_for_deletion' });
  return unwrap<{ id: string; status: string }>(response);
}

export async function setActiveChild(childId: string): Promise<{ child_id: string }> {
  const response = await client.post('/profile/active-child', { child_id: childId });
  return unwrap<{ child_id: string }>(response);
}
