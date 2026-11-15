import { requestJson } from '@/shared/api/http';

/**
 * Annonces de l'accueil de l'app chauffeur (support-service).
 * Une seule est visible a la fois : la plus recemment publiee parmi celles
 * actives pour le chauffeur.
 */
export type AnnouncementKind = 'info' | 'update' | 'news';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementAudience = 'all' | 'no_card' | 'with_card';

export interface Announcement {
  _id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaRoute?: string | null;
  ctaUrl?: string | null;
  status: AnnouncementStatus;
  startsAt: string | null;
  endsAt: string | null;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementInput {
  kind: AnnouncementKind;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaRoute: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  audience: AnnouncementAudience;
}

/** Limites appliquees par support-service (models/announcement). */
export const ANNOUNCEMENT_LIMITS = { title: 80, body: 300, ctaLabel: 24 } as const;

export const KIND_LABELS: Record<AnnouncementKind, string> = {
  news: 'Nouveauté',
  update: 'Mise à jour',
  info: 'Info',
};

export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  archived: 'Archivée',
};

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Tous les chauffeurs',
  no_card: 'Chauffeurs sans carte',
  with_card: 'Chauffeurs avec carte',
};

/** Ecrans de l'app ouvrables par le bouton (liste blanche de support-service). */
export const CTA_ROUTES: { value: string; label: string }[] = [
  { value: 'StationFinder', label: 'Trouver une station' },
  { value: 'Recharge', label: 'Recharger' },
  { value: 'Referral', label: 'Parrainage' },
  { value: 'FuelHistory', label: 'Historique carburant' },
  { value: 'GuidePompiste', label: 'Guide pompiste' },
  { value: 'AssociateFleetCard', label: 'Associer ma carte' },
  { value: 'HelpCenter', label: "Centre d'aide" },
  { value: 'Notifications', label: 'Notifications' },
  { value: 'History', label: 'Historique (onglet)' },
  { value: 'FuelBonus', label: 'Bonus carburant (onglet)' },
  { value: 'Profile', label: 'Profil (onglet)' },
];

const BASE = '/admin/announcements';

type One = { success: boolean; announcement: Announcement };

export function listAnnouncements(params: { status?: AnnouncementStatus; page?: number; limit?: number } = {}) {
  return requestJson<{ success: boolean; items: Announcement[]; total: number; page: number; limit: number }>(
    'supportService',
    BASE,
    { query: params }
  );
}

export function createAnnouncement(body: AnnouncementInput) {
  return requestJson<One>('supportService', BASE, { method: 'POST', body });
}

export function updateAnnouncement(id: string, body: AnnouncementInput) {
  return requestJson<One>('supportService', `${BASE}/${id}`, { method: 'PUT', body });
}

export function publishAnnouncement(id: string) {
  return requestJson<One>('supportService', `${BASE}/${id}/publish`, { method: 'POST' });
}

export function archiveAnnouncement(id: string) {
  return requestJson<One>('supportService', `${BASE}/${id}/archive`, { method: 'POST' });
}

export function deleteAnnouncement(id: string) {
  return requestJson<{ success: boolean }>('supportService', `${BASE}/${id}`, { method: 'DELETE' });
}

/**
 * Etat affiche dans la liste : une annonce publiee peut encore attendre son
 * debut ou etre deja terminee.
 */
export type AnnouncementLiveState = 'draft' | 'scheduled' | 'live' | 'ended' | 'archived';

export function liveState(a: Pick<Announcement, 'status' | 'startsAt' | 'endsAt'>, now = new Date()): AnnouncementLiveState {
  if (a.status === 'draft') return 'draft';
  if (a.status === 'archived') return 'archived';
  if (a.startsAt && new Date(a.startsAt) > now) return 'scheduled';
  if (a.endsAt && new Date(a.endsAt) <= now) return 'ended';
  return 'live';
}
