import { Config } from '../../config';
import {
  createAuthenticatedAxios,
  createAuthenticatedClient,
} from './createAuthenticatedAxios';

const BASE_URL = Config.API_BASE_URL;

if (__DEV__) {
  // One-line dev banner so the developer can confirm in Metro logs which URL
  // resolved without needing to repro the bug. Stripped from production
  // bundles by Metro's __DEV__ dead-code elimination.
  console.info('[api] baseURL =', BASE_URL);
}

const { client, setAuthInvalidatedHandler } = createAuthenticatedAxios(BASE_URL, {
  timeout: 60000,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 307,
});

export default client;
export { BASE_URL, setAuthInvalidatedHandler, createAuthenticatedClient };
