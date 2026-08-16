import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Checkbox,
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
import { IconAlertTriangle, IconEye, IconReload, IconSearch } from '@tabler/icons-react';

import { getIncidentStats, listIncidents } from '../api/incidents-api';
import type {
  IncidentCategory,
  IncidentRecord,
  IncidentSeverity,
  IncidentStatus,
  ListIncidentsParams,
} from '../types';

/**
 * Seuls les statuts reellement alimentes par le cycle de vie des allocations
 * sont proposes: `mitigated` et `closed` n'ont pas d'equivalent backend.
 */
const statusOptions = [
  { value: 'open', label: 'Ouverts (echec ou en file)' },
  { value: 'investigating', label: 'En cours de traitement' },
  { value: 'resolved', label: 'Resolus' },
];

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '-';

const badgeColorBySeverity: Record<IncidentSeverity, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
};

const badgeColorByStatus: Record<IncidentStatus, string> = {
  open: 'red',
  investigating: 'blue',
  mitigated: 'cyan',
  resolved: 'green',
  closed: 'gray',
};

const badgeColorByCategory: Record<IncidentCategory, string> = {
  'fuel-card-creation': 'cyan',
  'fuel-allocation': 'indigo',
  'balance-diff': 'violet',
  'fuel-purchase': 'pink',
  sync: 'gray',
  support: 'lime',
  other: 'dark',
};

export function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [onlyRetryable, setOnlyRetryable] = useState(false);

  const queryParams: ListIncidentsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search,
      status,
      retryable: onlyRetryable,
    }),
    [onlyRetryable, page, search, status]
  );

  const statsQuery = useQuery({
    queryKey: ['incidents', 'stats'],
    queryFn: async () => {
      const response = await getIncidentStats();
      if (!response.success) {
        throw new Error('Chargement des statistiques incidents impossible.');
      }
      return response.data;
    },
  });

  const incidentsQuery = useQuery({
    queryKey: ['incidents', 'list', queryParams],
    queryFn: async () => {
      const response = await listIncidents(queryParams);
      if (!response.success) {
        throw new Error('Chargement des incidents impossible.');
      }
      return response;
    },
  });

  const stats = statsQuery.data;
  const incidents = incidentsQuery.data?.data?.items ?? [];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Incidents</Title>
        <Text c="dimmed" mt={4}>
          Suivi des allocations de carte carburant : echecs, files d attente et relances.
        </Text>
      </div>

      {statsQuery.isError || incidentsQuery.isError ? (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Chargement des incidents impossible"
        >
          {(incidentsQuery.error ?? statsQuery.error) instanceof Error
            ? (incidentsQuery.error ?? statsQuery.error)?.message
            : 'Le service tiers est injoignable.'}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Ouverts
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.open ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            En cours d investigation
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.investigating ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Critiques
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.critical ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Relancables
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.retryable ?? 0}
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>Liste des incidents</Text>
          <Group gap={4} wrap="nowrap">
            <Checkbox
              label="Relancables uniquement"
              checked={onlyRetryable}
              onChange={(event) => {
                setOnlyRetryable(event.currentTarget.checked);
                setPage(1);
              }}
            />
            <Tooltip label="Rafraichir les incidents">
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  statsQuery.refetch();
                  incidentsQuery.refetch();
                }}
              >
                <IconReload size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Group wrap="wrap">
          <TextInput
            placeholder="Rechercher par reference, conducteur, erreur..."
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
              setStatus((value as IncidentStatus) ?? '');
              setPage(1);
            }}
          />
        </Group>

        <Table.ScrollContainer minWidth={1080} mt="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Severite</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Categorie</Table.Th>
                <Table.Th>Titre</Table.Th>
                <Table.Th>Concerne</Table.Th>
                <Table.Th>Tentatives</Table.Th>
                <Table.Th>Derniere erreur</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {incidents.map((incident: IncidentRecord) => (
                <Table.Tr key={incident.id}>
                  <Table.Td>
                    <Badge color={badgeColorBySeverity[incident.severity]} variant="light">
                      {incident.severity}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByStatus[incident.status]} variant="light">
                      {incident.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByCategory[incident.category]} variant="light">
                      {incident.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={600}>{incident.title}</Text>
                      <Text size="sm" c="dimmed">
                        {incident.summary}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    {incident.driverId ? (
                      <Text component={Link} to={`/drivers/${incident.driverId}`}>
                        {incident.owner ?? 'Driver'}
                      </Text>
                    ) : (
                      incident.owner ?? '-'
                    )}
                  </Table.Td>
                  <Table.Td>{incident.attempts ?? 0}</Table.Td>
                  <Table.Td>
                    <Tooltip label={incident.lastError}>
                      <Text size="sm" lineClamp={2}>
                        {incident.lastError ?? '-'}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>{formatDateTime(incident.occurredAt)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {incident.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} size="sm" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {incident.navigateTo ? (
                        <Tooltip label="Voir le detail">
                          <ActionIcon
                            component={Link}
                            to={incident.navigateTo}
                            variant="subtle"
                            aria-label="Voir le detail"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null}
                      {incident.retryable ? (
                        <Tooltip label="Relancer (vue detaillee des allocations)">
                          <ActionIcon
                            component={Link}
                            to={incident.navigateTo ?? '/cards-balances'}
                            variant="subtle"
                            aria-label="Relancer"
                          >
                            <IconReload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {incidents.length === 0 && !incidentsQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Text c="dimmed">Aucun incident trouve pour ces filtres.</Text>
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
            total={incidentsQuery.data?.data?.totalPages ?? 1}
          />
        </Group>
      </Card>
    </Stack>
  );
}
