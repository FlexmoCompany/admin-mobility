import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Car,
  CreditCard,
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
  | 'treasury'
  | 'incidents'
  | 'announcements'
  | 'campaigns'
  | 'admins'
  | 'mobility-config'
  | 'app-versions';

export interface NavItem {
  key: AppRouteKey;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
}

export const INTERNAL_NAV_ITEMS: NavItem[] = [
  {
    key: 'cockpit',
    label: 'Cockpit',
    href: '/cockpit',
    description: "Vue d'ensemble ops",
    icon: LayoutDashboard,
  },
  {
    key: 'partners',
    label: 'Partenaires',
    href: '/partners',
    description: 'Partenaires flotte',
    icon: Building2,
  },
  {
    key: 'drivers',
    label: 'Conducteurs',
    href: '/drivers',
    description: 'Gestion conducteurs',
    icon: Users,
  },
  {
    key: 'vehicles',
    label: 'Vehicules',
    href: '/vehicles',
    description: 'Parc roulant',
    icon: Car,
  },
  {
    key: 'fuel',
    label: 'Carburant',
    href: '/fuel',
    description: 'Achats et imports',
    icon: Fuel,
  },
  {
    key: 'cards-balances',
    label: 'Cartes et soldes',
    href: '/cards-balances',
    description: 'Cartes, soldes et mouvements',
    icon: CreditCard,
  },
  {
    key: 'fuel-finance',
    label: 'Finance carburant',
    href: '/fuel-finance',
    description: 'Flux finances lies au carburant',
    icon: Activity,
  },
  {
    key: 'treasury',
    label: 'Trésorerie',
    href: '/treasury',
    description: 'Appro, encaissement, sweep',
    icon: Wallet,
    superadminOnly: true,
  },
  {
    key: 'incidents',
    label: 'Incidents',
    href: '/incidents',
    description: 'Support et anomalies',
    icon: AlertTriangle,
  },
  {
    key: 'announcements',
    label: 'Annonces',
    href: '/announcements',
    description: "Carte d'accueil de l'app chauffeur",
    icon: Megaphone,
  },
  {
    key: 'campaigns',
    label: 'Campagnes',
    href: '/campaigns',
    description: 'Jeux, concours, tirages chauffeurs',
    icon: Trophy,
    superadminOnly: true,
  },
  {
    key: 'admins',
    label: 'Admins',
    href: '/admins',
    description: 'Gestion des comptes admin',
    icon: Users,
    superadminOnly: true,
  },
  {
    key: 'mobility-config',
    label: 'Config Mobility',
    href: '/mobility-config',
    description: 'Cashback, paliers, parrainage',
    icon: Settings2,
    superadminOnly: true,
  },
  {
    key: 'app-versions',
    label: 'Versions app',
    href: '/app-versions',
    description: 'APK OTP Pay et changelog',
    icon: Package,
    superadminOnly: true,
  },
];
