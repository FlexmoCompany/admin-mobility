import { requestJson } from '@/shared/api/http';

import type {
  PartnerAccountsResponse,
  PartnerAdminsResponse,
  ListPartnersParams,
  PartnerDetailResponse,
  PartnerDriversResponse,
  PartnerListResponse,
  PartnerMembersResponse,
  PartnerMutationResponse,
  PartnerStatsResponse,
  PartnerStatus,
  PartnerVehiclesResponse,
  UpdatePartnerPayload,
} from '../types';

export function listPartners(params: ListPartnersParams = {}) {
  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    isVerified = '',
    status = '',
  } = params;

  return requestJson<PartnerListResponse>('tiersService', '/company/get-all/by-filters', {
    method: 'GET',
    query: {
      page,
      limit,
      searchTerm,
      isVerified,
      status,
    } as Record<string, string | number | boolean | null | undefined>,
  });
}

export function getPartnerStats(companyId: string) {
  return requestJson<PartnerStatsResponse>('tiersService', `/companies/${companyId}/stats`);
}

export function getPartnerById(companyId: string) {
  return requestJson<PartnerDetailResponse>(
    'tiersService',
    `/company/get-one-by-id/${companyId}`
  );
}

export function getPartnerAdmins(companyId: string) {
  return requestJson<PartnerAdminsResponse>('tiersService', `/company/${companyId}/admins`);
}

export function getPartnerMembers(companyId: string) {
  return requestJson<PartnerMembersResponse>('tiersService', `/companies/${companyId}/members`);
}

export function getPartnerAccounts(companyId: string) {
  return requestJson<PartnerAccountsResponse>('tiersService', `/companies/${companyId}/accounts`);
}

export function getPartnerVehicles(companyId: string) {
  return requestJson<PartnerVehiclesResponse>('tiersService', `/companies/${companyId}/vehicles`);
}

export function getPartnerDrivers(companyRef: string) {
  return requestJson<PartnerDriversResponse>('tiersService', '/admin/drivers/', {
    method: 'GET',
    query: {
      companyRef,
      limit: 20,
    },
  });
}

export function updatePartner(companyId: string, payload: UpdatePartnerPayload) {
  return requestJson<PartnerMutationResponse>(
    'tiersService',
    `/company/update/${companyId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

export function togglePartnerStatus(companyId: string, status: PartnerStatus) {
  return requestJson<PartnerMutationResponse>(
    'tiersService',
    `/company/status/${companyId}`,
    {
      method: 'PUT',
      body: {status},
    }
  );
}
