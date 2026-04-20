import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiJson } from './client';
import {
  __resetIntegrationStatusClientStateForTests,
  fetchIntegrationStatus,
  saveIntegration,
} from './settings';

vi.mock('./client', () => ({
  apiJson: vi.fn(),
}));

const defaultStatus = {
  etsy: false,
  gemini: false,
  gelato: false,
  vertex: false,
  cloudflare_r2: false,
  pinterest: false,
} as const;

const mockedApiJson = vi.mocked(apiJson);

describe('fetchIntegrationStatus', () => {
  beforeEach(() => {
    __resetIntegrationStatusClientStateForTests();
    mockedApiJson.mockReset();
    mockedApiJson.mockResolvedValue({ ...defaultStatus });
  });

  it('deduplicates parallel in-flight requests', async () => {
    const p1 = fetchIntegrationStatus();
    const p2 = fetchIntegrationStatus();
    await Promise.all([p1, p2]);
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
  });

  it('serves TTL cache without extra apiJson calls', async () => {
    const a = await fetchIntegrationStatus();
    const b = await fetchIntegrationStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
  });

  it('force:true bypasses cache', async () => {
    mockedApiJson
      .mockResolvedValueOnce({ ...defaultStatus })
      .mockResolvedValueOnce({ ...defaultStatus, etsy: true });
    await fetchIntegrationStatus();
    const second = await fetchIntegrationStatus({ force: true });
    expect(second.etsy).toBe(true);
    expect(mockedApiJson).toHaveBeenCalledTimes(2);
  });

  it('saveIntegration invalidates so the next fetch refetches', async () => {
    mockedApiJson.mockResolvedValue({ ...defaultStatus });
    await fetchIntegrationStatus();
    mockedApiJson.mockResolvedValueOnce({ ok: true });
    await saveIntegration('gemini', { api_key: '0123456789ab' });
    await fetchIntegrationStatus();
    expect(mockedApiJson).toHaveBeenCalledTimes(3);
  });
});
