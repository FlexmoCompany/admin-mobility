import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCreditCard,
  IconFilterOff,
  IconSearch,
  IconWallet,
} from '@tabler/icons-react';

import {
  getRechargeAllocationSummary,
  listAllocations,
  listRecharges,
} from '../api/recharges-allocations-api';
import type {
  AllocationRow,
  AllocationSource,
  AllocationStatus,
  DriverRef,
  ListResponse,
  RechargeRow,
  RechargeStatus,
} from '../types';

type TabKey = 'recharges' | 'allocations';

const PAGE_SIZE = 20;

const money = (value?: number | null) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(value ?? 0)
    .replace(/ /g, ' ');

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';

export const rechargeStatusLabel: Record<RechargeStatus, { label: string; color: string }> = {
  successful: { label: 'Payée', color: 'green' },
  pending: { label: 'En attente', color: 'yellow' },
  processing: { label: 'En cours', color: 'blue' },
  created: { label: 'Créée', color: 'gray' },
  action_required: { label: 'Action requise', color: 'orange' },
  failed: { label: 'Échouée', color: 'red' },
  canceled: { label: 'Annulée', color: 'gray' },
};

export const allocationStatusLabel: Record<AllocationStatus, { label: string; color: string }> = {
  success: { label: 'Allouée', color: 'green' },
  queued: { label: 'Programmée', color: 'yellow' },
  processing: { label: 'En cours', color: 'blue' },
  failed: { label: 'Échouée', color: 'red' },
};

export const allocationSourceLabel: Record<string, string> = {
  'driver-recharge': 'Recharge Wave',
  replay: 'Rejeu recharge',
  'bonus-payout': 'Bonus objectif',
  correction: 'Correction',
  admin: 'Admin / flotte',
  manual: 'Manuelle',
};

/** Pourquoi une allocation n'a pas de recharge (quand c'est normal). */
const noRechargeReason = (source: AllocationSource) =>
  source === 'bonus-payout'
    ? 'Pas de recharge : bonus objectif'
    : source === 'correction'
      ? 'Pas de recharge : correction'
      : 'Pas de recharge : allocation directe';

const rechargeStatusOptions = (Object.keys(rechargeStatusLabel) as RechargeStatus[]).map((value) => ({
  value,
  label: rechargeStatusLabel[value].label,
}));
const allocationStatusOptions = (Object.keys(allocationStatusLabel) as AllocationStatus[]).map((value) => ({
  value,
  label: allocationStatusLabel[value].label,
}));
const sourceOptions = Object.entries(allocationSourceLabel).map(([value, label]) => ({ value, label }));

function StatusBadge({ map, status }: { map: Record<string, { label: string; color: string }>; status: string }) {
  const s = map[status] ?? { label: status, color: 'gray' };
  return (
    <Badge color={s.color} variant="light">
      {s.label}
    </Badge>
  );
}

function DriverCell({ driver }: { driver: DriverRef | null }) {
  if (!driver) return <Text c="dimmed">—</Text>;
  return (
    <Stack gap={0}>
      <Text size="sm" fw={600}>
        {driver.name ?? `Chauffeur …${driver.id.slice(-6)}`}
      </Text>
      {driver.phoneNumber ? (
        <Text size="xs" c="dimmed">
          {driver.phoneNumber}
        </Text>
      ) : null}
    </Stack>
  );
}

/** Ligne liée : cliquable, ouvre l'autre onglet filtré sur cette ligne. */
function LinkedCell({
  onOpen,
  title,
  subtitle,
  testId,
}: {
  onOpen: () => void;
  title: ReactNode;
  subtitle: ReactNode;
  testId: string;
}) {
  return (
    <UnstyledButton onClick={onOpen} data-testid={testId} aria-label="Voir la ligne liée">
      <Group gap={6} wrap="nowrap">
        <Stack gap={0}>
          {title}
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
        <IconArrowRight size={14} color="var(--mantine-color-blue-6)" />
      </Group>
    </UnstyledButton>
  );
}

function Anomaly({ children }: { children: ReactNode }) {
  return (
    <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
      {children}
    </Badge>
  );
}

interface Filters {
  search: string;
  status: string;
  source: string;
  from: string;
  to: string;
}

const emptyFilters: Filters = { search: '', status: '', source: '', from: '', to: '' };

