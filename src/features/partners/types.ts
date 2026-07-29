export interface PartnerCompany {
  _id: string;
  reference: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  sandboxBalance?: number;
  productionBalance?: number;
  companyMembers?: Array<{
    _id: string;
    active?: boolean;
  }>;
  companyInfos?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    logo?: string;
  };
}

export interface PartnerListResponse {
  success: boolean;
  companies: PartnerCompany[];
  page: number;
  total: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PartnerStatsResponse {
  success: boolean;
  data: {
    members: {
      total: number;
      active: number;
      inactive: number;
    };
    modules: {
      total: number;
      active: number;
    };
    company: {
      _id: string;
      name: string;
      reference: string;
      status: string;
      isVerified: boolean;
      createdAt: string;
    };
  };
}
