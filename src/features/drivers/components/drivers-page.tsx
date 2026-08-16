import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCreditCard,
  IconEdit,
  IconEye,
  IconKey,
  IconPlus,
  IconSearch,
  IconUserCheck,
  IconUserOff,
} from '@tabler/icons-react';

import { listPartners } from '@/features/partners/api/partners-api';
import type { PartnerCompany } from '@/features/partners/types';

import {
  createDriver,
  getDriversStats,
  listDrivers,
  resetDriverPin,
  updateDriver,
  updateDriverFuelCard,
  updateDriverStatus,
} from '../api/drivers-api';
import { DriverFormModal } from './driver-form-modal';
import type {
  CreateDriverPayload,
  DriverRecord,
  DriverStatus,
  FuelCardStatus,
  UpdateDriverPayload,
} from '../types';

const statusFilterOptions = [
  {value: '', label: 'Tous les statuts'},
  {value: 'active', label: 'Actif'},
  {value: 'inactive', label: 'Inactif'},
  {value: 'suspended', label: 'Suspendu'},
];

const badgeColorByStatus: Record<DriverStatus, string> = {
  active: 'green',
  inactive: 'gray',
  suspended: 'red',
};

const badgeColorByFuelCardStatus: Record<FuelCardStatus, string> = {
  active: 'green',
  inactive: 'gray',
};

type ConfirmAction =
  | {type: 'status'; driver: DriverRecord; nextStatus: DriverStatus}
  | {type: 'fuelCard'; driver: DriverRecord; nextStatus: FuelCardStatus}
  | {type: 'resetPin'; driver: DriverRecord};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
      }).format(new Date(value))
    : '-';

