/**
 * Auth Isolation Integration Test
 *
 * Verifies that learning endpoints reject requests for children
 * that don't belong to the authenticated parent's household.
 */
import axios from 'axios';

const API_URL = process.env.TBOT_API_URL ?? 'http://localhost:3000/v1';

describe('Auth isolation: learning endpoints', () => {
  const http = axios.create({ baseURL: API_URL, validateStatus: () => true });

  const uniqueEmail = () => `mobile-test-${Date.now()}-${Math.random().toString(36).slice(2)}@tbot-e2e.test`;

  async function createParentAndChild() {
    const email = uniqueEmail();
    const password = 'TestPass123!';

    const signup = await http.post('/auth/signup', { email, password, name: 'Mobile Test Parent' });
    expect(signup.status).toBe(201);
    const partialToken = signup.data.data?.access_token ?? signup.data.access_token;

    await http.post('/auth/consent', { stripe_token: 'tok_test_bypass', consent_given: true }, {
      headers: { Authorization: `Bearer ${partialToken}` },
    });

    const login = await http.post('/auth/login', { email, password });
    expect(login.status).toBe(200);
    const token = login.data.data?.access_token ?? login.data.access_token;

    const household = await http.post('/households', { name: `${email} Family` }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(household.status).toBe(201);
    const householdId = household.data.data?.id ?? household.data.id;

    const child = await http.post(`/households/${householdId}/children`, {
      name: 'TestChild', date_of_birth: '2018-01-01',
    }, { headers: { Authorization: `Bearer ${token}` } });
    expect(child.status).toBe(201);
    const childId = child.data.data?.id ?? child.data.id;

    return { token, childId };
  }

  it('parent can access their own child profile', async () => {
    const { token, childId } = await createParentAndChild();
    const res = await http.get(`/learning/children/${childId}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('another parent cannot access a different child profile (403)', async () => {
    const { childId } = await createParentAndChild();
    // Create a second parent
    const { token: otherToken } = await createParentAndChild();

    const res = await http.get(`/learning/children/${childId}/profile`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const { childId } = await createParentAndChild();
    const res = await http.get(`/learning/children/${childId}/profile`);
    expect(res.status).toBe(401);
  });
});
