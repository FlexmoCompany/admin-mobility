import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCreditCard,
  IconEdit,
  IconKey,
  IconRefresh,
  IconReload,
  IconUserOff,
} from '@tabler/icons-react';

import { listPartners } from '@/features/partners/api/partners-api';

import {
  deleteDriver,
  getDriverById,
  getDriverDetailedData,
  resetDriverPin,
  retryFuelCardCreation,
  syncFuelCardBalance,
  triggerFuelCardCreation,
  updateDriver,
  updateDriverFuelCard,
  updateDriverStatus,
} from '../api/drivers-api';
import { DriverFormModal } from './driver-form-modal';
import type {
  DriverFuelPurchase,
  DriverRecord,
  DriverStatus,
  DriverVehicle,
  FuelCardCreationStatus,
  FuelCardStatus,
  UpdateDriverPayload,
} from '../types';

type DetailAction =
  | {type: 'status'; nextStatus: DriverStatus}
  | {type: 'fuelCard'; nextStatus: FuelCardStatus}
  | {type: 'resetPin'}
  | {type: 'delete'};

const badgeColorByStatus: Record<DriverStatus, string> = {
  active: 'green',
  inactive: 'gray',
  suspended: 'red',
};

const badgeColorByFuelCardStatus: Record<FuelCardStatus, string> = {
  active: 'green',
  inactive: 'gray',
};

const badgeColorByFuelCardCreationStatus: Record<FuelCardCreationStatus, string> = {
  idle: 'gray',
  queued: 'yellow',
  processing: 'blue',
  success: 'green',
  failed: 'red',
};

