import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Pagination,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  Title,
} from '@mantine/core';
import { IconEye, IconSearch } from '@tabler/icons-react';

import { getFuelPurchaseStatistics, listFuelPurchases } from '../api/fuel-api';
import type { FuelPurchaseStatus, ListFuelPurchasesParams } from '../types';

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

const badgeColorByStatus: Record<FuelPurchaseStatus, string> = {
  pending: 'yellow',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export function FuelPurchasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [station, setStation] = useState('');
  const [status, setStatus] = useState<'' | FuelPurchaseStatus>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams: ListFuelPurchasesParams = useMemo(
    () => ({
      page,
      limit: 10,
      search,
      station,
      status,
      startDate,
      endDate,
    }),
    [endDate, page, search, startDate, station, status]
  );

  const purchasesQuery = useQuery({
    queryKey: ['fuel', 'purchases', queryParams],
    queryFn: async () => {
      const response = await listFuelPurchases(queryParams);
      if (!response.success) {
        throw new Error('Chargement des achats carburant impossible.');
      }
      return response;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['fuel', 'statistics', { search, station, status, startDate, endDate }],
    queryFn: async () => {
      const response = await getFuelPurchaseStatistics({ search, station, status, startDate, endDate });
      if (!response.success) {
        throw new Error('Chargement des statistiques carburant impossible.');
      }
      return response.data;
    },
  });

  const purchases = purchasesQuery.data?.data ?? [];
  const pagination = purchasesQuery.data?.pagination;
  const stats = statsQuery.data;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Carburants</Title>
        <Text c="dimmed" mt={4}>
          Suivi operationnel des achats carburant, volumes et remises.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Montant total
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(stats?.totalVolume)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Volume total
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.totalLiters ?? 0} L
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Remise totale
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(stats?.totalDiscount)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Transactions + taux de succes
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.totalTransactions ?? 0}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {stats?.successRate ?? 0}% de succes
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
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
          <TextInput
            placeholder="Station"
            value={station}
            onChange={(event) => {
              setStation(event.currentTarget.value);
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
          <TextInput
            placeholder="Statut"
            value={status}
            onChange={(event) => {
              setStatus((event.currentTarget.value as FuelPurchaseStatus | '') ?? '');
              setPage(1);
            }}
          />
        </Group>

        <Table.ScrollContainer minWidth={1080} mt="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Station</Table.Th>
                <Table.Th>Produit</Table.Th>
                <Table.Th>Litres</Table.Th>
                <Table.Th>Prix unitaire</Table.Th>
                <Table.Th>Montant total</Table.Th>
                <Table.Th>Cashback</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {purchases.map((purchase) => (
                <Table.Tr key={purchase.id}>
                  <Table.Td>{formatDateTime(purchase.date)}</Table.Td>
                  <Table.Td>
                    {purchase.driver?._id ? (
                      <Text component={Link} to={`/drivers/${purchase.driver._id}`}>
                        {purchase.driver?.name || '-'}
                      </Text>
                    ) : (
                      purchase.driver?.name || '-'
                    )}
                  </Table.Td>
                  <Table.Td>{purchase.station || '-'}</Table.Td>
                  <Table.Td>{purchase.product || '-'}</Table.Td>
                  <Table.Td>{purchase.volume ?? purchase.liters ?? 0}</Table.Td>
                  <Table.Td>{formatCurrency(purchase.unitPrice)}</Table.Td>
                  <Table.Td>{formatCurrency(purchase.totalAmount)}</Table.Td>
                  <Table.Td>{formatCurrency(purchase.driverCashback)}</Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByStatus[purchase.status ?? 'pending']} variant="light">
                      {purchase.status ?? 'pending'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{purchase.source || '-'}</Table.Td>
                  <Table.Td>{purchase.reference || '-'}</Table.Td>
                  <Table.Td>
                    <Tooltip label="Voir le detail de l achat">
                      <ActionIcon component={Link} to={`/fuel/${purchase.id}`} variant="subtle">
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
              {purchases.length === 0 && !purchasesQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={12}>
                    <Text c="dimmed">Aucun achat carburant trouve.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {pagination ? (
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Page {pagination.page} / {pagination.totalPages || 1} ({pagination.total} achats)
            </Text>
            <Pagination value={page} onChange={setPage} total={pagination.totalPages || 1} />
          </Group>
        ) : null}
      </Card>
    </Stack>
  );
}

