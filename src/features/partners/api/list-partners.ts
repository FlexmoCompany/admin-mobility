import { requestJson } from '@/shared/api/http';

import type { PartnerListResponse, PartnerStatsResponse } from '../types';

interface ListPartnersParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
}

export function listPartners(params: ListPartnersParams = {}) {
  const { page = 1, limit = 8, searchTerm = '' } = params;

  return requestJson<PartnerListResponse>(
    'tiersService',
    '/company/get-all/by-filters',
    {
      query: {
        page,
        limit,
        searchTerm,
      },
    }
  );
}

export function getPartnerStats(companyId: string) {
  return requestJson<PartnerStatsResponse>(
    'tiersService',
    `/companies/${companyId}/stats`
  );
}
