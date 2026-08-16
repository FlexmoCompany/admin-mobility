export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
export type IncidentCategory =
  | 'fuel-card-creation'
  | 'fuel-allocation'
  | 'balance-diff'
  | 'fuel-purchase'
  | 'sync'
  | 'support'
  | 'other';

export interface IncidentRecord {
  id: string;
  reference: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  summary: string;
  owner?: string;
  assignee?: string;
  ownerType?: string;
  driverId?: string;
  partnerId?: string;
  accountId?: string;
  purchaseId?: string;
  allocationId?: string;
  occurredAt: string;
  lastOccurrenceAt?: string;
  resolvedAt?: string;
  retryable?: boolean;
  relatedSignalId?: string;
  tags: string[];
  navigateTo?: string;
  lastError?: string;
  attempts?: number;
  payload?: Record<string, unknown>;
}

export interface IncidentsResponse {
  success: boolean;
  data: {
    items: IncidentRecord[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

/**
 * Compteurs derives du cycle de vie des allocations de carte carburant,
 * seule source d'incidents exposee aujourd'hui par le backend.
 */
export interface IncidentStatsResponse {
  success: boolean;
  data: {
    open: number;
    investigating: number;
    critical: number;
    retryable: number;
    resolved: number;
    total: number;
  };
}

export interface ListIncidentsParams {
  page?: number;
  limit?: number;
  status?: IncidentStatus | '';
  category?: IncidentCategory | '';
  search?: string;
  retryable?: boolean | '';
}

export interface RetryIncidentPayload {
  incidentId: string;
  note?: string;
}
