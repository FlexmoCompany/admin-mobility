import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  Group,
  Menu,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BarChart, DonutChart, LineChart } from '@mantine/charts';
import { notifications } from '@mantine/notifications';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  IconDots,
  IconEdit,
  IconFileExport,
  IconFilter,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';

import type { AppRouteKey } from '@/config/navigation';
import type { OpsModule, OpsRecord, OpsStatus, Severity } from '@/features/ops/ops-data';
import { statusLabels } from '@/features/ops/ops-data';

interface SectionViewProps {
  section: OpsModule;
}

const statusOptions: Array<{ value: OpsStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'pending', label: 'En attente' },
  { value: 'watch', label: 'Surveillance' },
  { value: 'blocked', label: 'Bloques' },
  { value: 'closed', label: 'Clotures' },
];

const pageConfig: Record<
  AppRouteKey,
  {
    objectName: string;
    primaryAction: string;
    secondaryAction: string;
    tableTitle: string;
    tableDescription: string;
    chartTitle?: string;
  }
> = {
  cockpit: {
    objectName: 'evenement',
    primaryAction: 'Creer une tache',
    secondaryAction: 'Exporter',
    tableTitle: 'Activite recente',
    tableDescription: 'Derniers evenements operationnels a suivre.',
    chartTitle: 'Volumes et allocations',
  },
  partners: {
    objectName: 'partenaire',
    primaryAction: 'Ajouter partenaire',
    secondaryAction: 'Exporter partenaires',
    tableTitle: 'Registre partenaires',
    tableDescription: 'Partenaires flotte, exposition financiere et statut de verification.',
    chartTitle: 'Exposition par partenaire',
  },
  drivers: {
    objectName: 'conducteur',
    primaryAction: 'Ajouter conducteur',
    secondaryAction: 'Exporter conducteurs',
    tableTitle: 'Registre conducteurs',
    tableDescription: 'Fiches conducteurs, carte affectee, solde et statut support.',
    chartTitle: 'Activite conducteurs',
  },
  vehicles: {
    objectName: 'vehicule',
    primaryAction: 'Ajouter vehicule',
    secondaryAction: 'Exporter parc',
    tableTitle: 'Parc vehicules',
    tableDescription: 'Affectations, consommation et signaux maintenance.',
    chartTitle: 'Consommation par type',
  },
  fuel: {
    objectName: 'transaction',
    primaryAction: 'Importer CSV',
    secondaryAction: 'Verifier doublons',
    tableTitle: 'Transactions carburant',
    tableDescription: 'Achats TotalEnergies, volumes, bonus et rapprochement conducteur.',
    chartTitle: 'Volume importe',
  },
  'cards-balances': {
    objectName: 'carte',
    primaryAction: 'Recharger carte',
    secondaryAction: 'Synchroniser soldes',
    tableTitle: 'Cartes et soldes',
    tableDescription: 'Cartes carburant, allocations asynchrones et ecarts partenaire.',
    chartTitle: 'Soldes cartes',
  },
  'fuel-finance': {
    objectName: 'mouvement finance',
    primaryAction: 'Ajouter mouvement',
    secondaryAction: 'Rapprocher',
    tableTitle: 'Mouvements finance carburant',
    tableDescription: 'Paiements, approvisionnements, cashback et rapprochements.',
    chartTitle: 'Flux financiers',
  },
  incidents: {
    objectName: 'incident',
    primaryAction: 'Creer incident',
    secondaryAction: 'Exporter incidents',
    tableTitle: 'Incidents operations',
    tableDescription: 'Anomalies de recharge, allocation, import et notification.',
    chartTitle: 'Incidents par priorite',
  },
};

const toneColor: Record<Severity, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'gray',
  healthy: 'green',
};

const statusColor: Record<OpsStatus, string> = {
  active: 'green',
  watch: 'yellow',
  blocked: 'red',
  pending: 'blue',
  closed: 'gray',
};

const trendData = [
  { day: 'Lun', volume: 4120, allocations: 930, incidents: 18 },
  { day: 'Mar', volume: 4890, allocations: 1010, incidents: 15 },
  { day: 'Mer', volume: 5340, allocations: 1088, incidents: 21 },
  { day: 'Jeu', volume: 5010, allocations: 1072, incidents: 12 },
  { day: 'Ven', volume: 5980, allocations: 1184, incidents: 29 },
];

