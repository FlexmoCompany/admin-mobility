import { requestJson } from '@/shared/api/http';

export interface LedgerLine {
  accountCode: string;
  direction: string;
  amount: number;
}

export interface TreasuryActionResult {
  success: boolean;
  eventId: string;
  fee?: number;
  net?: number;
  journal?: {_id?: string; type?: string; idempotencyKey?: string};
  lines?: LedgerLine[];
  message?: string;
}

export interface LedgerResponse {
  success: boolean;
  journal?: {_id?: string; type?: string; idempotencyKey?: string};
  lines?: LedgerLine[];
  message?: string;
}

function xofToCents(xof: number) {
  return Math.round(xof * 100);
}

export function postProvision(amountXof: number) {
  return requestJson<TreasuryActionResult>('financeService', '/admin/treasury/provision', {
    method: 'POST',
    body: {amountCents: xofToCents(amountXof)},
  });
}

export function postSweep(amountXof: number) {
  return requestJson<TreasuryActionResult>('financeService', '/admin/treasury/sweep', {
    method: 'POST',
    body: {amountCents: xofToCents(amountXof)},
  });
}

export function postCashbackSettle(amountXof: number) {
  return requestJson<TreasuryActionResult>(
    'financeService',
    '/admin/treasury/cashback-settle',
    {
      method: 'POST',
      body: {amountCents: xofToCents(amountXof)},
    }
  );
}

export function getLedger(eventId: string) {
  return requestJson<LedgerResponse>(
    'financeService',
    `/admin/ledger/${encodeURIComponent(eventId)}`
  );
}
