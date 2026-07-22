import { ENV } from '../__env__';

const INVESTOR_DEMO_ENV = 'EXPO_PUBLIC_INVESTOR_DEMO';

function readInvestorDemoFlag(): boolean {
  const fromProcess = (process.env[INVESTOR_DEMO_ENV] as string | undefined)?.trim();
  const fromBundle = (ENV.EXPO_PUBLIC_INVESTOR_DEMO as string | undefined)?.trim();
  const raw = fromProcess || fromBundle || '';
  return raw === 'true' || raw === '1';
}

/** Dev-only investor rehearsal: skip age/auth/onboarding and land on Home Hub. */
export function isInvestorDemoEnabled(): boolean {
  return __DEV__ && readInvestorDemoFlag();
}

export type DemoBadgeState = {
  simulated: boolean;
  label: 'Demo mode' | null;
};

export function getDemoBadgeState(): DemoBadgeState {
  const simulated = isInvestorDemoEnabled();
  return {
    simulated,
    label: simulated ? 'Demo mode' : null,
  };
}