const exposureData = [
  { name: 'Taxi Union', value: 18.2, color: 'blue.6' },
  { name: 'Express', value: 6.8, color: 'yellow.6' },
  { name: 'AFS', value: 2.1, color: 'red.6' },
  { name: 'Autres', value: 14.6, color: 'gray.5' },
];

export function SectionView({ section }: SectionViewProps) {
  const config = pageConfig[section.key];

  if (section.key === 'cockpit') {
    return <DashboardView section={section} config={config} />;
  }

  return <RegistryView section={section} config={config} />;
}

function DashboardView({
  section,
  config,
}: {
  section: OpsModule;
  config: (typeof pageConfig)[AppRouteKey];
}) {
  return (
    <Stack gap="md" className="page-stack">
      <PageHeader section={section} config={config} />
      <MetricGrid section={section} />

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Paper withBorder radius="md" p="md" className="chart-card span-2">
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>{config.chartTitle}</Title>
              <Text size="sm" c="dimmed">
                Suivi hebdomadaire du volume et des allocations confirmees.
              </Text>
            </div>
            <Badge variant="light">Semaine courante</Badge>
          </Group>
          <LineChart
            h={260}
            data={trendData}
            dataKey="day"
            series={[
              { name: 'volume', color: 'blue.6', label: 'Volume L' },
              { name: 'allocations', color: 'yellow.6', label: 'Allocations' },
            ]}
            curveType="linear"
          />
        </Paper>

        <Paper withBorder radius="md" p="md" className="chart-card">
          <Title order={4} mb={4}>
            Exposition
          </Title>
          <Text size="sm" c="dimmed" mb="lg">
            Soldes et engagements par partenaire.
          </Text>
          <DonutChart data={exposureData} h={230} chartLabel="41.7M" />
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Paper withBorder radius="md" p="md" className="span-2">
          <DataTable records={section.records} tableTitle={config.tableTitle} tableDescription={config.tableDescription} />
        </Paper>
        <ActionPanel section={section} />
      </SimpleGrid>
    </Stack>
  );
}

function RegistryView({
  section,
  config,
}: {
  section: OpsModule;
  config: (typeof pageConfig)[AppRouteKey];
}) {
  const [records, setRecords] = useState(section.records);
  const [selectedRecord, setSelectedRecord] = useState<OpsRecord | null>(records[0] ?? null);
  const [drawerOpened, drawer] = useDisclosure(false);
  const [modalOpened, modal] = useDisclosure(false);

  const openCreate = () => {
    setSelectedRecord(null);
    modal.open();
  };

  const saveRecord = () => {
    notifications.show({
      color: 'green',
      title: `${config.objectName} enregistre`,
      message: 'Les changements sont prets a etre envoyes au backend.',
    });
    modal.close();
  };

  const deleteRecord = (record: OpsRecord) => {
    setRecords((current) => current.filter((item) => item.id !== record.id));
    notifications.show({
      color: 'red',
      title: `${record.id} retire`,
      message: 'Suppression locale appliquee sur la vue de travail.',
    });
  };

  return (
    <Stack gap="md" className="page-stack">
      <PageHeader section={section} config={config} onPrimary={openCreate} />
      <MetricGrid section={section} />

      <SimpleGrid cols={{ base: 1, xl: 4 }} spacing="md">
        <Paper withBorder radius="md" p="md" className="span-3">
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>{config.chartTitle}</Title>
              <Text size="sm" c="dimmed">
                Donnees de pilotage pour prioriser les operations du jour.
              </Text>
            </div>
            <SegmentedControl
              size="xs"
              data={[
                { value: 'day', label: 'Jour' },
                { value: 'week', label: 'Semaine' },
                { value: 'month', label: 'Mois' },
              ]}
              defaultValue="week"
            />
          </Group>
          <BarChart
            h={220}
            data={trendData}
            dataKey="day"
            series={[
              { name: section.key === 'incidents' ? 'incidents' : 'volume', color: section.key === 'incidents' ? 'red.6' : 'blue.6' },
            ]}
          />
        </Paper>
        <ActionPanel section={section} />
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <DataTable
          records={records}
          tableTitle={config.tableTitle}
          tableDescription={config.tableDescription}
          onOpen={(record) => {
            setSelectedRecord(record);
            drawer.open();
          }}
          onEdit={(record) => {
            setSelectedRecord(record);
            modal.open();
          }}
          onDelete={deleteRecord}
        />
      </Paper>

      <RecordDrawer
        opened={drawerOpened}
        onClose={drawer.close}
        record={selectedRecord}
        config={config}
        onEdit={() => {
          drawer.close();
          modal.open();
        }}
      />

      <RecordModal
        opened={modalOpened}
        onClose={modal.close}
        record={selectedRecord}
        config={config}
        onSave={saveRecord}
      />
    </Stack>
  );
}

