import { requestJson } from '@/shared/api/http';
import { runtimeConfig, serviceConfig } from '@/shared/api/config';
import { readToken } from '@/shared/api/session';

import type { Campaign, CampaignGrant, CampaignFormValues } from './types';

const BASE = '/admin/games';

type ListRes = { success: boolean; items: Campaign[] };
type OneRes = { success: boolean; campaign: Campaign };
type GrantsRes = { success: boolean; items: CampaignGrant[] };
type GrantRes = { success: boolean; grant: CampaignGrant };

export function listCampaigns() {
  return requestJson<ListRes>('tiersService', BASE).then((r) => r.items);
}

export function getCampaign(id: string) {
  return requestJson<OneRes>('tiersService', `${BASE}/${id}`).then((r) => r.campaign);
}

export function createCampaign(body: Omit<Campaign, 'id' | 'entriesCount' | 'participants' | 'winnersPublished'>) {
  return requestJson<OneRes>('tiersService', BASE, { method: 'POST', body }).then(
    (r) => r.campaign
  );
}

export function updateCampaign(id: string, body: Partial<Campaign>) {
  return requestJson<OneRes>('tiersService', `${BASE}/${id}`, {
    method: 'PUT',
    body,
  }).then((r) => r.campaign);
}

export function listGrants() {
  return requestJson<GrantsRes>('tiersService', `${BASE}/grants`).then((r) => r.items);
}

export function patchGrant(id: string, status: 'pending' | 'delivered') {
  return requestJson<GrantRes>('tiersService', `${BASE}/grants/${id}`, {
    method: 'PATCH',
    body: { status },
  }).then((r) => r.grant);
}

/** Upload image lot → files-service Backblaze. Retourne fileUrl. */
export async function uploadPrizeImage(file: File): Promise<string> {
  const token = readToken();
  const url = new URL(
    `${serviceConfig.filesService}/file/upload/prizes`,
    serviceConfig.apiGateway
  );
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(url.toString(), {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Env: runtimeConfig.env,
      product: runtimeConfig.product,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: string }).error)
        : null) || 'Upload image échoué'
    );
  }
  const fileUrl = payload?.filesData?.[0]?.fileUrl;
  if (!fileUrl) throw new Error('Upload OK mais fileUrl manquant');
  return String(fileUrl);
}

export function formToCreateBody(values: CampaignFormValues) {
  const criteria = [
    {
      key: 'accountActive' as const,
      label: 'Compte actif',
      enabled: values.accountActive,
    },
    {
      key: 'minTenureDays' as const,
      label: 'Ancienneté',
      enabled: values.minTenureDaysEnabled,
      value: Number(values.minTenureDays) || 0,
    },
    {
      key: 'minWaveRecharges' as const,
      label: 'Recharges Wave',
      enabled: values.minWaveRechargesEnabled,
      value: Number(values.minWaveRecharges) || 0,
    },
    {
      key: 'minFuelPurchases' as const,
      label: 'Achats carburant',
      enabled: values.minFuelPurchasesEnabled,
      value: Number(values.minFuelPurchases) || 0,
    },
    {
      key: 'minReferrals' as const,
      label: 'Filleuls',
      enabled: values.minReferralsEnabled,
      value: Number(values.minReferrals) || 0,
    },
  ];

  const stamp = Date.now();
  return {
    title: values.title.trim(),
    kind: values.kind,
    status: 'draft' as const,
    summary: values.summary.trim(),
    rules: values.rules.trim(),
    coverage: values.coverage.trim() || 'Tous les chauffeurs',
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    maxEntries: Number(values.maxEntries) || undefined,
    criteria,
    prizes: values.prizes.map((p, i) => ({
      id: `prize-${stamp}-${i}`,
      kind: p.kind,
      role: p.role,
      label: p.label.trim(),
      amountXof: Number(p.amount) || undefined,
      imageUrl: p.imageUrl.trim() || undefined,
    })),
  };
}
