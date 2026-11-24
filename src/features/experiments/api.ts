import { requestJson } from '@/shared/api/http';

/**
 * A/B du bonus de bienvenue (tiers-service, `controllers/experiment.js`).
 * - A : bonus versé sur le solde à la 1re recharge ≥ minFirstRechargeXof
 *   (sinon perdu) ;
 * - B : bonus dans la jauge Objectif dès l'inscription (comportement historique).
 */

export type ExperimentStatus = 'running' | 'stopped';
export type Variant = 'A' | 'B';

export interface WelcomeExperiment {
  key: 'welcome_bonus';
  status: ExperimentStatus;
  splitA: number;
  params?: { minFirstRechargeXof?: number };
  startedAt?: string | null;
  stoppedAt?: string | null;
  updatedAt?: string | null;
}

export interface VariantStats {
  drivers: number;
  converted: number;
  conversionRate: number;
  firstRechargeAvg: number | null;
  firstRechargeAtLeastMin: number;
  medianHoursToFirstRecharge: number | null;
  rechargeCount: number;
  rechargesPerConverted: number;
  totalRecharged: number;
  bonusGranted: number;
  bonusForfeited: number;
  bonusCost: number;
  costPerConverted: number | null;
}

export interface WelcomeExperimentResponse {
  success: boolean;
  experiment: WelcomeExperiment;
  stats: Record<Variant, VariantStats>;
}

export interface WelcomeExperimentUpdate {
  status?: ExperimentStatus;
  splitA?: number;
  minFirstRechargeXof?: number;
}

export const DEFAULT_MIN_FIRST_RECHARGE_XOF = 5000;

export function getWelcomeExperiment() {
  return requestJson<WelcomeExperimentResponse>('tiersService', '/admin/experiments/welcome-bonus');
}

export function updateWelcomeExperiment(body: WelcomeExperimentUpdate) {
  return requestJson<{ success: boolean; experiment: WelcomeExperiment }>(
    'tiersService',
    '/admin/experiments/welcome-bonus',
    { method: 'PUT', body }
  );
}