function PageHeader({
  section,
  config,
  onPrimary,
}: {
  section: OpsModule;
  config: (typeof pageConfig)[AppRouteKey];
  onPrimary?: () => void;
}) {
  const runSecondary = () => {
    notifications.show({
      color: 'blue',
      title: config.secondaryAction,
      message: 'Action lancee depuis la console admin.',
    });
  };

  return (
    <Paper withBorder radius="md" p="md" className="page-header">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            {section.eyebrow}
          </Text>
          <Title order={2}>{section.title}</Title>
          <Text c="dimmed" maw={760} mt={4}>
            {section.description}
          </Text>
        </div>
        <Group gap="xs">
          <Button leftSection={<IconPlus size={16} />} onClick={onPrimary}>
            {config.primaryAction}
          </Button>
          <Button variant="default" leftSection={<IconFileExport size={16} />} onClick={runSecondary}>
            {config.secondaryAction}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

function MetricGrid({ section }: { section: OpsModule }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
      {section.metrics.map((metric) => (
        <Card key={metric.label} withBorder radius="md" padding="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={800}>
                {metric.label}
              </Text>
              <Text size="xl" fw={760} mt={4}>
                {metric.value}
              </Text>
            </div>
            <Badge color={toneColor[metric.tone]} variant="light">
              {metric.delta}
            </Badge>
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  );
}

function DataTable({
  records,
  tableTitle,
  tableDescription,
  onOpen,
  onEdit,
  onDelete,
}: {
  records: OpsRecord[];
  tableTitle: string;
  tableDescription: string;
  onOpen?: (record: OpsRecord) => void;
  onEdit?: (record: OpsRecord) => void;
  onDelete?: (record: OpsRecord) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OpsStatus | 'all'>('all');

  const data = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = status === 'all' || record.status === status;
      const matchesQuery =
        !normalizedQuery ||
        [record.id, record.primary, record.secondary, record.owner, record.amount, record.signal]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, records, status]);

  const columns = useMemo<ColumnDef<OpsRecord>[]>(
    () => [
      {
        accessorKey: 'primary',
        header: 'Objet',
        cell: ({ row }) => (
          <button type="button" className="table-object-button" onClick={() => onOpen?.(row.original)}>
            <Text size="sm" fw={750}>
              {row.original.primary}
            </Text>
            <Text size="xs" c="dimmed">
              {row.original.id} - {row.original.secondary}
            </Text>
          </button>
        ),
      },
      { accessorKey: 'owner', header: 'Responsable' },
      { accessorKey: 'amount', header: 'Montant / volume' },
      { accessorKey: 'signal', header: 'Signal' },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" aria-label={`Actions ${row.original.id}`}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit?.(row.original)}>
                Modifier
              </Menu.Item>
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => onDelete?.(row.original)}>
                Supprimer
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ),
      },
    ],
    [onDelete, onEdit, onOpen]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={4}>{tableTitle}</Title>
          <Text size="sm" c="dimmed">
            {tableDescription}
          </Text>
        </div>
        <Button variant="default" leftSection={<IconRefresh size={16} />}>
          Actualiser
        </Button>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          className="table-search"
          leftSection={<IconSearch size={16} />}
          placeholder="Rechercher par reference, conducteur, partenaire ou signal"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <Select
          leftSection={<IconFilter size={16} />}
          data={statusOptions}
          value={status}
          onChange={(value) => setStatus((value as OpsStatus | 'all') ?? 'all')}
          allowDeselect={false}
          w={{ base: '100%', sm: 190 }}
        />
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" striped highlightOnHover className="admin-table">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {data.length === 0 ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <Text fw={700}>Aucun resultat</Text>
          <Text size="sm" c="dimmed">
            Retirez un filtre ou cherchez une autre reference.
          </Text>
        </Paper>
      ) : null}
    </Stack>
  );
}

