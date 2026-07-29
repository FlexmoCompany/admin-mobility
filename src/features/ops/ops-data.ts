import type { AppRouteKey } from '@/config/navigation';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'healthy';
export type OpsStatus = 'active' | 'watch' | 'blocked' | 'pending' | 'closed';

export interface Metric {
  label: string;
  value: string;
  delta: string;
  tone: Severity;
}

export interface OpsRecord {
  id: string;
  primary: string;
  secondary: string;
  owner: string;
  status: OpsStatus;
  amount: string;
  signal: string;
  updatedAt: string;
  tags: string[];
}

export interface ActionItem {
  label: string;
  description: string;
  tone: Severity;
}

export interface TimelineItem {
  time: string;
  title: string;
  detail: string;
  tone: Severity;
}

export interface OpsModule {
  key: AppRouteKey;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  metrics: Metric[];
  records: OpsRecord[];
  actions: ActionItem[];
  timeline: TimelineItem[];
}

export const statusLabels: Record<OpsStatus, string> = {
  active: 'Actif',
  watch: 'A surveiller',
  blocked: 'Bloque',
  pending: 'En attente',
  closed: 'Cloture',
};

export const modules: Record<AppRouteKey, OpsModule> = {
  cockpit: {
    key: 'cockpit',
    eyebrow: 'Live command',
    title: 'Tour de controle carburant',
    description:
      'Vue de quart pour suivre les recharges, allocations TotalEnergies, soldes cartes, imports de consommation et incidents qui impactent les conducteurs.',
    primaryAction: 'Ouvrir la file critique',
    secondaryAction: 'Exporter le rapport',
    metrics: [
      { label: 'Volume jour', value: '18 420 L', delta: '+12% vs hier', tone: 'healthy' },
      { label: 'Allocations en retard', value: '17', delta: '6 depuis 30 min', tone: 'critical' },
      { label: 'Solde expose', value: '42,8M FCFA', delta: 'prod + sandbox', tone: 'medium' },
      { label: 'Conducteurs actifs', value: '1 284', delta: '82% du parc', tone: 'healthy' },
    ],
    records: [
      {
        id: 'OPS-1842',
        primary: 'Allocation post-recharge en attente',
        secondary: 'Driver Kone Adama - TotalEnergies Fleet',
        owner: 'Queue fuel.card.allocation',
        status: 'blocked',
        amount: '75 000 FCFA',
        signal: 'Aucun solde partenaire lu',
        updatedAt: '10:42',
        tags: ['retry', 'allocation'],
      },
      {
        id: 'OPS-1841',
        primary: 'Import consommation termine',
        secondary: 'Batch TotalEnergies CI - 486 transactions',
        owner: 'Automation',
        status: 'active',
        amount: '5 980 L',
        signal: '18 doublons ignores',
        updatedAt: '10:31',
        tags: ['import', 'bonus'],
      },
      {
        id: 'OPS-1839',
        primary: 'Ecart solde carte',
        secondary: 'Carte +2250700441122',
        owner: 'Support N2',
        status: 'watch',
        amount: '12 500 FCFA',
        signal: 'FlexMo > partenaire',
        updatedAt: '10:08',
        tags: ['sync', 'balance'],
      },
    ],
    actions: [
      { label: 'Relancer les allocations bloquees', description: '17 jobs retryables detectes.', tone: 'critical' },
      { label: 'Verifier le batch conso', description: 'Confirmer les 18 doublons avant cloture.', tone: 'medium' },
      { label: 'Preparer le briefing 18h', description: 'Synthese incidents et volumes du jour.', tone: 'low' },
    ],
    timeline: [
      { time: '10:42', title: 'Allocation bloquee', detail: 'Lecture solde partenaire indisponible.', tone: 'critical' },
      { time: '10:31', title: 'Import termine', detail: '486 transactions integrees.', tone: 'healthy' },
      { time: '09:58', title: 'Notification ouverture', detail: 'Push conducteurs envoye.', tone: 'low' },
    ],
  },
  partners: {
    key: 'partners',
    eyebrow: 'Network registry',
    title: 'Partenaires et exposition',
    description:
      'Pilotage multi-partenaires: statut, exposition financiere, activite conducteurs et signaux qui demandent une intervention ops.',
    primaryAction: 'Ajouter une note',
    secondaryAction: 'Synchroniser',
    metrics: [
      { label: 'Partenaires actifs', value: '38', delta: '+4 ce mois', tone: 'healthy' },
      { label: 'Non verifies', value: '5', delta: '2 critiques', tone: 'high' },
      { label: 'Exposition prod', value: '128,4M', delta: 'FCFA', tone: 'medium' },
      { label: 'Modules actifs', value: '91', delta: 'Fuel + Fleet', tone: 'healthy' },
    ],
    records: [
      { id: 'PAR-001', primary: 'Taxi Union Plateau', secondary: 'REF-TUP-928', owner: 'Awa Coulibaly', status: 'active', amount: '18,2M FCFA', signal: '214 conducteurs', updatedAt: '09:44', tags: ['verified', 'prod'] },
      { id: 'PAR-002', primary: 'Express Mobility CI', secondary: 'REF-EMC-114', owner: 'Mamadou Traore', status: 'watch', amount: '6,8M FCFA', signal: '12 cartes inactives', updatedAt: '08:12', tags: ['cards', 'support'] },
      { id: 'PAR-003', primary: 'Abidjan Fleet Services', secondary: 'REF-AFS-551', owner: 'Nadia Kassi', status: 'pending', amount: '2,1M FCFA', signal: 'KYC incomplet', updatedAt: 'Hier', tags: ['kyc'] },
    ],
    actions: [
      { label: 'Contacter Express Mobility', description: 'Cartes inactives avec recharge recente.', tone: 'high' },
      { label: 'Verifier KYC AFS', description: 'Blocage activation production.', tone: 'medium' },
      { label: 'Comparer soldes prod', description: 'Rapprochement hebdomadaire.', tone: 'low' },
    ],
    timeline: [
      { time: '09:44', title: 'Solde partenaire actualise', detail: 'Taxi Union Plateau synchronise.', tone: 'healthy' },
      { time: '08:12', title: 'Alerte cartes', detail: '12 cartes inactive apres recharge.', tone: 'high' },
      { time: 'Hier', title: 'KYC en attente', detail: 'Document RCCM manquant.', tone: 'medium' },
    ],
  },
  drivers: {
    key: 'drivers',
    eyebrow: 'Driver support',
    title: 'Conducteurs, bonus et support',
    description:
      'Recherche rapide conducteur avec statut de carte, solde, dernier achat, bonus disponible et actions support de premier niveau.',
    primaryAction: 'Ouvrir une fiche',
    secondaryAction: 'Reset PIN',
    metrics: [
      { label: 'Actifs aujourd hui', value: '1 284', delta: '+71', tone: 'healthy' },
      { label: 'Bonus utilisables', value: '312', delta: '>= 2 500 FCFA', tone: 'healthy' },
      { label: 'Inactivite J2', value: '49', delta: '-200 FCFA risque', tone: 'high' },
      { label: 'PIN resets', value: '23', delta: 'ce jour', tone: 'medium' },
    ],
    records: [
      { id: 'DRV-7741', primary: 'Kone Adama', secondary: '+225 07 00 44 11 22', owner: 'Taxi Union Plateau', status: 'blocked', amount: '75 000 FCFA', signal: 'Allocation non confirmee', updatedAt: '10:42', tags: ['pin-ok', 'fuel-card'] },
      { id: 'DRV-6620', primary: 'Aminata Bamba', secondary: '+225 05 88 14 31 09', owner: 'Express Mobility CI', status: 'active', amount: '18 400 FCFA', signal: 'Bonus 2 715 FCFA', updatedAt: '09:17', tags: ['bonus', 'active'] },
      { id: 'DRV-5590', primary: 'Yao Serge', secondary: '+225 01 11 09 76 44', owner: 'Abidjan Fleet Services', status: 'watch', amount: '0 FCFA', signal: 'Inactif depuis 2 jours', updatedAt: 'Hier', tags: ['inactive'] },
    ],
    actions: [
      { label: 'Prioriser Kone Adama', description: 'Recharge payee, allocation absente.', tone: 'critical' },
      { label: 'Envoyer rappel inactivite', description: '49 conducteurs ciblables.', tone: 'high' },
      { label: 'Auditer bonus disponibles', description: 'Verifier transferts batch.', tone: 'medium' },
    ],
    timeline: [
      { time: '10:42', title: 'Ticket conducteur ouvert', detail: 'Allocation non confirmee apres paiement.', tone: 'critical' },
      { time: '09:17', title: 'Bonus seuil atteint', detail: 'Aminata Bamba eligible.', tone: 'healthy' },
      { time: '08:50', title: 'Campagne rappel', detail: 'Inactivite J1 programmee.', tone: 'low' },
    ],
  },
  vehicles: {
    key: 'vehicles',
    eyebrow: 'Fleet map',
    title: 'Vehicules et affectations',
    description:
      'Supervision parc roulant: affectations conducteur, statut operationnel, type carburant et signaux de maintenance qui perturbent la consommation.',
    primaryAction: 'Assigner un vehicule',
    secondaryAction: 'Voir maintenance',
    metrics: [
      { label: 'Vehicules suivis', value: '842', delta: '7 types', tone: 'healthy' },
      { label: 'Sans conducteur', value: '64', delta: 'a traiter', tone: 'medium' },
      { label: 'Maintenance due', value: '31', delta: '12 critiques', tone: 'high' },
      { label: 'Diesel', value: '58%', delta: 'du parc', tone: 'low' },
    ],
    records: [
      { id: 'VEH-442', primary: 'Toyota Hiace 5504-JR-01', secondary: 'Diesel - 12 places', owner: 'Aminata Bamba', status: 'active', amount: '142 L', signal: 'Conso mois', updatedAt: '09:03', tags: ['diesel'] },
      { id: 'VEH-191', primary: 'Yango Moto 8711-AB-01', secondary: 'Essence - deux roues', owner: 'Non assigne', status: 'pending', amount: '0 L', signal: 'Disponible', updatedAt: 'Hier', tags: ['assign'] },
      { id: 'VEH-715', primary: 'Renault Master 0931-KA-01', secondary: 'Diesel - cargo', owner: 'Kone Adama', status: 'watch', amount: '318 L', signal: 'Maintenance retard', updatedAt: 'Lun.', tags: ['maintenance'] },
    ],
    actions: [
      { label: 'Affecter les vehicules libres', description: '64 vehicules sans conducteur.', tone: 'medium' },
      { label: 'Escalader maintenance', description: '12 vehicules depassent le seuil.', tone: 'high' },
      { label: 'Comparer conso par type', description: 'Verifier les anomalies diesel.', tone: 'low' },
    ],
    timeline: [
      { time: '09:03', title: 'Vehicule actif', detail: 'Hiace synchronise avec dernier plein.', tone: 'healthy' },
      { time: 'Hier', title: 'Affectation ouverte', detail: 'Moto disponible pour nouveau conducteur.', tone: 'medium' },
      { time: 'Lun.', title: 'Maintenance due', detail: 'Renault Master a surveiller.', tone: 'high' },
    ],
  },
  fuel: {
    key: 'fuel',
    eyebrow: 'Fuel ledger',
    title: 'Achats et imports carburant',
    description:
      'Controle des achats TotalEnergies et imports manuels: volumes, stations, references externes, doublons et bonus calcules.',
    primaryAction: 'Importer CSV',
    secondaryAction: 'Verifier doublons',
    metrics: [
      { label: 'Transactions jour', value: '486', delta: '18 doublons', tone: 'healthy' },
      { label: 'Volume integre', value: '5 980 L', delta: '+8%', tone: 'healthy' },
      { label: 'Sans conducteur', value: '9', delta: 'cardNumber inconnu', tone: 'high' },
      { label: 'Bonus generes', value: '89 700', delta: 'FCFA', tone: 'medium' },
    ],
    records: [
      { id: 'FUEL-991', primary: 'Station Riviera 3', secondary: 'GASOIL - ref TE-783929', owner: 'Kone Adama', status: 'active', amount: '64 L', signal: 'Bonus 960 FCFA', updatedAt: '10:27', tags: ['totalenergies'] },
      { id: 'FUEL-990', primary: 'Station Yopougon', secondary: 'SUPER SP - ref TE-783911', owner: 'Aminata Bamba', status: 'active', amount: '28 L', signal: 'Bonus 420 FCFA', updatedAt: '10:11', tags: ['bonus'] },
      { id: 'FUEL-981', primary: 'Internal operations', secondary: 'Cashback partenaire', owner: 'Non rattache', status: 'watch', amount: '1 250 FCFA', signal: 'A classer', updatedAt: '09:45', tags: ['cashback'] },
    ],
    actions: [
      { label: 'Rattacher 9 transactions', description: 'Card numbers sans conducteur actif.', tone: 'high' },
      { label: 'Valider le batch', description: '486 lignes importees ce matin.', tone: 'medium' },
      { label: 'Comparer cashback', description: '3,57% partenaire vs bonus driver.', tone: 'low' },
    ],
    timeline: [
      { time: '10:27', title: 'Achat cree', detail: 'Station Riviera 3, 64 L.', tone: 'healthy' },
      { time: '10:11', title: 'Bonus calcule', detail: '420 FCFA sur achat conducteur.', tone: 'healthy' },
      { time: '09:45', title: 'Transaction a classer', detail: 'Internal operations detecte.', tone: 'medium' },
    ],
  },
  'cards-balances': {
    key: 'cards-balances',
    eyebrow: 'Card balance desk',
    title: 'Cartes, soldes et allocations',
    description:
      'Suivi des comptes collect conducteurs, soldes partenaires, allocations asynchrones et ecarts entre FlexMo et TotalEnergies.',
    primaryAction: 'Recharger une carte',
    secondaryAction: 'Synchroniser soldes',
    metrics: [
      { label: 'Cartes actives', value: '1 112', delta: '86% du parc', tone: 'healthy' },
      { label: 'Allocation pending', value: '17', delta: 'queue active', tone: 'critical' },
      { label: 'Ecarts soldes', value: '23', delta: '> 5 000 FCFA', tone: 'high' },
      { label: 'Solde moyen', value: '31 800', delta: 'FCFA', tone: 'low' },
    ],
    records: [
      { id: 'CARD-7070', primary: '+2250700441122', secondary: 'Carte active - sandbox', owner: 'Kone Adama', status: 'blocked', amount: '75 000 FCFA', signal: 'Allocation non lue', updatedAt: '10:42', tags: ['allocation'] },
      { id: 'CARD-5588', primary: '+2250588143109', secondary: 'Carte active - production', owner: 'Aminata Bamba', status: 'active', amount: '18 400 FCFA', signal: 'Sync success', updatedAt: '09:17', tags: ['synced'] },
      { id: 'CARD-2210', primary: '+2250111097644', secondary: 'Carte inactive', owner: 'Yao Serge', status: 'watch', amount: '0 FCFA', signal: 'Dernier achat J-3', updatedAt: 'Hier', tags: ['inactive'] },
    ],
    actions: [
      { label: 'Rejouer les allocations', description: '17 messages retryables.', tone: 'critical' },
      { label: 'Lire soldes partenaire', description: '23 comptes avec ecart.', tone: 'high' },
      { label: 'Exporter cartes inactives', description: 'Segment support conducteur.', tone: 'low' },
    ],
    timeline: [
      { time: '10:42', title: 'Allocation en erreur', detail: 'Balance reader indisponible.', tone: 'critical' },
      { time: '09:17', title: 'Solde synchronise', detail: 'Aminata Bamba, 18 400 FCFA.', tone: 'healthy' },
      { time: '08:44', title: 'Carte inactive', detail: 'Rappel support requis.', tone: 'medium' },
    ],
  },
  'fuel-finance': {
    key: 'fuel-finance',
    eyebrow: 'Finance control',
    title: 'Finance carburant et rapprochements',
    description:
      'Lecture finance du produit carburant: approvisionnements, paiements conducteur, recharges, frais, soldes exposes et rapprochements.',
    primaryAction: 'Rapprocher le jour',
    secondaryAction: 'Exporter finance',
    metrics: [
      { label: 'Collecte jour', value: '31,6M', delta: 'FCFA', tone: 'healthy' },
      { label: 'Frais estimes', value: '412K', delta: 'FCFA', tone: 'low' },
      { label: 'A rapprocher', value: '14', delta: 'transactions', tone: 'high' },
      { label: 'Funding restant', value: '42,8M', delta: 'FCFA', tone: 'medium' },
    ],
    records: [
      { id: 'FIN-209', primary: 'Paiement Orange Money', secondary: 'paymentLink driver recharge', owner: 'Kone Adama', status: 'pending', amount: '75 000 FCFA', signal: 'Allocation non confirmee', updatedAt: '10:41', tags: ['orange', 'recharge'] },
      { id: 'FIN-208', primary: 'Approvisionnement compagnie', secondary: 'Taxi Union Plateau', owner: 'Finance Ops', status: 'active', amount: '12M FCFA', signal: 'Solde augmente', updatedAt: '09:50', tags: ['supply'] },
      { id: 'FIN-199', primary: 'Rapprochement TotalEnergies', secondary: 'Batch consommations', owner: 'Automation', status: 'watch', amount: '1,25M FCFA', signal: 'Cashback partenaire', updatedAt: 'Hier', tags: ['reconcile'] },
    ],
    actions: [
      { label: 'Bloquer message succes premature', description: 'Attendre allocation confirmee.', tone: 'critical' },
      { label: 'Rapprocher cashback', description: 'Internal operations a classer.', tone: 'medium' },
      { label: 'Exporter audit finance', description: 'Pack quotidien pour finance.', tone: 'low' },
    ],
    timeline: [
      { time: '10:41', title: 'Paiement reussi', detail: 'Notification envoyee avant allocation.', tone: 'high' },
      { time: '09:50', title: 'Funding recu', detail: 'Taxi Union Plateau +12M.', tone: 'healthy' },
      { time: 'Hier', title: 'Rapprochement ouvert', detail: 'Cashback partenaire a confirmer.', tone: 'medium' },
    ],
  },
  incidents: {
    key: 'incidents',
    eyebrow: 'Incident room',
    title: 'Incidents et escalades ops',
    description:
      'Salle de traitement des anomalies: echecs allocation, imports, ecarts soldes, notifications incoherentes et actions de reprise.',
    primaryAction: 'Créer un incident',
    secondaryAction: 'Voir runbook',
    metrics: [
      { label: 'Ouverts', value: '29', delta: '7 critiques', tone: 'critical' },
      { label: 'MTTR', value: '42 min', delta: '-8 min', tone: 'healthy' },
      { label: 'Escalades N2', value: '11', delta: 'support', tone: 'high' },
      { label: 'Resolus jour', value: '36', delta: '+14%', tone: 'healthy' },
    ],
    records: [
      { id: 'INC-318', primary: 'Allocation TotalEnergies echouee', secondary: 'Playwright timeout paiement', owner: 'Support N2', status: 'blocked', amount: '75 000 FCFA', signal: 'Conducteur impacte', updatedAt: '10:42', tags: ['critical'] },
      { id: 'INC-317', primary: 'Import avec cardNumber inconnu', secondary: '9 lignes non rattachees', owner: 'Ops data', status: 'watch', amount: '312 L', signal: 'A mapper', updatedAt: '10:22', tags: ['import'] },
      { id: 'INC-299', primary: 'Notification trop optimiste', secondary: 'Recharge success avant allocation', owner: 'Product Ops', status: 'pending', amount: 'N/A', signal: 'Copy flow', updatedAt: 'Hier', tags: ['notification'] },
    ],
    actions: [
      { label: 'Traiter INC-318', description: 'Impact conducteur immediat.', tone: 'critical' },
      { label: 'Mapper cardNumbers inconnus', description: '9 achats sans owner.', tone: 'high' },
      { label: 'Mettre a jour runbook', description: 'Saga allocation/recharge.', tone: 'medium' },
    ],
    timeline: [
      { time: '10:42', title: 'Incident critique', detail: 'Allocation timeout.', tone: 'critical' },
      { time: '10:22', title: 'Anomalie import', detail: '9 cardNumbers inconnus.', tone: 'high' },
      { time: 'Hier', title: 'Runbook demande', detail: 'Clarifier confirmations conducteur.', tone: 'medium' },
    ],
  },
};
