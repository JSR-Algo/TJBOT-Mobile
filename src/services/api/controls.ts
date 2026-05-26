import { backendContractUnavailable } from './undocumented-api-routes';

export interface ParentControls {
  daily_limit_minutes: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  content_categories_enabled: {
    stories: boolean;
    games: boolean;
    stem: boolean;
  };
}

export const controlsApi = {
  async getControls(deviceId: string): Promise<ParentControls> {
    backendContractUnavailable(`controlsApi.getControls:${deviceId}`);
  },

  async updateControls(deviceId: string, controls: Partial<ParentControls>): Promise<ParentControls> {
    void controls;
    backendContractUnavailable(`controlsApi.updateControls:${deviceId}`);
  },
};
