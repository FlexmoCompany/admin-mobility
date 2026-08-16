import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Card,
  Group,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconSearch } from '@tabler/icons-react';

import { getFuelFinanceOverview, listFuelFinanceFlows } from '../api/fuel-finance-api';
import type {
  FuelFinanceFlowKind,
  FuelFinanceFlowRecord,
  FuelFinanceFlowStatus,
  ListFuelFinanceFlowsParams,
} from '../types';

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '-';

const badgeColorByStatus: Record<FuelFinanceFlowStatus, string> = {
  pending: 'yellow',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
};

const badgeColorByKind: Record<FuelFinanceFlowKind, string> = {
  'card-purchase': 'indigo',
  discount: 'violet',
  cashback: 'teal',
};

const labelByKind: Record<FuelFinanceFlowKind, string> = {
  'card-purchase': 'Debit carte',
  discount: 'Remise partenaire',
  cashback: 'Cashback conducteur',
};

const kindOptions = (Object.keys(labelByKind) as FuelFinanceFlowKind[]).map((value) => ({
  value,
  label: labelByKind[value],
}));

const statusOptions: Array<{ value: FuelFinanceFlowStatus; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En cours' },
  { value: 'completed', label: 'Termine' },
  { value: 'failed', label: 'Echec' },
  { value: 'cancelled', label: 'Annule' },
];

export function FuelFinancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FuelFinanceFlowStatus | ''>('');
  const [kind, setKind] = useState<FuelFinanceFlowKind | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams: ListFuelFinanceFlowsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search,
      status,
      kind,
      startDate,
      endDate,
    }),
    [endDate, kind, page, search, startDate, status]
  );

  const overviewQuery = useQuery({
    queryKey: ['fuel-finance', 'overview', startDate, endDate],
    queryFn: () => getFuelFinanceOverview({ startDate, endDate }),
  });

  const flowsQuery = useQuery({
    queryKey: ['fuel-finance', 'flows', queryParams],
    queryFn: () => listFuelFinanceFlows(queryParams),
  });

  const overview = overviewQuery.data;
  const flows = flowsQuery.data?.data?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Finance carburant</Title>
        <Text c="dimmed" mt={4}>
          Marge, remises et cashback calcules sur les achats carburant historises.
        </Text>
      </div>

      {overviewQuery.isError || flowsQuery.isError ? (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Donnees finance carburant indisponibles"
        >
          {(overviewQuery.error ?? flowsQuery.error) instanceof Error
            ? (overviewQuery.error ?? flowsQuery.error)?.message
            : 'Le service tiers est injoignable.'}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Montant total achete
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(overview?.totalAmount)}
          </Text>
          <Text size="xs" c="dimmed" mt={8}>
            {overview?.totalTransactions ?? 0} transactions
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Revenu net FlexMo
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(overview?.flexmoRevenueNet)}
          </Text>
          <Tooltip label="Remise partenaire acquise, diminuee du cashback reverse aux conducteurs.">
            <Text size="xs" c="dimmed" mt={8}>
              Remise - cashback
            </Text>
          </Tooltip>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Volume distribue
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {new Intl.NumberFormat('fr-FR').format(overview?.volumeLiters ?? 0)} L
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Achats en attente / en echec
          </Text>
          <Group gap="xs" mt={4} align="baseline">
            <Text fw={800} size="xl">
              {overview?.pendingCount ?? 0}
            </Text>
            <Text c="dimmed">/</Text>
            <Text fw={800} size="xl" c="red">
              {overview?.failedCount ?? 0}
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Text fw={700} mb="sm">
          Detail marge &amp; cashback
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Remise partenaire acquise
            </Text>
            <Text fw={600}>{formatCurrency(overview?.discountGranted)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Cashback conducteurs
            </Text>
            <Text fw={600}>{formatCurrency(overview?.cashbackAccrued)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Marge moyenne par litre
            </Text>
            <Text fw={600}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF',
                maximumFractionDigits: 2,
              }).format(overview?.averageMarginPerLiter ?? 0)}
            </Text>
          </Group>
        </SimpleGrid>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Text fw={700} mb="sm">
          Mouvements financiers carburant
        </Text>
        <Group wrap="wrap">
          <TextInput
            placeholder="Rechercher par station ou reference..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Statut"
            clearable
            data={statusOptions}
            value={status || null}
            onChange={(value) => {
              setStatus((value as FuelFinanceFlowStatus) ?? '');
              setPage(1);
            }}
          />
          <Select
            placeholder="Type de mouvement"
            clearable
            data={kindOptions}
            value={kind || null}
            onChange={(value) => {
              setKind((value as FuelFinanceFlowKind) ?? '');
              setPage(1);
            }}
          />
          <TextInput
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.currentTarget.value);
              setPage(1);
            }}
          />
          <TextInput
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.currentTarget.value);
              setPage(1);
            }}
          />
        </Group>

        <Table.ScrollContainer minWidth={960} mt="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Station</Table.Th>
                <Table.Th>Volume</Table.Th>
                <Table.Th>Montant</Table.Th>
                <Table.Th>Statut</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {flows.map((flow: FuelFinanceFlowRecord) => (
                <Table.Tr key={flow.id}>
                  <Table.Td>{formatDateTime(flow.occurredAt)}</Table.Td>
                  <Table.Td>
                    <Tooltip label={flow.externalRef ?? flow.note}>
                      <Text fw={500}>{flow.reference}</Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByKind[flow.kind]} variant="light">
                      {labelByKind[flow.kind]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{flow.counterparty}</Table.Td>
                  <Table.Td>{flow.station ?? '-'}</Table.Td>
                  <Table.Td>{flow.liters ? `${flow.liters} L` : '-'}</Table.Td>
                  <Table.Td>{formatCurrency(flow.amount)}</Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByStatus[flow.status]} variant="light">
                      {flow.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
              {flows.length === 0 && !flowsQuery.isLoading && !flowsQuery.isError ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed">Aucun achat carburant sur la periode selectionnee.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Group justify="flex-end" mt="md">
          <Pagination
            value={page}
            onChange={setPage}
            total={flowsQuery.data?.data?.totalPages ?? 1}
          />
        </Group>
      </Card>
    </Stack>
  );
}
