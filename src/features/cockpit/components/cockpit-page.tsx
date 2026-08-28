import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Progress,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
} from '@mantine/core';
import { AreaChart, DonutChart } from '@mantine/charts';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCreditCard,
  IconEye,
  IconGasStation,
  IconReload,
  IconScale,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';

import { getCockpitSummary, listCockpitSignals } from '../api/cockpit-api';
import { ANALYTICS_WINDOW_DAYS, getCockpitAnalytics } from '../api/cockpit-analytics';
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

const formatNumber = (value?: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(value ?? 0);

const formatCompactCurrency = (value?: number) =>
  `${new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value ?? 0
  )} F`;

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  color: string;
  /** Part representee, quand elle a un sens : 0 a 100. */
  ratio?: number;
}

/**
 * Indicateur du bandeau.
 *
 * Un nombre seul ne se lit pas : 10 conducteurs actifs est bon sur 12,
 * mauvais sur 400. L'anneau porte la proportion quand le rapport existe,
 * et disparait quand il n'existe pas plutot que d'en inventer un.
 */
function Metric({ label, value, hint, icon, color, ratio }: MetricProps) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {label}
          </Text>
          <Text fw={800} size="1.75rem" lh={1.1}>
            {value}
          </Text>
          {hint ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {hint}
            </Text>
          ) : null}
        </Stack>

        {ratio === undefined ? (
          <ThemeIcon variant="light" color={color} size={42} radius="md">
            {icon}
          </ThemeIcon>
        ) : (
          <RingProgress
            size={62}
            thickness={6}
            roundCaps
            sections={[{ value: Math.min(100, Math.max(0, ratio)), color }]}
            label={
              <Center>
                <ThemeIcon variant="light" color={color} size={26} radius="xl">
                  {icon}
                </ThemeIcon>
              </Center>
            }
          />
        )}
      </Group>
    </Card>
  );
}

/**
 * Les valeurs proposees sont celles que le backend sait traiter : seul
 * `allocation` produit des signaux aujourd'hui, les autres types sont
 * declares dans le contrat mais renvoient une liste vide.
 */
const TONE_OPTIONS = [
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Elevee' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Faible' },
  { value: 'healthy', label: 'Saine' },
];

const KIND_OPTIONS = [{ value: 'allocation', label: 'Allocation' }];

const PRODUCT_COLORS = ['indigo.5', 'orange.5', 'teal.5', 'grape.5', 'cyan.5'];

const badgeColorByTone: Record<CockpitSignalTone, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
  healthy: 'green',
};

/** Le reste de l'interface est en francais : les badges le sont aussi, et
 *  « allocation » tronque en « allo... » ne veut plus rien dire. */
const labelByTone: Record<CockpitSignalTone, string> = {
  critical: 'Critique',
  high: 'Elevee',
  medium: 'Moyenne',
  low: 'Faible',
  healthy: 'Saine',
};

