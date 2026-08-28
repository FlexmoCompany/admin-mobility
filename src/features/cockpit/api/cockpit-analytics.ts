import { getGlobalAllocationStats } from '@/features/cards-balances/api/fuel-cards-api';
import { listFuelPurchases } from '@/features/fuel/api/fuel-api';
import type { FuelPurchaseRecord } from '@/features/fuel/types';

import type {
  CockpitAllocationSlice,
  CockpitAnalytics,
  CockpitDailyPoint,
  CockpitBreakdownSlice,
} from '../types';

/**
 * Nombre de jours couverts par la courbe de volume.
 *
 * Deux semaines : assez pour lire une tendance sur un graphe de la largeur
 * d'une carte, assez court pour tenir dans une seule page de resultats.
 */
export const ANALYTICS_WINDOW_DAYS = 14;

/**
 * Plafond de lignes ramenees pour construire les agregats.
 *
 * Le service n'expose pas d'endpoint de serie temporelle : la courbe est
 * calculee a partir des achats eux-memes. Au-dela de ce plafond, les
 * graphiques ne portent plus sur toute la periode — `truncated` le signale,
 * et l'interface le dit plutot que d'afficher une courbe fausse.
 */
const MAX_ROWS = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` en heure locale : `toISOString()` decalerait d'un jour. */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const shortLabel = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);

/** Bornes de la fenetre, du jour le plus ancien a aujourd'hui inclus. */
export const analyticsRange = (days = ANALYTICS_WINDOW_DAYS) => {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * DAY_MS);

  return { startDate: isoDay(start), endDate: isoDay(end) };
};

/**
 * Un point par jour, y compris les jours sans achat.
 *
 * Ne garder que les jours servis par le backend produirait une courbe qui
 * saute les creux : un dimanche sans transaction se lirait comme la
 * continuite du samedi au lundi.
 */
const emptySeries = (days: number): CockpitDailyPoint[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - 1 - index) * DAY_MS);
    return { date: isoDay(date), label: shortLabel(date), liters: 0, amount: 0, transactions: 0 };
  });
};

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

/** Le montant reellement facture au conducteur, au prix FlexMo. */
const purchaseAmount = (purchase: FuelPurchaseRecord) =>
  purchase.totalAmount ?? (purchase.liters ?? 0) * (purchase.flexmoPricePerLiter ?? 0);

const topSlices = (
  counters: Map<string, { liters: number; amount: number; transactions: number }>,
  limit: number
): CockpitBreakdownSlice[] =>
  [...counters.entries()]
    .map(([name, totals]) => ({
      name,
      liters: round(totals.liters),
      amount: Math.round(totals.amount),
      transactions: totals.transactions,
    }))
    .sort((a, b) => b.liters - a.liters)
    .slice(0, limit);

/**
 * Agregats du cockpit, calcules a partir des achats de la fenetre.
 *
 * Une seule requete alimente les trois graphiques : refaire un appel par
 * graphique donnerait trois vues de la meme periode susceptibles de ne pas
 * concorder si un achat tombe entre deux.
 */
export async function getCockpitAnalytics(
  days = ANALYTICS_WINDOW_DAYS
): Promise<CockpitAnalytics> {
  const { startDate, endDate } = analyticsRange(days);

  const [purchases, allocations] = await Promise.all([
    listFuelPurchases({ page: 1, limit: MAX_ROWS, startDate, endDate }),
    getGlobalAllocationStats(),
  ]);

  const rows = purchases.data ?? [];
  const total = purchases.pagination?.total ?? rows.length;

  const series = emptySeries(days);
  const byDay = new Map(series.map((point) => [point.date, point]));
  const byStation = new Map<string, { liters: number; amount: number; transactions: number }>();
  const byProduct = new Map<string, { liters: number; amount: number; transactions: number }>();

  const bump = (
    counters: Map<string, { liters: number; amount: number; transactions: number }>,
    key: string,
    liters: number,
    amount: number
  ) => {
    const current = counters.get(key) ?? { liters: 0, amount: 0, transactions: 0 };
    current.liters += liters;
    current.amount += amount;
    current.transactions += 1;
    counters.set(key, current);
  };

  for (const purchase of rows) {
    const liters = purchase.liters ?? purchase.volume ?? 0;
    const amount = purchaseAmount(purchase);

    if (purchase.date) {
      const point = byDay.get(isoDay(new Date(purchase.date)));
      if (point) {
        point.liters += liters;
        point.amount += amount;
        point.transactions += 1;
      }
    }

    bump(byStation, purchase.station || 'Station inconnue', liters, amount);
    bump(byProduct, purchase.product || 'Produit non renseigne', liters, amount);
  }

  for (const point of series) {
    point.liters = round(point.liters);
    point.amount = Math.round(point.amount);
  }

  const stats = allocations.data;
  const allocationSlices: CockpitAllocationSlice[] = [
    { name: 'Abouties', value: stats?.success ?? 0, color: 'teal.6' },
    { name: 'En file', value: stats?.queued ?? 0, color: 'blue.5' },
    { name: 'En cours', value: stats?.processing ?? 0, color: 'yellow.6' },
    { name: 'En echec', value: stats?.failed ?? 0, color: 'red.6' },
  ].filter((slice) => slice.value > 0);

  return {
    windowDays: days,
    startDate,
    endDate,
    series,
    stations: topSlices(byStation, 6),
    products: topSlices(byProduct, 5),
    allocations: allocationSlices,
    totalPurchases: total,
    // Le backend a renvoye plus de lignes que la page ne peut en porter :
    // les graphiques ne couvrent alors qu'une partie de la periode.
    truncated: total > rows.length,
  };
}