function FilterBar({
  tab,
  filters,
  onChange,
}: {
  tab: TabKey;
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
}) {
  return (
    <Group wrap="wrap" gap="sm">
      <TextInput
        placeholder={tab === 'recharges' ? 'Chauffeur, téléphone, référence…' : 'Chauffeur, téléphone, erreur…'}
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => onChange({ search: e.currentTarget.value })}
        w={260}
      />
      <Select
        placeholder="Statut"
        clearable
        data={tab === 'recharges' ? rechargeStatusOptions : allocationStatusOptions}
        value={filters.status || null}
        onChange={(v) => onChange({ status: v ?? '' })}
        w={170}
      />
      {tab === 'allocations' ? (
        <Select
          placeholder="Origine"
          clearable
          data={sourceOptions}
          value={filters.source || null}
          onChange={(v) => onChange({ source: v ?? '' })}
          w={180}
        />
      ) : null}
      <TextInput type="date" aria-label="Du" value={filters.from} onChange={(e) => onChange({ from: e.currentTarget.value })} />
      <TextInput type="date" aria-label="Au" value={filters.to} onChange={(e) => onChange({ to: e.currentTarget.value })} />
    </Group>
  );
}

function RechargesTable({ rows, onOpenAllocation }: { rows: RechargeRow[]; onOpenAllocation: (id: string) => void }) {
  return (
    <Table striped highlightOnHover data-testid="recharges-table">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Date</Table.Th>
          <Table.Th>Référence Wave</Table.Th>
          <Table.Th>Chauffeur</Table.Th>
          <Table.Th>Montant</Table.Th>
          <Table.Th>Paiement</Table.Th>
          <Table.Th>Allocation liée</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((r) => (
          <Table.Tr key={r.id}>
            <Table.Td>{dateTime(r.createdAt)}</Table.Td>
            <Table.Td>
              <Text size="sm" ff="monospace">
                {r.reference ?? r.id}
              </Text>
            </Table.Td>
            <Table.Td>
              <DriverCell driver={r.driver} />
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={600}>
                {money(r.amount)}
              </Text>
              {r.fee ? (
                <Text size="xs" c="dimmed">
                  + {money(r.fee)} de frais
                </Text>
              ) : null}
            </Table.Td>
            <Table.Td>
              <Tooltip label={r.failure} disabled={!r.failure}>
                <span>
                  <StatusBadge map={rechargeStatusLabel} status={r.status} />
                </span>
              </Tooltip>
            </Table.Td>
            <Table.Td>
              {r.allocation ? (
                <LinkedCell
                  testId={`open-allocation-${r.allocation.id}`}
                  onOpen={() => onOpenAllocation(r.allocation!.id)}
                  title={
                    <Group gap={6} wrap="nowrap">
                      <StatusBadge map={allocationStatusLabel} status={r.allocation.status} />
                      <Text size="sm" fw={600}>
                        {money(r.allocation.amount)}
                      </Text>
                    </Group>
                  }
                  subtitle={
                    r.allocation.bonusAmount
                      ? `dont ${money(r.allocation.bonusAmount)} de bonus de bienvenue`
                      : dateTime(r.allocation.processedAt ?? r.allocation.scheduledFor)
                  }
                />
              ) : r.link === 'missing' ? (
                <Anomaly>Aucune allocation</Anomaly>
              ) : (
                <Text size="sm" c="dimmed">
                  Pas d'allocation (paiement non abouti)
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function AllocationsTable({ rows, onOpenRecharge }: { rows: AllocationRow[]; onOpenRecharge: (id: string) => void }) {
  return (
    <Table striped highlightOnHover data-testid="allocations-table">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Date</Table.Th>
          <Table.Th>Origine</Table.Th>
          <Table.Th>Chauffeur</Table.Th>
          <Table.Th>Montant</Table.Th>
          <Table.Th>TotalEnergies</Table.Th>
          <Table.Th>Recharge liée</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((a) => (
          <Table.Tr key={a.id}>
            <Table.Td>{dateTime(a.createdAt)}</Table.Td>
            <Table.Td>
              <Badge variant="outline" color="gray">
                {allocationSourceLabel[a.source] ?? a.source}
              </Badge>
            </Table.Td>
            <Table.Td>
              <DriverCell driver={a.driver} />
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={600}>
                {money(a.amount)}
              </Text>
              {a.bonusAmount ? (
                <Text size="xs" c="dimmed">
                  dont {money(a.bonusAmount)} de bonus
                </Text>
              ) : null}
            </Table.Td>
            <Table.Td>
              <Tooltip label={a.lastError} disabled={!a.lastError} multiline w={320}>
                <span>
                  <StatusBadge map={allocationStatusLabel} status={a.status} />
                </span>
              </Tooltip>
              <Text size="xs" c="dimmed" mt={2}>
                {a.status === 'queued'
                  ? `prévue ${dateTime(a.scheduledFor)}`
                  : a.processedAt
                    ? dateTime(a.processedAt)
                    : a.attempts
                      ? `${a.attempts} tentative(s)`
                      : ''}
              </Text>
            </Table.Td>
            <Table.Td>
              {a.recharge ? (
                <LinkedCell
                  testId={`open-recharge-${a.recharge.id}`}
                  onOpen={() => onOpenRecharge(a.recharge!.id)}
                  title={
                    <Group gap={6} wrap="nowrap">
                      <StatusBadge map={rechargeStatusLabel} status={a.recharge.status} />
                      <Text size="sm" fw={600}>
                        {money(a.recharge.amount)}
                      </Text>
                    </Group>
                  }
                  subtitle={a.recharge.reference ?? dateTime(a.recharge.createdAt)}
                />
              ) : a.link === 'missing' ? (
                <Anomaly>Recharge introuvable</Anomaly>
              ) : (
                <Text size="sm" c="dimmed">
                  {noRechargeReason(a.source)}
                </Text>
              )}
            </Table.Td>
            <Table.Td>
              {a.accountId ? (
                <Tooltip label="Carte et soldes du chauffeur">
                  <Anchor component={Link} to={`/cards-balances/${a.accountId}`} aria-label="Voir la carte">
                    <IconCreditCard size={18} />
                  </Anchor>
                </Tooltip>
              ) : null}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function SummaryCards() {
  const q = useQuery({ queryKey: ['recharge-allocation', 'summary'], queryFn: getRechargeAllocationSummary, refetchInterval: 60_000 });
  const s = q.data;
  const r = s?.recharges ?? {};
  const a = s?.allocations ?? {};
  const anomalies = (s?.anomalies.rechargesWithoutAllocation ?? 0) + (s?.anomalies.allocationsWithoutRecharge ?? 0);
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" data-testid="ra-summary">
      <Card withBorder radius="md" padding="lg">
        <Text size="xs" c="dimmed" fw={700}>
          Recharges Wave payées
        </Text>
        <Text fw={800} size="xl" mt={4}>
          {money(r.successful?.amount)}
        </Text>
        <Text size="xs" c="dimmed" mt={8}>
          {r.successful?.count ?? 0} recharge(s) · {(r.pending?.count ?? 0) + (r.processing?.count ?? 0)} en attente ·{' '}
          {r.failed?.count ?? 0} échouée(s)
        </Text>
      </Card>
      <Card withBorder radius="md" padding="lg">
        <Text size="xs" c="dimmed" fw={700}>
          Allocations TotalEnergies faites
        </Text>
        <Text fw={800} size="xl" mt={4}>
          {money(a.success?.amount)}
        </Text>
        <Text size="xs" c="dimmed" mt={8}>
          {a.success?.count ?? 0} allocation(s), bonus compris
        </Text>
      </Card>
      <Card withBorder radius="md" padding="lg">
        <Text size="xs" c="dimmed" fw={700}>
          Allocations programmées / échouées
        </Text>
        <Group gap="xs" mt={4} align="baseline">
          <Text fw={800} size="xl">
            {(a.queued?.count ?? 0) + (a.processing?.count ?? 0)}
          </Text>
          <Text c="dimmed">/</Text>
          <Text fw={800} size="xl" c={a.failed?.count ? 'red' : undefined}>
            {a.failed?.count ?? 0}
          </Text>
        </Group>
      </Card>
      <Card withBorder radius="md" padding="lg" style={anomalies ? { borderColor: 'var(--mantine-color-red-6)' } : undefined}>
        <Text size="xs" c="dimmed" fw={700}>
          Lignes sans contrepartie
        </Text>
        <Text fw={800} size="xl" mt={4} c={anomalies ? 'red' : 'green'}>
          {anomalies}
        </Text>
        <Text size="xs" c="dimmed" mt={8}>
          {s?.anomalies.rechargesWithoutAllocation ?? 0} recharge(s) sans allocation ·{' '}
          {s?.anomalies.allocationsWithoutRecharge ?? 0} allocation(s) sans recharge
        </Text>
      </Card>
    </SimpleGrid>
  );
}

export function RechargesAllocationsPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('tab') === 'allocations' ? 'allocations' : 'recharges';
  const focusId = params.get('id') ?? '';
  const [filters, setFilters] = useState<Record<TabKey, Filters>>({ recharges: emptyFilters, allocations: emptyFilters });
  const [pages, setPages] = useState<Record<TabKey, number>>({ recharges: 1, allocations: 1 });

  const go = (next: TabKey, id?: string) => {
    const p = new URLSearchParams();
    p.set('tab', next);
    if (id) p.set('id', id);
    setParams(p);
  };

  const current = filters[tab];
  const query = useMemo(
    () =>
      focusId
        ? { id: focusId, page: 1, limit: PAGE_SIZE }
        : {
            page: pages[tab],
            limit: PAGE_SIZE,
            search: current.search.trim(),
            status: current.status,
            from: current.from,
            to: current.to,
            ...(tab === 'allocations' ? { source: current.source } : {}),
          },
    [current, focusId, pages, tab]
  );

  const listQuery = useQuery({
    queryKey: ['recharge-allocation', tab, query],
    queryFn: (): Promise<ListResponse<RechargeRow | AllocationRow>> =>
      tab === 'recharges' ? listRecharges(query) : listAllocations(query),
    refetchInterval: 60_000,
  });

  const items = listQuery.data?.data.items ?? [];
  const pagination = listQuery.data?.data.pagination;

  const updateFilters = (next: Partial<Filters>) => {
    setFilters((f) => ({ ...f, [tab]: { ...f[tab], ...next } }));
    setPages((p) => ({ ...p, [tab]: 1 }));
    if (focusId) go(tab);
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Rechargement &amp; Allocations</Title>
        <Text c="dimmed" mt={4}>
          Chaque recharge Wave payée crée une allocation sur la carte TotalEnergies du chauffeur. Cliquez sur la ligne
          liée pour passer de l'une à l'autre.
        </Text>
      </div>

      <SummaryCards />

      <Card withBorder radius="md" padding="lg">
        <Tabs value={tab} onChange={(v) => v && go(v as TabKey)} keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="recharges" leftSection={<IconWallet size={16} />}>
              Rechargement (Wave)
            </Tabs.Tab>
            <Tabs.Tab value="allocations" leftSection={<IconCreditCard size={16} />}>
              Allocation (TotalEnergies)
            </Tabs.Tab>
          </Tabs.List>

          <Stack gap="md">
            {focusId ? (
              <Alert color="blue" variant="light" data-testid="focus-banner">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm">
                    {tab === 'recharges' ? 'Recharge liée à l’allocation sélectionnée.' : 'Allocation liée à la recharge sélectionnée.'}
                  </Text>
                  <Button size="xs" variant="subtle" leftSection={<IconFilterOff size={14} />} onClick={() => go(tab)}>
                    Voir toutes les lignes
                  </Button>
                </Group>
              </Alert>
            ) : (
              <FilterBar tab={tab} filters={current} onChange={updateFilters} />
            )}

            {listQuery.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Données indisponibles">
                {listQuery.error instanceof Error ? listQuery.error.message : 'finance-service injoignable.'}
              </Alert>
            ) : null}

            <Table.ScrollContainer minWidth={980}>
              {tab === 'recharges' ? (
                <RechargesTable rows={items as RechargeRow[]} onOpenAllocation={(id) => go('allocations', id)} />
              ) : (
                <AllocationsTable rows={items as AllocationRow[]} onOpenRecharge={(id) => go('recharges', id)} />
              )}
            </Table.ScrollContainer>

            {items.length === 0 && !listQuery.isLoading && !listQuery.isError ? (
              <Text c="dimmed" ta="center" py="lg">
                Aucune ligne pour ces filtres.
              </Text>
            ) : null}

            {pagination && pagination.totalPages > 1 && !focusId ? (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {pagination.total} ligne(s)
                </Text>
                <Pagination
                  total={pagination.totalPages}
                  value={pagination.page}
                  onChange={(page) => setPages((p) => ({ ...p, [tab]: page }))}
                />
              </Group>
            ) : null}
          </Stack>
        </Tabs>
      </Card>
    </Stack>
  );
}
