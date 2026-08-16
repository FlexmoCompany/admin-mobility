import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconBolt, IconRefresh, IconPower } from '@tabler/icons-react';

import { AllocationModal } from './allocation-modal';
import {
  allocateFuelCard,
  getFuelCardById,
  listFuelCardAllocations,
  retryFuelCardAllocation,
  updateFuelCardStatus,
} from '../api/fuel-cards-api';
import type { AllocateFuelCardPayload, FuelCardAllocationRecord, FuelCardRecord } from '../types';

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)) : '-';

export function FuelCardDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {accountId = ''} = useParams();
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [allocationsPage, setAllocationsPage] = useState(1);
  const [allocationOpen, setAllocationOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['fuel-cards', accountId, 'detail', purchasesPage],
    queryFn: async () => {
      const response = await getFuelCardById(accountId, {page: purchasesPage, limit: 10});
      if (!response.success || !response.data) {
        throw new Error('Chargement du detail de la carte impossible.');
      }
      return response.data;
    },
    enabled: Boolean(accountId),
    retry: false,
  });

  const allocationsQuery = useQuery({
    queryKey: ['fuel-cards', accountId, 'allocations', allocationsPage],
    queryFn: async () => {
      const response = await listFuelCardAllocations(accountId, {page: allocationsPage, limit: 10});
      if (!response.success) {
        throw new Error('Chargement des allocations impossible.');
      }
      return response.data;
    },
    enabled: Boolean(accountId),
    retry: false,
  });

  const refreshAll = () => {
    void Promise.all([
      queryClient.invalidateQueries({queryKey: ['fuel-cards']}),
      queryClient.invalidateQueries({queryKey: ['drivers']}),
    ]);
  };

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
      refreshAll();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Statut impossible',
        message: error instanceof Error ? error.message : 'La mise a jour a echoue.',
      });
    },
  });

  const allocationMutation = useMutation({
    mutationFn: async (payload: AllocateFuelCardPayload) => {
      const response = await allocateFuelCard(accountId, payload);
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
        message: response.message || "L'allocation a ete creee.",
      });
      setAllocationOpen(false);
      refreshAll();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Allocation impossible',
        message: error instanceof Error ? error.message : "L'allocation a echoue.",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (allocation: FuelCardAllocationRecord) => {
      const response = await retryFuelCardAllocation(allocation._id);
      if (!response.success) {
        throw new Error(response.message || "Relance de l'allocation impossible.");
      }
      return response;
    },
    onSuccess: () => {
      notifications.show({
        color: 'green',
        title: 'Relance envoyee',
        message: "L'allocation externe a ete relancee sans re-debit interne.",
      });
      refreshAll();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Relance impossible',
        message: error instanceof Error ? error.message : 'La relance a echoue.',
      });
    },
  });

  if (detailQuery.isLoading) {
    return <Text c="dimmed">Chargement de la carte...</Text>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Stack gap="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cards-balances')}>
          Retour a la liste
        </Button>
        <Card withBorder radius="md" padding="lg">
          <Text c="red">Impossible de charger le detail de cette carte.</Text>
        </Card>
      </Stack>
    );
  }

  const card = detailQuery.data.fuelCard;
  const statistics = detailQuery.data.statistics;
  const purchases = detailQuery.data.purchases ?? [];
  const purchasesPagination = detailQuery.data.pagination;
  const allocations = allocationsQuery.data?.allocations ?? [];
  const allocationsPagination = allocationsQuery.data?.pagination;
  const driverLabel = [card.driver?.firstName, card.driver?.lastName].filter(Boolean).join(' ');

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Tooltip label="Retour a la liste des cartes">
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cards-balances')}>
              Retour a la liste
            </Button>
          </Tooltip>
          <Title order={2} mt="xs">
            Carte carburant {card.driver?.phoneNumber ? `- ${card.driver.phoneNumber}` : ''}
          </Title>
          <Group gap="sm" mt="sm">
            <Badge color={card.isActive ? 'green' : 'gray'} variant="light">
              {card.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
            <Badge color={card.partnerSyncStatus === 'success' ? 'green' : 'orange'} variant="light">
              {card.partnerSyncStatus || 'pending'}
            </Badge>
          </Group>
        </div>

        <Group gap="sm">
          <Tooltip label="Allouer du solde sur cette carte">
            <Button leftSection={<IconBolt size={16} />} onClick={() => setAllocationOpen(true)}>
              Allocation
            </Button>
          </Tooltip>
          <Tooltip label={card.isActive ? 'Desactiver la carte' : 'Activer la carte'}>
            <Button
              variant="default"
              leftSection={<IconPower size={16} />}
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate(card)}
            >
              {card.isActive ? 'Desactiver' : 'Activer'}
            </Button>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{base: 1, lg: 2}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Resume carte
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Numéro de carte</Table.Th>
                <Table.Td>
                  <Text fw={700} ff="monospace">
                    {card.driver?.phoneNumber || '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Compte</Table.Th>
                <Table.Td>{card._id}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Environnement</Table.Th>
                <Table.Td>{card.env}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Solde FlexMo</Table.Th>
                <Table.Td>{formatCurrency(card.balance)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Solde partenaire</Table.Th>
                <Table.Td>{formatCurrency(card.partnerBalance)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Diff</Table.Th>
                <Table.Td>{formatCurrency(card.partnerBalanceDiff)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Derniere sync</Table.Th>
                <Table.Td>{formatDate(card.partnerBalanceUpdatedAt)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Conducteur et partenaire
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Conducteur</Table.Th>
                <Table.Td>
                  {card.driver?._id ? (
                    <Link to={`/drivers/${card.driver._id}`}>{driverLabel || card.driver.reference || '-'}</Link>
                  ) : (
                    driverLabel || card.driver?.reference || '-'
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Td>{card.driver?.reference || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Telephone</Table.Th>
                <Table.Td>{card.driver?.phoneNumber || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Td>{card.driver?.email || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Partenaire</Table.Th>
                <Table.Td>{card.company?.companyInfos?.name || card.company?.reference || '-'}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, md: 3}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Total depense
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(statistics.totalSpent)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Litres consommes
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {statistics.totalLiters} L
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Achats ce mois
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(statistics.currentMonthSpent)}
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Achats carburant
        </Title>
        <Table.ScrollContainer minWidth={860}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Station</Table.Th>
                <Table.Th>Produit</Table.Th>
                <Table.Th>Litres</Table.Th>
                <Table.Th>Montant</Table.Th>
                <Table.Th>Statut</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {purchases.map((purchase) => (
                <Table.Tr key={purchase._id}>
                  <Table.Td>{formatDate(purchase.createdAt)}</Table.Td>
                  <Table.Td>{purchase.station || '-'}</Table.Td>
                  <Table.Td>{purchase.product || '-'}</Table.Td>
                  <Table.Td>{purchase.liters ?? 0}</Table.Td>
                  <Table.Td>{formatCurrency(purchase.totalAmount)}</Table.Td>
                  <Table.Td>{purchase.status || '-'}</Table.Td>
                </Table.Tr>
              ))}
              {purchases.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed">Aucun achat lie a cette carte.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {purchasesPagination ? (
          <Group justify="flex-end" mt="md">
            <Pagination
              value={purchasesPage}
              onChange={setPurchasesPage}
              total={purchasesPagination.totalPages || 1}
            />
          </Group>
        ) : null}
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Allocations
        </Title>
        <Table.ScrollContainer minWidth={960}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Montant</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Tentatives</Table.Th>
                <Table.Th>Derniere erreur</Table.Th>
                <Table.Th>TransferId</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allocations.map((allocation) => (
                <Table.Tr key={allocation._id}>
                  <Table.Td>{formatDate(allocation.createdAt)}</Table.Td>
                  <Table.Td>{formatCurrency(allocation.amount)}</Table.Td>
                  <Table.Td>
                    <Badge color={allocation.status === 'success' ? 'green' : allocation.status === 'failed' ? 'red' : 'blue'} variant="light">
                      {allocation.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{allocation.attempts}</Table.Td>
                  <Table.Td>{allocation.lastError || '-'}</Table.Td>
                  <Table.Td>{allocation.transferId}</Table.Td>
                  <Table.Td>
                    {allocation.status === 'failed' ? (
                      <Tooltip label="Relance uniquement l allocation externe TotalEnergies, sans re-debit interne">
                        <ActionIcon
                          variant="subtle"
                          loading={retryMutation.isPending}
                          onClick={() => retryMutation.mutate(allocation)}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {allocations.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed">Aucune allocation trouvee pour cette carte.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {allocationsPagination ? (
          <Group justify="flex-end" mt="md">
            <Pagination
              value={allocationsPage}
              onChange={setAllocationsPage}
              total={allocationsPagination.totalPages || 1}
            />
          </Group>
        ) : null}
      </Card>

      <AllocationModal
        opened={allocationOpen}
        onClose={() => setAllocationOpen(false)}
        loading={allocationMutation.isPending}
        env={card.env}
        driverLabel={driverLabel}
        onSubmit={async (payload) => {
          await allocationMutation.mutateAsync(payload);
        }}
      />
    </Stack>
  );
}

