import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { notifications } from '@mantine/notifications';
import { IconBolt, IconEye, IconPower, IconSearch } from '@tabler/icons-react';

import { AllocationModal } from './allocation-modal';
import { allocateFuelCard, getFuelCardsStats, listFuelCards, updateFuelCardStatus } from '../api/fuel-cards-api';
import type { AllocateFuelCardPayload, FuelCardRecord, ListFuelCardsParams } from '../types';

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value))
    : '-';

export function FuelCardsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [env, setEnv] = useState<'' | 'sandbox' | 'production'>('');
  const [companyRef, setCompanyRef] = useState('');
  const [selectedCard, setSelectedCard] = useState<FuelCardRecord | null>(null);

  const queryParams: ListFuelCardsParams = useMemo(
    () => ({
      page,
      limit: 10,
      searchTerm,
      status,
      env,
      companyRef,
    }),
    [companyRef, env, page, searchTerm, status]
  );

  const cardsQuery = useQuery({
    queryKey: ['fuel-cards', queryParams],
    queryFn: async () => {
      const response = await listFuelCards(queryParams);
      if (!response.success) {
        throw new Error('Chargement des cartes carburant impossible.');
      }
      return response.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['fuel-cards', 'stats', {searchTerm, status, env, companyRef}],
    queryFn: async () => {
      const response = await getFuelCardsStats({searchTerm, status, env, companyRef});
      if (!response.success) {
        throw new Error('Chargement des statistiques cartes impossible.');
      }
      return response.data;
    },
  });

  const refreshCards = () => {
    void Promise.all([
      queryClient.invalidateQueries({queryKey: ['fuel-cards']}),
      queryClient.invalidateQueries({queryKey: ['drivers']}),
    ]);
  };

  const allocationMutation = useMutation({
    mutationFn: async (payload: {accountId: string; values: AllocateFuelCardPayload}) => {
      const response = await allocateFuelCard(payload.accountId, payload.values);
      if (!response.success) {
        throw new Error(response.message || "Allocation de solde impossible.");
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: response.data?.allocation?.status === 'failed' ? 'yellow' : 'green',
        title:
          response.data?.allocation?.status === 'failed'
            ? 'Allocation a relancer'
            : 'Solde alloue',
        message:
          response.message ||
          "L'allocation a ete creee avec succes.",
      });
      setSelectedCard(null);
      refreshCards();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Allocation impossible',
        message: error instanceof Error ? error.message : "L'allocation a echoue.",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (card: FuelCardRecord) => {
      const response = await updateFuelCardStatus(card._id, {isActive: !card.isActive});
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour du statut impossible.');
      }
      return response;
    },
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: 'Statut mis a jour',
        message: 'Le statut de la carte a ete modifie.',
      });
      refreshCards();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Statut impossible',
        message: error instanceof Error ? error.message : 'La mise a jour a echoue.',
      });
    },
  });

  const stats = statsQuery.data;
  const cards = cardsQuery.data?.fuelCards ?? [];
  const pagination = cardsQuery.data?.pagination;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Cartes et soldes</Title>
        <Text c="dimmed" mt={4}>
          Supervision des cartes carburant, des soldes et des allocations.
        </Text>
      </div>

      <SimpleGrid cols={{base: 1, md: 4}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cartes suivies
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.totalCards ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cartes actives
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.activeCards ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Solde total FlexMo
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(stats?.totalBalance)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Sync KO / stale
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.syncIssues ?? 0}
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group wrap="wrap" mb="md">
          <TextInput
            placeholder="Rechercher conducteur ou partenaire..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.currentTarget.value);
              setPage(1);
            }}
          />
          <TextInput
            placeholder="Statut: active / inactive"
            value={status}
            onChange={(event) => {
              setStatus((event.currentTarget.value as 'active' | 'inactive' | '') ?? '');
              setPage(1);
            }}
          />
          <TextInput
            placeholder="Env: sandbox / production"
            value={env}
            onChange={(event) => {
              setEnv((event.currentTarget.value as 'sandbox' | 'production' | '') ?? '');
              setPage(1);
            }}
          />
          <TextInput
            placeholder="Reference partenaire"
            value={companyRef}
            onChange={(event) => {
              setCompanyRef(event.currentTarget.value);
              setPage(1);
            }}
          />
        </Group>

        <Table.ScrollContainer minWidth={1180}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th fw={700}>Numéro de carte</Table.Th>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Partenaire</Table.Th>
                <Table.Th>Environnement</Table.Th>
                <Table.Th>Statut carte</Table.Th>
                <Table.Th>Solde FlexMo</Table.Th>
                <Table.Th>Solde partenaire</Table.Th>
                <Table.Th>Diff</Table.Th>
                <Table.Th>Statut sync</Table.Th>
                <Table.Th>Dernier achat</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cards.map((card) => {
                const driverLabel = [card.driver?.firstName, card.driver?.lastName]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <Table.Tr key={card._id}>
                    <Table.Td>
                      <Text fw={700} ff="monospace">
                        {card.driver?.phoneNumber || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {card.driver?._id ? (
                        <Link to={`/drivers/${card.driver._id}`}>{driverLabel || card.driver?.reference || '-'}</Link>
                      ) : (
                        driverLabel || card.driver?.reference || '-'
                      )}
                    </Table.Td>
                    <Table.Td>{card.company?.companyInfos?.name || card.company?.reference || '-'}</Table.Td>
                    <Table.Td>{card.env}</Table.Td>
                    <Table.Td>
                      <Badge color={card.isActive ? 'green' : 'gray'} variant="light">
                        {card.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatCurrency(card.balance)}</Table.Td>
                    <Table.Td>{formatCurrency(card.partnerBalance)}</Table.Td>
                    <Table.Td>{formatCurrency(card.partnerBalanceDiff)}</Table.Td>
                    <Table.Td>
                      <Badge color={card.partnerSyncStatus === 'success' ? 'green' : 'orange'} variant="light">
                        {card.partnerSyncStatus || 'pending'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {card.lastPurchase?.date ? (
                        <Stack gap={0}>
                          <Text size="sm">{formatDate(card.lastPurchase.date)}</Text>
                          <Text size="xs" c="dimmed">
                            {formatCurrency(card.lastPurchase.amount)}
                          </Text>
                        </Stack>
                      ) : (
                        '-'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Voir le detail de la carte">
                          <ActionIcon component={Link} to={`/cards-balances/${card._id}`} variant="subtle">
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Allouer du solde sur cette carte">
                          <ActionIcon variant="subtle" onClick={() => setSelectedCard(card)}>
                            <IconBolt size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={card.isActive ? 'Desactiver la carte' : 'Activer la carte'}>
                          <ActionIcon
                            variant="subtle"
                            loading={statusMutation.isPending}
                            onClick={() => statusMutation.mutate(card)}
                          >
                            <IconPower size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {cards.length === 0 && !cardsQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Text c="dimmed">Aucune carte carburant trouvee.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {pagination ? (
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Page {pagination.page} / {pagination.totalPages || 1} ({pagination.total} cartes)
            </Text>
            <Pagination value={page} onChange={setPage} total={pagination.totalPages || 1} />
          </Group>
        ) : null}
      </Card>

      <AllocationModal
        opened={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        loading={allocationMutation.isPending}
        env={selectedCard?.env}
        driverLabel={
          selectedCard
            ? [selectedCard.driver?.firstName, selectedCard.driver?.lastName].filter(Boolean).join(' ')
            : undefined
        }
        onSubmit={async (values) => {
          if (!selectedCard) {
            return;
          }
          await allocationMutation.mutateAsync({accountId: selectedCard._id, values});
        }}
      />
    </Stack>
  );
}