const formatFuelCardCreationStatus = (value?: FuelCardCreationStatus) => {
  switch (value) {
    case 'queued':
      return 'En file';
    case 'processing':
      return 'En cours';
    case 'success':
      return 'Creee';
    case 'failed':
      return 'Echec';
    case 'idle':
    default:
      return 'En attente';
  }
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(new Date(value))
    : '-';

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const buildDriverName = (driver?: DriverRecord | null) =>
  driver ? [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Conducteur sans nom' : '-';

const buildAgentName = (driver?: DriverRecord | null) =>
  driver?.agent
    ? [driver.agent.firstName, driver.agent.lastName].filter(Boolean).join(' ') || driver.agent.reference || '-'
    : '-';

const formatVehicleStatus = (value?: DriverVehicle['status']) => {
  switch (value) {
    case 'assigned':
      return 'assigne';
    case 'available':
      return 'disponible';
    case 'maintenance':
      return 'maintenance';
    case 'out_of_service':
      return 'hors service';
    default:
      return '-';
  }
};

const formatFuelType = (value?: DriverVehicle['fuelType']) => {
  switch (value) {
    case 'gasoline':
      return 'essence';
    case 'diesel':
      return 'diesel';
    case 'electric':
      return 'electrique';
    case 'hybrid':
      return 'hybride';
    default:
      return '-';
  }
};

const formatPurchaseStatus = (value?: DriverFuelPurchase['status']) => {
  switch (value) {
    case 'completed':
      return 'termine';
    case 'pending':
      return 'en attente';
    case 'processing':
      return 'en cours';
    case 'failed':
      return 'echec';
    case 'cancelled':
      return 'annule';
    default:
      return '-';
  }
};

const formatPaymentMethod = (value?: DriverFuelPurchase['paymentMethod']) => {
  switch (value) {
    case 'cash':
      return 'especes';
    case 'card':
      return 'carte';
    case 'mobile_money':
      return 'mobile money';
    case 'account':
      return 'compte';
    default:
      return '-';
  }
};

const describeAction = (action: DetailAction | null) => {
  if (!action) {
    return {title: '', body: '', confirmLabel: ''};
  }

  if (action.type === 'status') {
    return {
      title: action.nextStatus === 'suspended' ? 'Suspendre le conducteur' : 'Reactiver le conducteur',
      body:
        action.nextStatus === 'suspended'
          ? 'Le conducteur sera suspendu jusqu a une reactivation manuelle.'
          : 'Le conducteur retrouvera son acces des validation de cette action.',
      confirmLabel: action.nextStatus === 'suspended' ? 'Suspendre' : 'Reactiver',
    };
  }

  if (action.type === 'fuelCard') {
    return {
      title:
        action.nextStatus === 'active'
          ? 'Activer la carte carburant'
          : 'Desactiver la carte carburant',
      body:
        action.nextStatus === 'active'
          ? 'La carte carburant sera de nouveau utilisable.'
          : 'La carte carburant sera bloquee jusqu a nouvelle activation.',
      confirmLabel: action.nextStatus === 'active' ? 'Activer' : 'Desactiver',
    };
  }

  if (action.type === 'delete') {
    return {
      title: 'Supprimer le conducteur',
      body: 'Attention, cette action est irréversible. Le compte du conducteur ainsi que ses accès seront définitivement supprimés.',
      confirmLabel: 'Supprimer',
      confirmColor: 'red',
    };
  }

  return {
    title: 'Reinitialiser le code PIN',
    body: 'Un nouveau code PIN a 4 chiffres sera genere pour ce conducteur.',
    confirmLabel: 'Reinitialiser',
  };
};

export function DriverDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {driverId = ''} = useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailAction, setDetailAction] = useState<DetailAction | null>(null);

  const driverQuery = useQuery({
    queryKey: ['drivers', driverId, 'detail'],
    queryFn: async () => {
      const response = await getDriverById(driverId);
      if (!response.success || !response.data) {
        throw new Error('Chargement du conducteur impossible.');
      }

      return response.data;
    },
    enabled: Boolean(driverId),
    retry: false,
  });

  const detailedDataQuery = useQuery({
    queryKey: ['drivers', driverId, 'detailed-data'],
    queryFn: async () => {
      const response = await getDriverDetailedData(driverId);
      if (!response.success) {
        throw new Error('Chargement des indicateurs conducteur impossible.');
      }

      return response.data;
    },
    enabled: Boolean(driverId),
    retry: false,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', 'options', 'driver-detail'],
    queryFn: async () => {
      const response = await listPartners({page: 1, limit: 100});
      return response.companies ?? [];
    },
  });

  const refreshDriver = () => {
    void Promise.all([
      queryClient.invalidateQueries({queryKey: ['drivers']}),
      queryClient.invalidateQueries({queryKey: ['partners']}),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateDriverPayload) => {
      const response = await updateDriver(driverId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour conducteur impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setIsEditModalOpen(false);
      notifications.show({
        color: 'green',
        title: 'Conducteur mis a jour',
        message: response.message || 'Les informations du conducteur ont ete mises a jour.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message:
          error instanceof Error ? error.message : 'La mise a jour du conducteur a echoue.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await deleteDriver(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Suppression impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setDetailAction(null);
      notifications.show({
        color: 'green',
        title: 'Conducteur supprimé',
        message: response.message || 'Le conducteur a été supprimé avec succès.',
      });
      navigate('/drivers');
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Suppression impossible',
        message: error instanceof Error ? error.message : 'La suppression a échoué.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: DriverStatus) => {
      const response = await updateDriverStatus(driverId, nextStatus);
      if (!response.success) {
        throw new Error(response.message || 'Changement de statut impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setDetailAction(null);
      notifications.show({
        color: 'green',
        title: 'Statut mis a jour',
        message: response.message || 'Le statut du conducteur a ete modifie.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message: error instanceof Error ? error.message : 'Le statut n a pas pu etre modifie.',
      });
    },
  });

  const fuelCardMutation = useMutation({
    mutationFn: async (nextStatus: FuelCardStatus) => {
      const response = await updateDriverFuelCard(driverId, nextStatus);
      if (!response.success) {
        throw new Error(response.message || 'Changement de carte carburant impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setDetailAction(null);
      notifications.show({
        color: 'green',
        title: 'Carte carburant mise a jour',
        message: response.message || 'Le statut de la carte carburant a ete modifie.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'Le statut de la carte carburant a echoue.',
      });
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: async () => {
      const response = await resetDriverPin(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Reinitialisation du code PIN impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setDetailAction(null);
      const pinCode =
        response.data && 'pinCode' in response.data ? response.data.pinCode : undefined;
      notifications.show({
        color: 'green',
        title: 'Code PIN reinitialise',
        message: pinCode
          ? `Nouveau code PIN: ${pinCode}`
          : response.message || 'Un nouveau code PIN a ete genere.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'Le code PIN n a pas pu etre reinitialise.',
      });
    },
  });

  const triggerCreationMutation = useMutation({
    mutationFn: async () => {
      const response = await triggerFuelCardCreation(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Demande creation carte TE impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: 'green',
        title: 'Creation carte carburant demandee',
        message: response.message || 'Une demande de creation a ete mise en file.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'La creation de la carte n a pas pu etre demandee.',
      });
    },
  });

  const retryCreationMutation = useMutation({
    mutationFn: async () => {
      const response = await retryFuelCardCreation(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Relance creation carte TE impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: 'green',
        title: 'Relance carte carburant demandee',
        message: response.message || 'Une nouvelle tentative de creation a ete mise en file.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'La relance de la carte n a pas pu etre demandee.',
      });
    },
  });

  const syncBalanceMutation = useMutation({
    mutationFn: async () => {
      const response = await syncFuelCardBalance(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Synchronisation solde impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: 'green',
        title: 'Synchronisation solde demandee',
        message: response.message || 'Une synchronisation du solde carte a ete demandee.',
      });
      refreshDriver();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'La synchronisation du solde a echoue.',
      });
    },
  });

  const driver = driverQuery.data;
  const detailedData = detailedDataQuery.data;
  const currentFuelCardStatus: FuelCardStatus =
    detailedData?.fuelCardStatus || driver?.fuelCardStatus || driver?.fuelCard?.status || 'inactive';
  const currentCreationStatus: FuelCardCreationStatus =
    driver?.fuelCard?.creationStatus ??
    (driver?.fuelCard?.status === 'active' ? 'success' : 'idle');
  const nextDriverStatus: DriverStatus = driver?.status === 'suspended' ? 'active' : 'suspended';
  const nextFuelCardStatus: FuelCardStatus = currentFuelCardStatus === 'active' ? 'inactive' : 'active';
  const actionCopy = describeAction(detailAction);
  const isWorking =
    updateMutation.isPending ||
    statusMutation.isPending ||
    fuelCardMutation.isPending ||
    resetPinMutation.isPending ||
    triggerCreationMutation.isPending ||
    retryCreationMutation.isPending ||
    syncBalanceMutation.isPending;
  const canRetryCreation = currentCreationStatus === 'failed';
  const canTriggerCreation = currentCreationStatus === 'idle' || currentCreationStatus === 'failed';
  const canSyncBalance = currentFuelCardStatus === 'active';

  const assignedProducts = useMemo(() => driver?.assignedProducts ?? [], [driver?.assignedProducts]);
  const relatedVehicles = useMemo(() => {
    const vehicles = detailedData?.vehicles ?? [];

    if (vehicles.length > 0) {
      return vehicles;
    }

    return driver?.assignedVehicle ? [driver.assignedVehicle] : [];
  }, [detailedData?.vehicles, driver?.assignedVehicle]);
  const fuelHistory = useMemo(() => detailedData?.purchases ?? [], [detailedData?.purchases]);

  const handleConfirmAction = async () => {
    if (!detailAction) {
      return;
    }

    if (detailAction.type === 'status') {
      await statusMutation.mutateAsync(detailAction.nextStatus);
      return;
    }

    if (detailAction.type === 'fuelCard') {
      await fuelCardMutation.mutateAsync(detailAction.nextStatus);
      return;
    }

    if (detailAction.type === 'delete') {
      await deleteMutation.mutateAsync();
      return;
    }

    await resetPinMutation.mutateAsync();
  };

  if (driverQuery.isLoading) {
    return (
      <Stack gap="lg">
        <Text c="dimmed">Chargement du conducteur...</Text>
      </Stack>
    );
  }

  if (driverQuery.isError || !driver) {
    return (
      <Stack gap="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/drivers')}>
          Retour a la liste
        </Button>
        <Card withBorder radius="md" padding="lg">
          <Text c="red">Impossible de charger le detail de ce conducteur.</Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/drivers')}>
            Retour a la liste
          </Button>
          <Title order={2} mt="xs">
            {buildDriverName(driver)}
          </Title>
          <Group gap="sm" mt="sm">
            <Badge color={badgeColorByStatus[driver.status ?? 'inactive']} variant="light">
              {driver.status ?? 'inactive'}
            </Badge>
            <Badge color={badgeColorByFuelCardStatus[currentFuelCardStatus]} variant="light">
              Carte carburant {currentFuelCardStatus}
            </Badge>
          </Group>
        </div>
        <Group>
          <Tooltip label="Modifier l'identite, le partenaire ou le statut du conducteur">
            <Button
              variant="default"
              leftSection={<IconEdit size={16} />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Modifier
            </Button>
          </Tooltip>
          <Tooltip
            label={
              nextFuelCardStatus === 'active'
                ? 'Activer la carte carburant de ce conducteur'
                : 'Desactiver la carte carburant de ce conducteur'
            }
          >
            <Button
              variant="default"
              color="gray"
              leftSection={<IconCreditCard size={16} />}
              onClick={() => setDetailAction({type: 'fuelCard', nextStatus: nextFuelCardStatus})}
            >
              Carte carburant
            </Button>
          </Tooltip>
          <Tooltip label="Generer un nouveau code PIN a 4 chiffres">
            <Button
              variant="default"
              color="orange"
              leftSection={<IconKey size={16} />}
              onClick={() => setDetailAction({type: 'resetPin'})}
              loading={resetPinMutation.isPending}
              disabled={isWorking && !resetPinMutation.isPending}
            >
              Reinitialiser PIN
            </Button>
          </Tooltip>
          {canSyncBalance ? (
            <Tooltip label="Synchroniser le solde et les transactions de la carte carburant">
              <Button
                variant="default"
                color="cyan"
                leftSection={<IconRefresh size={16} />}
                onClick={() => syncBalanceMutation.mutateAsync()}
                loading={syncBalanceMutation.isPending}
                disabled={isWorking && !syncBalanceMutation.isPending}
              >
                Sync solde
              </Button>
            </Tooltip>
          ) : null}
          {canRetryCreation ? (
            <Tooltip label="Relancer la creation de la carte TotalEnergies pour ce conducteur">
              <Button
                variant="filled"
                color="orange"
                leftSection={<IconReload size={16} />}
                onClick={() => retryCreationMutation.mutateAsync()}
                loading={retryCreationMutation.isPending}
                disabled={isWorking && !retryCreationMutation.isPending}
              >
                Relancer carte
              </Button>
            </Tooltip>
          ) : canTriggerCreation ? (
            <Tooltip label="Mettre en file la creation de la carte TotalEnergies">
              <Button
                variant="filled"
                color="indigo"
                leftSection={<IconCreditCard size={16} />}
                onClick={() => triggerCreationMutation.mutateAsync()}
                loading={triggerCreationMutation.isPending}
                disabled={isWorking && !triggerCreationMutation.isPending}
              >
                Creer carte
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip
            label={
              nextDriverStatus === 'suspended'
                ? "Suspendre l'acces du conducteur"
                : "Reactiver l'acces du conducteur"
            }
          >
            <Button
              color={nextDriverStatus === 'suspended' ? 'orange' : 'green'}
              leftSection={<IconUserOff size={16} />}
              onClick={() => setDetailAction({type: 'status', nextStatus: nextDriverStatus})}
            >
              {nextDriverStatus === 'suspended' ? 'Suspendre' : 'Reactiver'}
            </Button>
          </Tooltip>
          <Tooltip label="Supprimer le conducteur définitivement">
            <Button
              color="red"
              variant="outline"
              leftSection={<IconUserOff size={16} />}
              onClick={() => setDetailAction({type: 'delete'})}
            >
              Supprimer
            </Button>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{base: 1, md: 4}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Consommation
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(detailedData?.totalConsumption ?? driver.totalConsumption)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Litres
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {detailedData?.totalLiters ?? driver.totalLiters ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cashback disponible
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(detailedData?.cashbackAvailable ?? driver.cashbackAvailable)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cashback utilise
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(detailedData?.cashbackUsed ?? driver.cashbackUsed)}
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, lg: 2}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Informations conducteur
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Nom complet</Table.Th>
                <Table.Td>{buildDriverName(driver)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Td>{driver.reference || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Telephone</Table.Th>
                <Table.Td>{driver.phoneNumber || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Td>{driver.email || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Genre</Table.Th>
                <Table.Td>{driver.gender || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Agent de terrain</Table.Th>
                <Table.Td>{buildAgentName(driver)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Type de vehicule</Table.Th>
                <Table.Td>{driver.vehicleType || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Inscription</Table.Th>
                <Table.Td>{formatDate(driver.createdAt)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Carte carburant
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Statut carte</Table.Th>
                <Table.Td>
                  <Badge color={badgeColorByFuelCardStatus[currentFuelCardStatus]} variant="light">
                    {currentFuelCardStatus}
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Creation TE</Table.Th>
                <Table.Td>
                  <Stack gap={4}>
                    <Group gap={4} wrap="nowrap">
                      <Badge
                        color={badgeColorByFuelCardCreationStatus[currentCreationStatus]}
                        variant="light"
                      >
                        {formatFuelCardCreationStatus(currentCreationStatus)}
                      </Badge>
                      {driver?.fuelCard?.attempts !== undefined && driver.fuelCard.attempts > 0 ? (
                        <Text size="sm" c="dimmed">
                          {driver.fuelCard.attempts} tentative(s)
                        </Text>
                      ) : null}
                    </Group>
                    {driver?.fuelCard?.lastAttemptAt ? (
                      <Text size="xs" c="dimmed">
                        Derniere tentative: {formatDate(driver.fuelCard.lastAttemptAt)}
                      </Text>
                    ) : null}
                    {driver?.fuelCard?.lastError ? (
                      <Tooltip label={driver.fuelCard.lastError}>
                        <Text size="xs" c="red" lineClamp={2}>
                          Erreur: {driver.fuelCard.lastError}
                        </Text>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Numero de carte</Table.Th>
                <Table.Td>
                  <Text fw={700} ff="monospace">
                    {driver?.phoneNumber || '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
              {driver?.fuelCard?.externalReference ? (
                <Table.Tr>
                  <Table.Th>Reference TE</Table.Th>
                  <Table.Td>{driver.fuelCard.externalReference}</Table.Td>
                </Table.Tr>
              ) : null}
              <Table.Tr>
                <Table.Th>Partenaire</Table.Th>
                <Table.Td>
                  {driver.company?.companyInfos?.name || driver.company?.reference || '-'}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Cashback disponible</Table.Th>
                <Table.Td>
                  {formatCurrency(detailedData?.cashbackAvailable ?? driver.cashbackAvailable)}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Cashback utilise</Table.Th>
                <Table.Td>{formatCurrency(detailedData?.cashbackUsed ?? driver.cashbackUsed)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, lg: 2}} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Agent de terrain
          </Title>
          {driver.agent ? (
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Td>{buildAgentName(driver)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Td>{driver.agent.reference || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Telephone</Table.Th>
                  <Table.Td>{driver.agent.phoneNumber || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Td>{driver.agent.email || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Statut</Table.Th>
                  <Table.Td>
                    <Badge color={badgeColorByStatus[driver.agent.status ?? 'inactive']} variant="light">
                      {driver.agent.status ?? 'inactive'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed">Aucun agent n est actuellement rattache a ce conducteur.</Text>
          )}
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Vehicules lies
          </Title>
          {relatedVehicles.length > 0 ? (
            <Table.ScrollContainer minWidth={560}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Reference</Table.Th>
                    <Table.Th>Vehicule</Table.Th>
                    <Table.Th>Immatriculation</Table.Th>
                    <Table.Th>Carburant</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Kilometrage</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {relatedVehicles.map((vehicle) => (
                    <Table.Tr key={vehicle._id || vehicle.reference}>
                      <Table.Td>{vehicle.reference || '-'}</Table.Td>
                      <Table.Td>
                        {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '-'}
                      </Table.Td>
                      <Table.Td>{vehicle.licensePlate || '-'}</Table.Td>
                      <Table.Td>{formatFuelType(vehicle.fuelType)}</Table.Td>
                      <Table.Td>{formatVehicleStatus(vehicle.status)}</Table.Td>
                      <Table.Td>{vehicle.mileage ?? 0}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Stack gap="xs">
              <Text c="dimmed">Aucun vehicule n est actuellement lie a ce conducteur.</Text>
              <Text size="sm" c="dimmed">
                L application ne conserve pas encore un historique complet des changements de vehicule.
              </Text>
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Historique carburant
        </Title>
        {fuelHistory.length > 0 ? (
          <Table.ScrollContainer minWidth={840}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Station</Table.Th>
                  <Table.Th>Produit</Table.Th>
                  <Table.Th>Litres</Table.Th>
                  <Table.Th>Montant</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Paiement</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Recharge par</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {fuelHistory.map((purchase) => (
                  <Table.Tr key={purchase._id || `${purchase.station}-${purchase.createdAt}`}>
                    <Table.Td>{formatDate(purchase.createdAt)}</Table.Td>
                    <Table.Td>{purchase.station || '-'}</Table.Td>
                    <Table.Td>{purchase.product || '-'}</Table.Td>
                    <Table.Td>{purchase.liters ?? 0}</Table.Td>
                    <Table.Td>{formatCurrency(purchase.totalAmount)}</Table.Td>
                    <Table.Td>{formatPurchaseStatus(purchase.status)}</Table.Td>
                    <Table.Td>{formatPaymentMethod(purchase.paymentMethod)}</Table.Td>
                    <Table.Td>{purchase.source || '-'}</Table.Td>
                    <Table.Td>{purchase.rechargedBy || '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Text c="dimmed">Aucun achat carburant n a encore ete remonte pour ce conducteur.</Text>
        )}
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Produits assignes
        </Title>
        {assignedProducts.length > 0 ? (
          <Group gap="sm">
            {assignedProducts.map((product) => (
              <Badge key={product._id || product.name} variant="outline">
                {product.name || 'Produit'}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text c="dimmed">Aucun produit assigne a ce conducteur.</Text>
        )}
      </Card>

      <DriverFormModal
        opened={isEditModalOpen}
        mode="edit"
        driver={driver}
        partners={partnersQuery.data ?? []}
        isSubmitting={updateMutation.isPending}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload as UpdateDriverPayload);
        }}
      />

      <Modal
        opened={Boolean(detailAction)}
        onClose={() => setDetailAction(null)}
        title={actionCopy.title}
        centered
      >
        <Stack>
          <Text>{actionCopy.body}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDetailAction(null)}>
              Annuler
            </Button>
            <Button color="dark" onClick={handleConfirmAction} loading={isWorking}>
              {actionCopy.confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
