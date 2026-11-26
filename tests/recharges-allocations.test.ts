import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  getRechargeAllocationSummary,
  listAllocations,
  listRecharges,
} from '@/features/recharges-allocations/api/recharges-allocations-api';

import { stubFetch } from './helpers/fetch-mock';

afterEach(() => {
  vi.unstubAllGlobals();
});

const page = { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

describe('Rechargement & Allocations (finance-service)', () => {
  test('recharges : route finance-service, filtres transmis, vides omis', async () => {
    const stub = stubFetch({ '/admin/recharge-allocation/recharges': { json: { success: true, data: page } } });
    await listRecharges({ page: 2, limit: 20, search: 'boua', status: 'successful', from: '2026-11-01', to: '' });
    expect(stub.calls[0].url).toContain('/v1/finance-service/admin/recharge-allocation/recharges');
    const q = stub.queryFor('/admin/recharge-allocation/recharges');
    expect(q.get('page')).toBe('2');
    expect(q.get('search')).toBe('boua');
    expect(q.get('status')).toBe('successful');
    expect(q.get('from')).toBe('2026-11-01');
    expect(q.has('to')).toBe(false);
  });

  test('allocations : origine et id (ligne liée) transmis', async () => {
    const stub = stubFetch({ '/admin/recharge-allocation/allocations': { json: { success: true, data: page } } });
    await listAllocations({ source: 'bonus-payout' });
    await listAllocations({ id: '6b07071edaea0d84d958b9b8' });
    expect(stub.queryFor('/admin/recharge-allocation/allocations').get('source')).toBe('bonus-payout');
    expect(new URL(stub.calls[1].url).searchParams.get('id')).toBe('6b07071edaea0d84d958b9b8');
  });

  test('résumé : renvoie data, une erreur serveur remonte (pas de zéro silencieux)', async () => {
    const summary = {
      recharges: { successful: { count: 25, amount: 49511 } },
      allocations: { success: { count: 26, amount: 51021 } },
      anomalies: { rechargesWithoutAllocation: 0, allocationsWithoutRecharge: 0 },
    };
    stubFetch({ '/admin/recharge-allocation/summary': { json: { success: true, data: summary } } });
    await expect(getRechargeAllocationSummary()).resolves.toEqual(summary);
    vi.unstubAllGlobals();
    stubFetch({ '/admin/recharge-allocation/summary': { status: 500, json: { success: false, message: 'tiers injoignable' } } });
    await expect(getRechargeAllocationSummary()).rejects.toThrow('tiers injoignable');
  });
});
