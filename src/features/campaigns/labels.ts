import type {
  CampaignKind,
  CampaignStatus,
  GrantStatus,
  PrizeKind,
  PrizeRole,
} from './types';

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  active: 'Ouverte',
  closed: 'Clôturée',
  drawn: 'Tirée',
  archived: 'Archivée',
};

export const KIND_LABEL: Record<CampaignKind, string> = {
  CONTEST: 'Tombola',
  REFERRAL: 'Parrainage',
};

export const PRIZE_KIND_LABEL: Record<PrizeKind, string> = {
  cash: 'Espèces',
  voucher: 'Bon d’achat',
  physical: 'Cadeau',
};

export const PRIZE_ROLE_LABEL: Record<PrizeRole, string> = {
  sponsor: 'Gagnant',
  referred: 'Filleul',
};

export const GRANT_STATUS_LABEL: Record<GrantStatus, string> = {
  pending: 'À livrer',
  delivered: 'Livré',
};
