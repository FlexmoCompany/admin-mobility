import { requestJson } from '@/shared/api/http';

export interface MobilityProduct {
  key: 'gasoil' | 'essence';
  refPricePerLiter: number;
}

export interface MobilityTier {
  fromLiters: number;
  toLiters: number | null;
  ratePct: number;
}

export interface MobilityConfig {
  cashback: {
    driverBonusPerLiter: number;
    minPayout: number;
    products: MobilityProduct[];
    tiers: MobilityTier[];
  };
  referral: { reward: number; cap: number };
  welcome: { amount: number; cap: number };
  agent: { dailyBase: number; dailyQuota: number; extraPerDriver: number };
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface TierTransitionRow {
  _id: string;
  fromTierIndex: number;
  toTierIndex: number;
  crossedAtLiters: number;
  purchaseId: string;
  occurredAt: string;
  ratePctFrom: number;
  ratePctTo: number;
}

export interface CockpitCashbackTotals {
  success: boolean;
  totalReceivedFromPartner: number;
  flexmoSubsidy: number;
  driverBonusPaid: number;
  liters: number;
  mock: boolean;
}

export function getMobilityConfig() {
  return requestJson<{ success: boolean; config: MobilityConfig }>(
    'tiersService',
    '/admin/mobility-config'
  );
}

export function putCashbackConfig(body: MobilityConfig['cashback']) {
  return requestJson<{ success: boolean; config: MobilityConfig }>(
    'tiersService',
    '/admin/mobility-config/cashback',
    { method: 'PUT', body }
  );
}

export function putReferralConfig(body: MobilityConfig['referral']) {
  return requestJson<{ success: boolean; config: MobilityConfig }>(
    'tiersService',
    '/admin/mobility-config/referral',
    { method: 'PUT', body }
  );
}

export function putWelcomeConfig(body: MobilityConfig['welcome']) {
  return requestJson<{ success: boolean; config: MobilityConfig }>(
    'tiersService',
    '/admin/mobility-config/welcome',
    { method: 'PUT', body }
  );
}

export function putAgentConfig(body: MobilityConfig['agent']) {
  return requestJson<{ success: boolean; config: MobilityConfig }>(
    'tiersService',
    '/admin/mobility-config/agent',
    { method: 'PUT', body }
  );
}

export function listTierTransitions(params: { limit?: number; skip?: number } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.skip) q.set('skip', String(params.skip));
  const qs = q.toString();
  return requestJson<{ success: boolean; items: TierTransitionRow[]; total: number }>(
    'tiersService',
    `/admin/mobility-config/tier-transitions${qs ? `?${qs}` : ''}`
  );
}

export function getCockpitCashbackTotals() {
  return requestJson<CockpitCashbackTotals>(
    'tiersService',
    '/admin/mobility-config/cockpit-totals'
  );
}
