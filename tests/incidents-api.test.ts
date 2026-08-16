import { afterEach, describe, expect, test, vi } from 'vitest';

import { getIncidentStats, listIncidents } from '@/features/incidents/api/incidents-api';

import { stubFetch } from './helpers/fetch-mock';

const ALLOCATIONS = '/admin/fuel-card-allocations';
const ALLOCATION_STATS = '/admin/fuel-card-allocations/stats';

const allocation = (overrides: Record<string, unknown> = {}) => ({
  _id: 'alloc-1',
  account: 'acc-1',
  driver: { _id: 'drv-1', firstName: 'Awa', lastName: 'Kone', reference: 'DRV_1' },
  company: { _id: 'cmp-1', reference: 'COM_1', companyInfos: { name: 'Transport SA' } },
  companyRef: 'COM_1',
  amount: 25000,
  env: 'sandbox',
  transferId: 'TRF_1',
  status: 'failed',
  attempts: 3,
  lastError: 'Solde partenaire insuffisant',
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-10T09:00:00.000Z',
  ...overrides,
});

const listPayload = (items: unknown[], total = items.length) => ({
  success: true,
  data: {
    allocations: items,
    pagination: { page: 1, limit: 10, total, totalPages: Math.ceil(total / 10) },
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listIncidents', () => {
  test('projette une allocation en echec sur un incident ouvert et relancable', async () => {
    stubFetch({ [ALLOCATIONS]: { json: listPayload([allocation()]) } });

    const result = await listIncidents();
    const incident = result.data.items[0];

    expect(incident.status).toBe('open');
    expect(incident.severity).toBe('critical');
    expect(incident.retryable).toBe(true);
    expect(incident.reference).toBe('TRF_1');
    expect(incident.owner).toBe('Awa Kone');
    expect(incident.attempts).toBe(3);
    expect(incident.summary).toBe('Solde partenaire insuffisant');
    expect(incident.navigateTo).toBe('/cards-balances/acc-1');
  });

  test('une allocation reussie devient un incident resolu non relancable', async () => {
    stubFetch({
      [ALLOCATIONS]: { json: listPayload([allocation({ status: 'success', lastError: null })]) },
    });

    const incident = (await listIncidents()).data.items[0];

    expect(incident.status).toBe('resolved');
    expect(incident.retryable).toBe(false);
  });

  test('la pagination provient du serveur et non d un decoupage local', async () => {
    const stub = stubFetch({
      [ALLOCATIONS]: {
        json: {
          success: true,
          data: {
            allocations: [allocation()],
            pagination: { page: 3, limit: 10, total: 247, totalPages: 25 },
          },
        },
      },
    });

    const result = await listIncidents({ page: 3, limit: 10 });

    expect(result.data.total).toBe(247);
    expect(result.data.totalPages).toBe(25);
    expect(result.data.page).toBe(3);
    expect(stub.queryFor(ALLOCATIONS).get('page')).toBe('3');
    expect(stub.queryFor(ALLOCATIONS).get('limit')).toBe('10');
  });

  test('le filtre "ouverts" interroge les statuts failed et queued cote serveur', async () => {
    const stub = stubFetch({ [ALLOCATIONS]: { json: listPayload([]) } });

    await listIncidents({ status: 'open' });

    expect(stub.queryFor(ALLOCATIONS).get('status')).toBe('failed,queued');
  });

  test('un statut sans equivalent backend ne declenche aucun appel', async () => {
    const stub = stubFetch({ [ALLOCATIONS]: { json: listPayload([]) } });

    const result = await listIncidents({ status: 'closed' });

    expect(result.data.items).toEqual([]);
    expect(stub.calls).toHaveLength(0);
  });

  test('une erreur backend remonte au lieu d etre masquee par une liste vide', async () => {
    stubFetch({
      [ALLOCATIONS]: { status: 500, json: { success: false, message: 'Base indisponible' } },
    });

    await expect(listIncidents()).rejects.toThrow('Base indisponible');
  });
});

describe('getIncidentStats', () => {
  test('agrege les compteurs reels sans valeur inventee', async () => {
    stubFetch({
      [ALLOCATION_STATS]: {
        json: {
          success: true,
          data: { queued: 4, processing: 2, success: 90, failed: 7, pending: 6, total: 103 },
        },
      },
    });

    const stats = (await getIncidentStats()).data;

    expect(stats.open).toBe(11); // failed + queued
    expect(stats.investigating).toBe(2); // processing, jamais plafonne
    expect(stats.critical).toBe(7);
    expect(stats.retryable).toBe(7);
    expect(stats.resolved).toBe(90);
    expect(stats.total).toBe(103);
  });

  test('propage l erreur quand le service est injoignable', async () => {
    stubFetch({ [ALLOCATION_STATS]: { status: 503, json: { message: 'Service indisponible' } } });

    await expect(getIncidentStats()).rejects.toThrow('Service indisponible');
  });
});
