import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
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
import {
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconReload,
  IconSearch,
} from '@tabler/icons-react';

import { getCockpitSummary, listCockpitSignals } from '../api/cockpit-api';
import type {
  CockpitAction,
  CockpitSignalKind,
  CockpitSignalTone,
  ListCockpitSignalsParams,
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

const badgeColorByTone: Record<CockpitSignalTone, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
  healthy: 'green',
};

const badgeColorByKind: Record<CockpitSignalKind, string> = {
  allocation: 'indigo',
  'fuel-card': 'cyan',
  driver: 'teal',
  'fuel-purchase': 'violet',
  recharge: 'pink',
  sync: 'gray',
};

const DEFAULT_ACTIONS: CockpitAction[] = [
  {
    id: 'cards-balances',
    label: 'Cartes & soldes',
    description: 'Suivre les allocations et rechargements carburant.',
    tone: 'high',
    navigateTo: '/cards-balances',
  },
  {
    id: 'drivers',
    label: 'Conducteurs',
    description: 'Verifier les statuts creation carte TotalEnergies.',
    tone: 'medium',
    navigateTo: '/drivers',
  },
  {
    id: 'fuel',
    label: 'Achats carburant',
    description: 'Lister les achats en attente ou incomplets.',
    tone: 'low',
    navigateTo: '/fuel',
  },
  {
    id: 'fuel-finance',
    label: 'Finance carburant',
    description: 'Flux financiers FlexMo vs TotalEnergies.',
    tone: 'medium',
    navigateTo: '/fuel-finance',
  },
  {
    id: 'incidents',
    label: 'Incidents',
    description: 'Anomalies et supports operatifs.',
    tone: 'critical',
    navigateTo: '/incidents',
  },
];