const buildDriverName = (driver: DriverRecord) =>
  [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Conducteur sans nom';

const buildPartnerName = (company?: DriverRecord['company']) =>
  company?.companyInfos?.name || company?.reference || '-';

const getFuelCardStatus = (driver: DriverRecord): FuelCardStatus =>
  driver.fuelCardStatus || driver.fuelCard?.status || 'inactive';

const describeConfirmAction = (action: ConfirmAction | null) => {
  if (!action) {
    return {
      title: '',
      body: '',
      confirmLabel: '',
    };
  }

  if (action.type === 'status') {
    return {
      title: action.nextStatus === 'suspended' ? 'Suspendre le conducteur' : 'Reactiver le conducteur',
      body:
        action.nextStatus === 'suspended'
          ? 'Le conducteur ne pourra plus se connecter tant que son statut restera suspendu.'
          : 'Le conducteur retrouvera immediatement son acces au service.',
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
          ? 'La carte carburant deviendra disponible pour les operations du conducteur.'
          : 'La carte carburant sera indisponible jusqu a une nouvelle activation.',
      confirmLabel: action.nextStatus === 'active' ? 'Activer' : 'Desactiver',
    };
  }

  return {
    title: 'Reinitialiser le code PIN',
    body: 'Un nouveau code PIN a 4 chiffres sera genere pour ce conducteur.',
    confirmLabel: 'Reinitialiser',
  };
};

export function DriversPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'' | DriverStatus>('');
  const [companyRef, setCompanyRef] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const driversQuery = useQuery({
    queryKey: ['drivers', page, searchTerm, status, companyRef],
    queryFn: async () => {
      const response = await listDrivers({
        page,
        limit: 10,
        searchTerm,
        status,
        companyRef,
      });

      if (!response.success) {
        throw new Error('Chargement des conducteurs impossible.');
      }

      return response.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['drivers', 'stats'],
    queryFn: async () => {
      const response = await getDriversStats();
      if (!response.success) {
        throw new Error('Chargement des statistiques conducteurs impossible.');
      }

      return response.data;
    },
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', 'options', 'drivers'],
    queryFn: async () => {
      const response = await listPartners({page: 1, limit: 100});
      return response.companies ?? [];
    },
  });

  const refreshDrivers = () => {
    void Promise.all([
      queryClient.invalidateQueries({queryKey: ['drivers']}),
      queryClient.invalidateQueries({queryKey: ['partners']}),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateDriverPayload) => {
      const response = await createDriver(payload);
      if (!response.success) {
        throw new Error(response.message || 'Creation conducteur impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setIsFormModalOpen(false);
      setSelectedDriver(null);
      notifications.show({
        color: 'green',
        title: 'Conducteur cree',
        message: response.message || 'Le conducteur a bien ete cree.',
      });
      refreshDrivers();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Creation impossible',
        message:
          error instanceof Error ? error.message : 'Le conducteur n a pas pu etre cree.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      driverId,
      payload,
    }: {
      driverId: string;
      payload: UpdateDriverPayload;
    }) => {
      const response = await updateDriver(driverId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour conducteur impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setIsFormModalOpen(false);
      setSelectedDriver(null);
      notifications.show({
        color: 'green',
        title: 'Conducteur mis a jour',
        message: response.message || 'Les informations du conducteur ont ete mises a jour.',
      });
      refreshDrivers();
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

  const statusMutation = useMutation({
    mutationFn: async ({
      driverId,
      nextStatus,
    }: {
      driverId: string;
      nextStatus: DriverStatus;
    }) => {
      const response = await updateDriverStatus(driverId, nextStatus);
      if (!response.success) {
        throw new Error(response.message || 'Changement de statut impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
      notifications.show({
        color: 'green',
        title: 'Statut mis a jour',
        message: response.message || 'Le statut du conducteur a ete modifie.',
      });
      refreshDrivers();
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
    mutationFn: async ({
      driverId,
      nextStatus,
    }: {
      driverId: string;
      nextStatus: FuelCardStatus;
    }) => {
      const response = await updateDriverFuelCard(driverId, nextStatus);
      if (!response.success) {
        throw new Error(response.message || 'Changement de carte carburant impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
      notifications.show({
        color: 'green',
        title: 'Carte carburant mise a jour',
        message: response.message || 'Le statut de la carte carburant a ete modifie.',
      });
      refreshDrivers();
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
    mutationFn: async (driverId: string) => {
      const response = await resetDriverPin(driverId);
      if (!response.success) {
        throw new Error(response.message || 'Reinitialisation du code PIN impossible.');
      }

      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
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

  const partnerOptions = useMemo(
    () => [
      {value: '', label: 'Tous les partenaires'},
      ...(partnersQuery.data ?? []).map((partner: PartnerCompany) => ({
        value: partner.reference,
        label: partner.companyInfos?.name || partner.reference,
      })),
    ],
    [partnersQuery.data]
  );

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedDriver(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (driver: DriverRecord) => {
    setModalMode('edit');
    setSelectedDriver(driver);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (payload: CreateDriverPayload | UpdateDriverPayload) => {
    if (modalMode === 'create') {
      await createMutation.mutateAsync(payload as CreateDriverPayload);
      return;
    }

    if (!selectedDriver) {
      return;
    }

    await updateMutation.mutateAsync({
      driverId: selectedDriver._id,
      payload: payload as UpdateDriverPayload,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === 'status') {
      await statusMutation.mutateAsync({
        driverId: confirmAction.driver._id,
        nextStatus: confirmAction.nextStatus,
      });
      return;
    }

    if (confirmAction.type === 'fuelCard') {
      await fuelCardMutation.mutateAsync({
        driverId: confirmAction.driver._id,
        nextStatus: confirmAction.nextStatus,
      });
      return;
    }

    await resetPinMutation.mutateAsync(confirmAction.driver._id);
  };

  const rows = driversQuery.data?.drivers ?? [];
  const pagination = driversQuery.data?.pagination;
  const confirmCopy = describeConfirmAction(confirmAction);
  const isConfirming =
    statusMutation.isPending || fuelCardMutation.isPending || resetPinMutation.isPending;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Operations conducteurs
          </Text>
          <Title order={2}>Gestion des conducteurs</Title>
          <Text c="dimmed" mt="sm">
            Creation, suivi detaille, suspension logique et gestion de la carte carburant.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Creer un conducteur
        </Button>
      </Group>

      <Group grow>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Total conducteurs
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {statsQuery.data?.totalDrivers ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Actifs
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {statsQuery.data?.activeDrivers ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Nouvelles inscriptions
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {statsQuery.data?.newDrivers ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Cartes actives
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {statsQuery.data?.activeFuelCards ?? 0}
          </Text>
        </Card>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group grow align="flex-end">
            <TextInput
              label="Recherche"
              placeholder="Nom, reference, email, telephone"
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.currentTarget.value);
                setPage(1);
              }}
            />
            <Select
              label="Statut"
              data={statusFilterOptions}
              value={status}
              onChange={(value) => {
                setStatus((value as DriverStatus | null) ?? '');
                setPage(1);
              }}
            />
            <Select
              label="Partenaire"
              data={partnerOptions}
              value={companyRef}
              onChange={(value) => {
                setCompanyRef(value ?? '');
                setPage(1);
              }}
              searchable
            />
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Partenaire</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Carte carburant</Table.Th>
                <Table.Th>Creation</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((driver) => {
                const fuelCardStatus = getFuelCardStatus(driver);
                const nextDriverStatus: DriverStatus =
                  driver.status === 'suspended' ? 'active' : 'suspended';
                const nextFuelCardStatus: FuelCardStatus =
                  fuelCardStatus === 'active' ? 'inactive' : 'active';

                return (
                  <Table.Tr key={driver._id}>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text fw={600}>{buildDriverName(driver)}</Text>
                        <Text size="sm" c="dimmed">
                          {driver.phoneNumber || driver.email || '-'}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{driver.reference || '-'}</Table.Td>
                    <Table.Td>{buildPartnerName(driver.company)}</Table.Td>
                    <Table.Td>
                      <Badge color={badgeColorByStatus[driver.status ?? 'inactive']} variant="light">
                        {driver.status ?? 'inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={badgeColorByFuelCardStatus[fuelCardStatus]}
                        variant="light"
                      >
                        {fuelCardStatus}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDate(driver.createdAt)}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Voir les informations detaillees du conducteur">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => navigate(`/drivers/${driver._id}`)}
                            aria-label="Voir le detail"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Modifier l'identite, le partenaire ou le statut">
                          <ActionIcon
                            variant="light"
                            color="gray"
                            onClick={() => openEditModal(driver)}
                            aria-label="Modifier le conducteur"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={
                            nextDriverStatus === 'suspended'
                              ? 'Suspendre l acces du conducteur'
                              : 'Reactiver l acces du conducteur'
                          }
                        >
                          <ActionIcon
                            variant="light"
                            color={nextDriverStatus === 'suspended' ? 'red' : 'green'}
                            onClick={() =>
                              setConfirmAction({type: 'status', driver, nextStatus: nextDriverStatus})
                            }
                            aria-label="Changer le statut"
                          >
                            {nextDriverStatus === 'suspended' ? (
                              <IconUserOff size={16} />
                            ) : (
                              <IconUserCheck size={16} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={
                            nextFuelCardStatus === 'active'
                              ? 'Activer la carte carburant'
                              : 'Desactiver la carte carburant'
                          }
                        >
                          <ActionIcon
                            variant="light"
                            color={nextFuelCardStatus === 'active' ? 'green' : 'yellow'}
                            onClick={() =>
                              setConfirmAction({
                                type: 'fuelCard',
                                driver,
                                nextStatus: nextFuelCardStatus,
                              })
                            }
                            aria-label="Basculer la carte carburant"
                          >
                            <IconCreditCard size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Generer un nouveau code PIN a 4 chiffres">
                          <ActionIcon
                            variant="light"
                            color="orange"
                            onClick={() => setConfirmAction({type: 'resetPin', driver})}
                            aria-label="Reinitialiser le code PIN"
                          >
                            <IconKey size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {!driversQuery.isLoading && rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">
                      Aucun conducteur ne correspond aux filtres en cours.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {driversQuery.isLoading
                ? 'Chargement des conducteurs...'
                : `${pagination?.total ?? 0} conducteur(s)`}
            </Text>
            <Pagination
              value={pagination?.page ?? page}
              onChange={setPage}
              total={Math.max(pagination?.totalPages ?? 1, 1)}
            />
          </Group>
        </Stack>
      </Card>

      <DriverFormModal
        opened={isFormModalOpen}
        mode={modalMode}
        driver={selectedDriver}
        partners={partnersQuery.data ?? []}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedDriver(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <Modal
        opened={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmCopy.title}
        centered
      >
        <Stack>
          <Text>{confirmCopy.body}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
            <Button color="dark" onClick={handleConfirmAction} loading={isConfirming}>
              {confirmCopy.confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
