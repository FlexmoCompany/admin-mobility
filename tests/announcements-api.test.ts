import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  archiveAnnouncement,
  createAnnouncement,
  listAnnouncements,
  liveState,
  publishAnnouncement,
} from '@/features/announcements/api';

import { stubFetch } from './helpers/fetch-mock';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('client annonces (support-service)', () => {
  test('liste via la passerelle /v1/support-service avec le filtre de statut', async () => {
    const stub = stubFetch({ '/admin/announcements': { json: { success: true, items: [], total: 0 } } });
    await listAnnouncements({ status: 'published' });
    expect(stub.calls[0].url).toContain('/v1/support-service/admin/announcements');
    expect(stub.calls[0].url).toContain('status=published');
    expect(stub.calls[0].method).toBe('GET');
  });

  test('cree, publie et archive avec les bons verbes (pas de PATCH, refuse par la passerelle)', async () => {
    const one = { json: { success: true, announcement: { _id: 'a1' } } };
    const stub = stubFetch({
      '/admin/announcements/a1/publish': one,
      '/admin/announcements/a1/archive': one,
      '/admin/announcements': one,
    });
    await createAnnouncement({
      kind: 'news',
      title: 'T',
      body: 'B',
      ctaLabel: null,
      ctaRoute: null,
      ctaUrl: null,
      audience: 'all',
      startsAt: null,
      endsAt: null,
    });
    await publishAnnouncement('a1');
    await archiveAnnouncement('a1');
    expect(stub.calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      'POST /v1/support-service/admin/announcements',
      'POST /v1/support-service/admin/announcements/a1/publish',
      'POST /v1/support-service/admin/announcements/a1/archive',
    ]);
    expect(stub.calls[0].body).toMatchObject({ kind: 'news', title: 'T' });
  });

  test('remonte le message d\'erreur du serveur', async () => {
    stubFetch({ '/admin/announcements': { status: 400, json: { success: false, message: 'Le titre est obligatoire.' } } });
    await expect(listAnnouncements()).rejects.toThrow('Le titre est obligatoire.');
  });
});

describe('liveState', () => {
  const now = new Date('2026-11-15T10:00:00Z');
  test.each([
    [{ status: 'draft', startsAt: null, endsAt: null }, 'draft'],
    [{ status: 'archived', startsAt: null, endsAt: null }, 'archived'],
    [{ status: 'published', startsAt: null, endsAt: null }, 'live'],
    [{ status: 'published', startsAt: '2026-11-20T00:00:00Z', endsAt: null }, 'scheduled'],
    [{ status: 'published', startsAt: null, endsAt: '2026-11-14T00:00:00Z' }, 'ended'],
  ] as const)('%o -> %s', (a, expected) => {
    expect(liveState(a, now)).toBe(expected);
  });
});
