import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Car,
  CreditCard,
  FlaskConical,
  Fuel,
  LayoutDashboard,
  Megaphone,
  Package,
  Trophy,
  Users,
  Settings2,
  Wallet,
} from 'lucide-react';

export type AppRouteKey =
  | 'cockpit'
  | 'partners'
  | 'drivers'
  | 'vehicles'
  | 'fuel'
  | 'cards-balances'
  | 'fuel-finance'
  | 'recharges-allocations'
  | 'treasury'
  | 'incidents'
  | 'announcements'
  | 'campaigns'
  | 'admins'
  | 'mobility-config'
  | 'ab-test'
  | 'app-versions';

export type NavSection = 'pilotage' | 'operations' | 'finance' | 'app' | 'admin';

/** Rubriques de la barre latérale, dans l'ordre d'affichage. */
export const NAV_SECTIONS: { key: NavSection; label: string }[] = [
  { key: 'pilotage', label: 'Pilotage' },
  { key: 'operations', label: 'Opérations' },
  { key: 'finance', label: 'Finance' },
  { key: 'app', label: 'App chauffeur' },
  { key: 'admin', label: 'Administration' },
];

export interface NavItem {
  key: AppRouteKey;
  section: NavSection;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
}

export const INTERNAL_NAV_ITEMS: NavItem[] = [
  {
    key: 'cockpit',
    section: 'pilotage',
    label: 'Cockpit',
    href: '/cockpit',
    description: "Vue d'ensemble ops",
    icon: LayoutDashboard,
  },
  {
    key: 'partners',
    section: 'operations',
    label: 'Partenaires',
    href: '/partners',
    description: 'Partenaires flotte',
    icon: Building2,
  },
  {
    key: 'drivers',
    section: 'operations',
    label: 'Conducteurs',
    href: '/drivers',
    description: 'Gestion conducteurs',
    icon: Users,
  },
  {
    key: 'vehicles',
    section: 'operations',
    label: 'Véhicules',
    href: '/vehicles',
    description: 'Parc roulant',
    icon: Car,
  },
  {
    key: 'fuel',
    section: 'operations',
    label: 'Carburant',
    href: '/fuel',
    description: 'Achats et imports',
    icon: Fuel,
  },
  {
    key: 'cards-balances',
    section: 'operations',
    label: 'Cartes et soldes',
    href: '/cards-balances',
    description: 'Cartes, soldes et mouvements',
    icon: CreditCard,
  },
  {
    key: 'fuel-finance',
    section: 'finance',
    label: 'Finance carburant',
    href: '/fuel-finance',
    description: 'Flux financiers liés au carburant',
    icon: Activity,
  },
  {
    key: 'recharges-allocations',
    section: 'finance',
    label: 'Recharges & allocations',
    href: '/recharges-allocations',
    description: 'Recharges Wave et allocations TotalEnergies liées',
    icon: ArrowLeftRight,
  },
  {
    key: 'treasury',
    section: 'finance',
    label: 'Trésorerie',
    href: '/treasury',
    description: 'Appro, encaissement, sweep',
    icon: Wallet,
    superadminOnly: true,
  },
  {
    key: 'incidents',
    section: 'operations',
    label: 'Incidents',
    href: '/incidents',
    description: 'Support et anomalies',
    icon: AlertTriangle,
  },
  {
    key: 'announcements',
    section: 'app',
    label: 'Annonces',
    href: '/announcements',
    description: "Carte d'accueil de l'app chauffeur",
    icon: Megaphone,
  },
  {
    key: 'campaigns',
    section: 'app',
    label: 'Campagnes',
    href: '/campaigns',
    description: 'Jeux, concours, tirages chauffeurs',
    icon: Trophy,
    superadminOnly: true,
  },
  {
    key: 'admins',
    section: 'admin',
    label: 'Admins',
    href: '/admins',
    description: 'Gestion des comptes admin',
    icon: Users,
    superadminOnly: true,
  },
  {
    key: 'mobility-config',
    section: 'app',
    label: 'Config Mobility',
    href: '/mobility-config',
    description: 'Cashback, paliers, parrainage',
    icon: Settings2,
    superadminOnly: true,
  },
  {
    key: 'ab-test',
    section: 'app',
    label: 'A/B test',
    href: '/ab-test',
    description: 'Bonus de bienvenue : résultats et réglages',
    icon: FlaskConical,
    superadminOnly: true,
  },
  {
    key: 'app-versions',
    section: 'app',
    label: 'Versions app',
    href: '/app-versions',
    description: 'APK OTP Pay et changelog',
    icon: Package,
    superadminOnly: true,
  },
];