export function CockpitPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tone, setTone] = useState<CockpitSignalTone | ''>('');
  const [kind, setKind] = useState<CockpitSignalKind | ''>('');

  const queryParams: ListCockpitSignalsParams = useMemo(
    () => ({
      page,
      limit: 10,
      search,
      tone,
      kind,
    }),
    [kind, page, search, tone]
  );

  const signalsQuery = useQuery({
    queryKey: ['cockpit', 'signals', queryParams],
    queryFn: async () => {
      const response = await listCockpitSignals(queryParams);
      if (!response.success) {
        throw new Error('Chargement des signaux cockpit impossible.');
      }
      return response;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['cockpit', 'summary'],
    queryFn: getCockpitSummary,
  });

  const signals = signalsQuery.data?.data?.items ?? [];
  const summary = summaryQuery.data;

  const actions: CockpitAction[] = DEFAULT_ACTIONS.map((action) => {
    if (action.id === 'cards-balances') {
      return { ...action, count: summary?.pendingAllocations };
    }
    if (action.id === 'drivers') {
      return {
        ...action,
        count: (summary?.failedAllocations ?? 0) + (summary?.queuedAllocations ?? 0),
      };
    }
    if (action.id === 'fuel') {
      return { ...action, count: summary?.pendingPurchases };
    }
    if (action.id === 'incidents') {
      return {
        ...action,
        count: (summary?.balanceDiffCount ?? 0) + (summary?.failedAllocations ?? 0),
      };
    }
    return action;
  });

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Cockpit</Title>
        <Text c="dimmed" mt={4}>
          Vue operationnelle des signaux carburant, conducteurs et allocations.
        </Text>
      </div>

      {summaryQuery.isError || signalsQuery.isError ? (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Indicateurs cockpit indisponibles"
        >
          {(summaryQuery.error ?? signalsQuery.error) instanceof Error
            ? (summaryQuery.error ?? signalsQuery.error)?.message
            : 'Les services tiers et finance sont injoignables.'}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Conducteurs actifs
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {summary?.activeDrivers ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cartes actives
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {summary?.activeCards ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Allocations en attente
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {summary?.pendingAllocations ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Ecarts de solde
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {summary?.balanceDiffCount ?? 0}
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" mb="sm">
            <Text fw={700}>Actions rapides</Text>
            <Tooltip label="Rafraichir les indicateurs">
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  summaryQuery.refetch();
                  signalsQuery.refetch();
                }}
              >
                <IconReload size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Stack gap="sm">
            {actions.map((action) =>
              action.navigateTo ? (
                <Card
                  key={action.id}
                  withBorder
                  padding="md"
                  radius="sm"
                  component={Link}
                  to={action.navigateTo}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group gap={8} wrap="nowrap">
                        <Badge color={badgeColorByTone[action.tone]} variant="light">
                          {action.label}
                        </Badge>
                        {action.count !== undefined ? (
                          <Text size="sm" fw={600} c="dimmed">
                            {action.count} element(s)
                          </Text>
                        ) : null}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {action.description}
                      </Text>
                    </Stack>
                    <ActionIcon
                      variant="light"
                      color={badgeColorByTone[action.tone]}
                      size="sm"
                      component="div"
                    >
                      <IconArrowRight size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ) : (
                <Card
                  key={action.id}
                  withBorder
                  padding="md"
                  radius="sm"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group gap={8} wrap="nowrap">
                        <Badge color={badgeColorByTone[action.tone]} variant="light">
                          {action.label}
                        </Badge>
                        {action.count !== undefined ? (
                          <Text size="sm" fw={600} c="dimmed">
                            {action.count} element(s)
                          </Text>
                        ) : null}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {action.description}
                      </Text>
                    </Stack>
                    <ActionIcon
                      variant="light"
                      color={badgeColorByTone[action.tone]}
                      size="sm"
                    >
                      <IconArrowRight size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              )
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={700} mb="sm">
            Complement de volume
          </Text>
          <Stack gap="md">
            <div>
              <Text size="xs" c="dimmed" fw={700}>
                Volume du jour
              </Text>
              <Text fw={800} size="xl" mt={4}>
                {summary?.totalLitersToday ?? 0} L
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={700}>
                Allocations en echec
              </Text>
              <Group justify="space-between">
                <Text fw={800} size="xl" mt={4}>
                  {summary?.failedAllocations ?? 0}
                </Text>
                <Button
                  component={Link}
                  to="/incidents"
                  size="xs"
                  variant="subtle"
                  rightSection={<IconEye size={14} />}
                >
                  Lister
                </Button>
              </Group>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={700}>
                Allocations en file d attente
              </Text>
              <Text fw={800} size="xl" mt={4}>
                {summary?.queuedAllocations ?? 0}
              </Text>
            </div>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>Signaux operatifs</Text>
          <Text size="xs" c="dimmed">
            {signalsQuery.data?.data?.total ?? signals.length} signaux
          </Text>
        </Group>
        <Group wrap="wrap">
          <TextInput
            placeholder="Rechercher dans les signaux..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <TextInput
            placeholder="Criticite (critical/high/medium/low/healthy)"
            value={tone}
            onChange={(event) => {
              setTone((event.currentTarget.value as CockpitSignalTone | '') ?? '');
              setPage(1);
            }}
          />
          <TextInput
            placeholder="Type (allocation/fuel-card/driver/fuel-purchase/recharge/sync)"
            value={kind}
            onChange={(event) => {
              setKind((event.currentTarget.value as CockpitSignalKind | '') ?? '');
              setPage(1);
            }}
          />
        </Group>

        <Table.ScrollContainer minWidth={1080} mt="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ton</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Titre</Table.Th>
                <Table.Th>Proprietaire</Table.Th>
                <Table.Th>Montant</Table.Th>
                <Table.Th>Signal</Table.Th>
                <Table.Th>Mise a jour</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {signals.map((signal) => (
                <Table.Tr key={signal.id}>
                  <Table.Td>
                    <Badge color={badgeColorByTone[signal.tone]} variant="light">
                      {signal.tone}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByKind[signal.kind]} variant="light">
                      {signal.kind}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={600}>{signal.title}</Text>
                      <Text size="sm" c="dimmed">
                        {signal.subtitle}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>{signal.owner}</Table.Td>
                  <Table.Td>
                    {signal.amountLabel.includes('FCFA') ? formatCurrency(
                      Number(signal.amountLabel.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
                    ) : signal.amountLabel}
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={signal.signal}>
                      <Text size="sm" lineClamp={2}>
                        {signal.signal}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>{formatDateTime(signal.updatedAt)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {signal.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} size="sm" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {signal.navigateTo ? (
                        <Tooltip label="Ouvrir le detail">
                          <ActionIcon
                            component={Link}
                            to={signal.navigateTo}
                            variant="subtle"
                            aria-label="Voir le detail"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null}
                      {signal.retryable ? (
                        <Tooltip label="Relancer (disponible depuis la liste dediee)">
                          <ActionIcon component={Link} to={signal.navigateTo ?? '/cards-balances'} variant="subtle" aria-label="Relancer">
                            <IconReload size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : null}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {signals.length === 0 && !signalsQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed">Aucun signal operatif trouve.</Text>
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
            total={signalsQuery.data?.data?.totalPages ?? 1}
          />
        </Group>
      </Card>
    </Stack>
  );
}