const labelByKind: Record<CockpitSignalKind, string> = {
  allocation: 'Allocation',
  'fuel-card': 'Carte',
  driver: 'Conducteur',
  'fuel-purchase': 'Achat',
  recharge: 'Recharge',
  sync: 'Synchro',
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

  const analyticsQuery = useQuery({
    queryKey: ['cockpit', 'analytics', ANALYTICS_WINDOW_DAYS],
    queryFn: () => getCockpitAnalytics(),
  });

  const signals = signalsQuery.data?.data?.items ?? [];
  const summary = summaryQuery.data;
  const analytics = analyticsQuery.data;

  const windowTotals = useMemo(() => {
    const series = analytics?.series ?? [];
    const liters = series.reduce((sum, point) => sum + point.liters, 0);
    const amount = series.reduce((sum, point) => sum + point.amount, 0);
    const transactions = series.reduce((sum, point) => sum + point.transactions, 0);

    return { liters, amount, transactions };
  }, [analytics]);

  const maxStationLiters = analytics?.stations[0]?.liters ?? 0;

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
        <Metric
          label="Conducteurs actifs"
          value={formatNumber(summary?.activeDrivers)}
          hint={`${formatNumber(summary?.activeCards)} cartes actives`}
          icon={<IconUsers size={16} />}
          color="teal"
        />
        <Metric
          label="Volume du jour"
          value={`${formatNumber(summary?.totalLitersToday, 1)} L`}
          hint={`${formatNumber(windowTotals.liters, 0)} L sur ${ANALYTICS_WINDOW_DAYS} jours`}
          icon={<IconGasStation size={16} />}
          color="blue"
        />
        <Metric
          label="Allocations en attente"
          value={formatNumber(summary?.pendingAllocations)}
          hint={`${formatNumber(summary?.queuedAllocations)} en file, ${formatNumber(
            summary?.failedAllocations
          )} en echec`}
          icon={<IconCreditCard size={16} />}
          color={(summary?.failedAllocations ?? 0) > 0 ? 'orange' : 'blue'}
        />
        <Metric
          label="Ecarts de solde"
          value={formatNumber(summary?.balanceDiffCount)}
          hint={
            summary?.activeCards
              ? `sur ${formatNumber(summary.activeCards)} cartes actives`
              : undefined
          }
          icon={<IconScale size={16} />}
          color={(summary?.balanceDiffCount ?? 0) > 0 ? 'red' : 'teal'}
          ratio={
            summary?.activeCards
              ? ((summary.balanceDiffCount ?? 0) / summary.activeCards) * 100
              : undefined
          }
        />
      </SimpleGrid>

      {analytics?.truncated ? (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
          La periode compte {formatNumber(analytics.totalPurchases)} achats : les graphiques ne
          portent que sur les plus recents.
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card withBorder radius="md" padding="lg" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" align="flex-start" mb="md">
            <Stack gap={2}>
              <Text fw={700}>Volume carburant</Text>
              <Text size="xs" c="dimmed">
                {ANALYTICS_WINDOW_DAYS} derniers jours &middot;{' '}
                {formatNumber(windowTotals.transactions)} achats &middot;{' '}
                {formatCompactCurrency(windowTotals.amount)}
              </Text>
            </Stack>
            <Tooltip label="Rafraichir">
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  summaryQuery.refetch();
                  analyticsQuery.refetch();
                  signalsQuery.refetch();
                }}
              >
                <IconReload size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {analyticsQuery.isLoading ? (
            <Center h={240}>
              <Loader size="sm" />
            </Center>
          ) : windowTotals.transactions === 0 ? (
            <Center h={240}>
              <Text c="dimmed" size="sm">
                Aucun achat sur la periode.
              </Text>
            </Center>
          ) : (
            <AreaChart
              h={240}
              data={analytics?.series ?? []}
              dataKey="label"
              withGradient
              withDots={false}
              curveType="monotone"
              tickLine="x"
              gridAxis="y"
              valueFormatter={(value) => `${formatNumber(value, 1)} L`}
              series={[{ name: 'liters', label: 'Litres', color: 'blue.5' }]}
            />
          )}
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={700}>Allocations</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Cycle de vie des rechargements de carte
          </Text>

          {(analytics?.allocations.length ?? 0) === 0 ? (
            <Center h={200}>
              <Text c="dimmed" size="sm">
                Aucune allocation.
              </Text>
            </Center>
          ) : (
            <Stack gap="sm" align="center">
              <DonutChart
                h={180}
                thickness={22}
                paddingAngle={2}
                withLabelsLine={false}
                data={analytics?.allocations ?? []}
                tooltipDataSource="segment"
                chartLabel={formatNumber(
                  (analytics?.allocations ?? []).reduce((sum, slice) => sum + slice.value, 0)
                )}
              />
              <Stack gap={4} w="100%">
                {(analytics?.allocations ?? []).map((slice) => (
                  <Group key={slice.name} justify="space-between" gap="xs">
                    <Group gap={6}>
                      <ThemeIcon size={10} radius="xl" color={slice.color.split('.')[0]} />
                      <Text size="sm" c="dimmed">
                        {slice.name}
                      </Text>
                    </Group>
                    <Text size="sm" fw={600}>
                      {formatNumber(slice.value)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card withBorder radius="md" padding="lg" style={{ gridColumn: 'span 2' }}>
          <Text fw={700}>Stations les plus servies</Text>
          <Text size="xs" c="dimmed" mb="md">
            Volume distribue sur {ANALYTICS_WINDOW_DAYS} jours
          </Text>

          {(analytics?.stations.length ?? 0) === 0 ? (
            <Text c="dimmed" size="sm">
              Aucun achat sur la periode.
            </Text>
          ) : (
            <Stack gap="md">
              {(analytics?.stations ?? []).map((station) => (
                <Stack key={station.name} gap={6}>
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="sm" lineClamp={1}>
                      {station.name}
                    </Text>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {formatNumber(station.liters, 1)} L
                      </Text>
                      <Text size="xs" c="dimmed">
                        {station.transactions} achat(s)
                      </Text>
                    </Group>
                  </Group>
                  <Progress
                    value={maxStationLiters > 0 ? (station.liters / maxStationLiters) * 100 : 0}
                    color="blue.5"
                    radius="xl"
                    size="sm"
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={700}>Produits</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Repartition du volume
          </Text>

          {(analytics?.products.length ?? 0) === 0 ? (
            <Center h={180}>
              <Text c="dimmed" size="sm">
                Aucun achat sur la periode.
              </Text>
            </Center>
          ) : (
            <Stack gap="sm" align="center">
              <DonutChart
                h={180}
                thickness={22}
                paddingAngle={2}
                withLabelsLine={false}
                tooltipDataSource="segment"
                data={(analytics?.products ?? []).map((product, index) => ({
                  name: product.name,
                  value: product.liters,
                  color: PRODUCT_COLORS[index % PRODUCT_COLORS.length],
                }))}
              />
              <Stack gap={4} w="100%">
                {(analytics?.products ?? []).map((product, index) => (
                  <Group key={product.name} justify="space-between" gap="xs">
                    <Group gap={6} wrap="nowrap">
                      <ThemeIcon
                        size={10}
                        radius="xl"
                        color={PRODUCT_COLORS[index % PRODUCT_COLORS.length].split('.')[0]}
                      />
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {product.name}
                      </Text>
                    </Group>
                    <Text size="sm" fw={600}>
                      {formatNumber(product.liters, 1)} L
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>Actions rapides</Text>
          <Text size="xs" c="dimmed">
            Les compteurs pointent vers la liste correspondante
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 5 }} spacing="sm">
          {actions.map((action) => {
            const body = (
              <Stack gap={6}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  {/* Le libelle est du texte, pas un badge : « Achats carburant »
                      tronque en « Achats carbur... » ne se lit plus. */}
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <ThemeIcon size={8} radius="xl" color={badgeColorByTone[action.tone]} />
                    <Text size="xs" fw={700} c="dimmed" lineClamp={2}>
                      {action.label}
                    </Text>
                  </Group>
                  {action.navigateTo ? (
                    <ThemeIcon variant="subtle" color={badgeColorByTone[action.tone]} size="sm">
                      <IconArrowRight size={14} />
                    </ThemeIcon>
                  ) : null}
                </Group>
                <Text fw={800} size="1.4rem" lh={1.1}>
                  {action.count !== undefined ? formatNumber(action.count) : '\u2014'}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {action.description}
                </Text>
              </Stack>
            );

            return action.navigateTo ? (
              <Card
                key={action.id}
                withBorder
                padding="md"
                radius="sm"
                component={Link}
                to={action.navigateTo}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {body}
              </Card>
            ) : (
              <Card key={action.id} withBorder padding="md" radius="sm">
                {body}
              </Card>
            );
          })}
        </SimpleGrid>
      </Card>

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
            w={260}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Toutes criticites"
            aria-label="Criticite"
            data={TONE_OPTIONS}
            value={tone}
            clearable
            w={180}
            onChange={(value) => {
              setTone((value as CockpitSignalTone | null) ?? '');
              setPage(1);
            }}
          />
          <Select
            placeholder="Tous les types"
            aria-label="Type de signal"
            data={KIND_OPTIONS}
            value={kind}
            clearable
            w={200}
            onChange={(value) => {
              setKind((value as CockpitSignalKind | null) ?? '');
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
                      {labelByTone[signal.tone] ?? signal.tone}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByKind[signal.kind]} variant="light">
                      {labelByKind[signal.kind] ?? signal.kind}
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