function ActionPanel({ section }: { section: OpsModule }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Tabs defaultValue="actions">
        <Tabs.List grow>
          <Tabs.Tab value="actions">Actions</Tabs.Tab>
          <Tabs.Tab value="timeline">Journal</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="actions" pt="md">
          <Stack gap="sm">
            {section.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="action-card"
                onClick={() =>
                  notifications.show({
                    color: toneColor[action.tone],
                    title: action.label,
                    message: action.description,
                  })
                }
              >
                <Group align="flex-start" wrap="nowrap">
                  <ThemeIcon color={toneColor[action.tone]} variant="light" radius={8}>
                    <IconRefresh size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={750}>
                      {action.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {action.description}
                    </Text>
                  </div>
                </Group>
              </button>
            ))}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="timeline" pt="md">
          <Stack gap="sm">
            {section.timeline.map((item) => (
              <Group key={`${item.time}-${item.title}`} align="flex-start" wrap="nowrap">
                <Badge color={toneColor[item.tone]} variant="light">
                  {item.time}
                </Badge>
                <div>
                  <Text size="sm" fw={750}>
                    {item.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {item.detail}
                  </Text>
                </div>
              </Group>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

function RecordDrawer({
  opened,
  onClose,
  record,
  config,
  onEdit,
}: {
  opened: boolean;
  onClose: () => void;
  record: OpsRecord | null;
  config: (typeof pageConfig)[AppRouteKey];
  onEdit: () => void;
}) {
  return (
    <Drawer opened={opened} onClose={onClose} position="right" title={`Detail ${config.objectName}`} size="md">
      {record ? (
        <Stack>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={800}>
                {record.id}
              </Text>
              <Title order={3}>{record.primary}</Title>
              <Text c="dimmed">{record.secondary}</Text>
            </div>
            <StatusBadge status={record.status} />
          </Group>
          <SimpleGrid cols={2}>
            <Info label="Responsable" value={record.owner} />
            <Info label="Montant / volume" value={record.amount} />
            <Info label="Signal" value={record.signal} />
            <Info label="Mise a jour" value={record.updatedAt} />
          </SimpleGrid>
          <Group gap={6}>
            {record.tags.map((tag) => (
              <Badge key={tag} variant="light" color="gray">
                {tag}
              </Badge>
            ))}
          </Group>
          <Group>
            <Button leftSection={<IconEdit size={16} />} onClick={onEdit}>
              Modifier
            </Button>
            <Button variant="default">Voir historique</Button>
          </Group>
        </Stack>
      ) : null}
    </Drawer>
  );
}

function RecordModal({
  opened,
  onClose,
  record,
  config,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  record: OpsRecord | null;
  config: (typeof pageConfig)[AppRouteKey];
  onSave: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={record ? `Modifier ${config.objectName}` : `Ajouter ${config.objectName}`} centered>
      <Stack>
        <TextInput label="Nom / reference" defaultValue={record?.primary ?? ''} />
        <TextInput label="Responsable" defaultValue={record?.owner ?? ''} />
        <TextInput label="Montant / volume" defaultValue={record?.amount ?? ''} />
        <Select
          label="Statut"
          defaultValue={record?.status ?? 'pending'}
          data={statusOptions.filter((item) => item.value !== 'all')}
        />
        <Textarea label="Signal operationnel" defaultValue={record?.signal ?? ''} minRows={3} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onSave}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function StatusBadge({ status }: { status: OpsStatus }) {
  return (
    <Badge color={statusColor[status]} variant="light">
      {statusLabels[status]}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box className="info-box">
      <Text size="xs" c="dimmed" fw={800}>
        {label}
      </Text>
      <Text size="sm" fw={750}>
        {value}
      </Text>
    </Box>
  );
}
