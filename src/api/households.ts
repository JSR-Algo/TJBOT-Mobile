import client from './client';
import { Household, Child } from '../types';

export async function list(): Promise<Household[]> {
  const response = await client.get('/households');
  return response.data.data ?? response.data;
}

export async function create(name: string): Promise<Household> {
  const response = await client.post('/households', { name });
  return response.data.data ?? response.data;
}

export async function get(id: string): Promise<Household> {
  const response = await client.get(`/households/${id}`);
  return response.data.data ?? response.data;
}

export async function addChild(
  householdId: string,
  dto: { name: string; date_of_birth: string },
): Promise<Child> {
  const response = await client.post(`/households/${householdId}/children`, dto);
  return response.data.data ?? response.data;
}

export async function listChildren(householdId: string): Promise<Child[]> {
  const response = await client.get(`/households/${householdId}/children`);
  return response.data.data ?? response.data;
}
