import client from './client';

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
    const res = await client.get(`/controls/${deviceId}`);
    return res.data.data ?? res.data;
  },

  async updateControls(deviceId: string, controls: Partial<ParentControls>): Promise<ParentControls> {
    const res = await client.put(`/controls/${deviceId}`, controls);
    return res.data.data ?? res.data;
  },
};
