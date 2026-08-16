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
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
} from '@tabler/icons-react';

import { listDrivers } from '@/features/drivers/api/drivers-api';
import type { DriverRecord } from '@/features/drivers/types';
import { listPartners } from '@/features/partners/api/partners-api';

import {
  assignVehicleDriver,
  createVehicle,
  deleteVehicle,
  getVehiclesStats,
  listVehicles,
  unassignVehicleDriver,
  updateVehicle,
  updateVehicleStatus,
} from '../api/vehicles-api';
import { VehicleAssignmentModal } from './vehicle-assignment-modal';
import { VehicleFormModal } from './vehicle-form-modal';
import type {
  CreateVehiclePayload,
  ListVehiclesParams,
  UpdateVehiclePayload,
  VehicleFuelType,
  VehicleRecord,
  VehicleStatus,
} from '../types';

const statusFilterOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Assigne' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Hors service' },
];

const fuelTypeFilterOptions = [
  { value: '', label: 'Tous les carburants' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline', label: 'Essence' },
  { value: 'electric', label: 'Electrique' },
  { value: 'hybrid', label: 'Hybride' },
];

const badgeColorByStatus: Record<VehicleStatus, string> = {
  available: 'green',
  assigned: 'blue',
  maintenance: 'orange',
  out_of_service: 'red',
};

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '-';

const formatFuelType = (value?: VehicleFuelType) => {
  switch (value) {
    case 'diesel':
      return 'Diesel';
    case 'gasoline':
      return 'Essence';
    case 'electric':
      return 'Electrique';
    case 'hybrid':
      return 'Hybride';
    default:
      return '-';
  }
};

const buildVehicleLabel = (vehicle: VehicleRecord) =>
  [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.reference || 'Vehicule';

const buildDriverLabel = (driver?: VehicleRecord['assignedDriver'] | null) =>
  driver ? [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.reference || '-' : '-';

type ConfirmAction =
  | { type: 'delete'; vehicle: VehicleRecord }
  | { type: 'status'; vehicle: VehicleRecord; nextStatus: VehicleStatus };

const describeConfirmAction = (action: ConfirmAction | null) => {
  if (!action) {
    return { title: '', body: '', confirmLabel: '' };
  }

  if (action.type === 'delete') {
    return {
      title: 'Supprimer le vehicule',
      body: 'Le vehicule sera retire du parc (suppression logique).',
      confirmLabel: 'Supprimer',
    };
  }

  return {
    title: 'Changer le statut',
    body: `Le statut passera a ${action.nextStatus}.`,
    confirmLabel: 'Mettre a jour',
  };
};

export function VehiclesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'' | VehicleStatus>('');
  const [fuelType, setFuelType] = useState<'' | VehicleFuelType>('');
  const [companyRef, setCompanyRef] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [assignmentVehicle, setAssignmentVehicle] = useState<VehicleRecord | null>(null);

  const partnersQuery = useQuery({
    queryKey: ['partners', 'options', 'vehicles'],
    queryFn: async () => {
      const response = await listPartners({ page: 1, limit: 100 });
      return response.companies ?? [];
    },
  });

  const partnerOptions = useMemo(
    () => [
      { value: '', label: 'Tous les partenaires' },
      ...(partnersQuery.data ?? []).map((partner) => ({
        value: partner.reference,
        label: partner.companyInfos?.name || partner.reference,
      })),
    ],
    [partnersQuery.data]
  );

  const listParams: ListVehiclesParams = useMemo(
    () => ({
      page,
      limit: 10,
      searchTerm,
      status,
      fuelType,
      companyRef,
    }),
    [companyRef, fuelType, page, searchTerm, status]
  );

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', listParams],
    queryFn: async () => {
      const response = await listVehicles(listParams);
      if (!response.success) {
        throw new Error('Chargement des vehicules impossible.');
      }
      return response.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['vehicles', 'stats', companyRef],
    queryFn: async () => {
      const response = await getVehiclesStats(companyRef);
      if (!response.success) {
        throw new Error('Chargement des statistiques vehicules impossible.');
      }
      return response.data;
    },
  });

  const driversQuery = useQuery({
    queryKey: ['drivers', 'assignment', assignmentVehicle?.company?.reference],
    queryFn: async () => {
      const response = await listDrivers({
        page: 1,
        limit: 100,
        companyRef: assignmentVehicle?.company?.reference ?? '',
        status: 'active',
      });
      if (!response.success) {
        throw new Error('Chargement des conducteurs impossible.');
      }
      return response.data.drivers;
    },
    enabled: Boolean(assignmentVehicle?.company?.reference),
    retry: false,
  });

  const refreshVehicles = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['partners'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateVehiclePayload) => {
      const response = await createVehicle(payload);
      if (!response.success) {
        throw new Error(response.message || 'Creation vehicule impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setIsFormModalOpen(false);
      setSelectedVehicle(null);
      notifications.show({
        color: 'green',
        title: 'Vehicule ajoute',
        message: response.message || 'Le vehicule a bien ete cree.',
      });
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Creation impossible',
        message: error instanceof Error ? error.message : 'Le vehicule n a pas pu etre cree.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ vehicleId, payload }: { vehicleId: string; payload: UpdateVehiclePayload }) => {
      const response = await updateVehicle(vehicleId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour vehicule impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setIsFormModalOpen(false);
      setSelectedVehicle(null);
      notifications.show({
        color: 'green',
        title: 'Vehicule mis a jour',
        message: response.message || 'Les informations du vehicule ont ete mises a jour.',
      });
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message: error instanceof Error ? error.message : 'La mise a jour du vehicule a echoue.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await deleteVehicle(vehicleId);
      if (!response.success) {
        throw new Error(response.message || 'Suppression vehicule impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
      notifications.show({
        color: 'green',
        title: 'Vehicule supprime',
        message: response.message || 'Le vehicule a ete retire du parc.',
      });
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Suppression impossible',
        message: error instanceof Error ? error.message : 'Le vehicule n a pas pu etre supprime.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ vehicleId, nextStatus }: { vehicleId: string; nextStatus: VehicleStatus }) => {
      const response = await updateVehicleStatus(vehicleId, nextStatus);
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
        message: response.message || 'Le statut du vehicule a ete modifie.',
      });
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message: error instanceof Error ? error.message : 'Le statut n a pas pu etre modifie.',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) => {
      const response = await assignVehicleDriver(vehicleId, driverId);
      if (!response.success) {
        throw new Error(response.message || 'Affectation impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: 'green',
        title: 'Conducteur affecte',
        message: response.message || 'Le conducteur a ete affecte au vehicule.',
      });
      setAssignmentVehicle(null);
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Affectation impossible',
        message: error instanceof Error ? error.message : 'Le conducteur n a pas pu etre affecte.',
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await unassignVehicleDriver(vehicleId);
      if (!response.success) {
        throw new Error(response.message || 'Retrait impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      notifications.show({
        color: 'green',
        title: 'Conducteur retire',
        message: response.message || 'Le conducteur a ete retire du vehicule.',
      });
      setAssignmentVehicle(null);
      refreshVehicles();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Retrait impossible',
        message: error instanceof Error ? error.message : 'Le conducteur n a pas pu etre retire.',
      });
    },
  });

  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const pagination = vehiclesQuery.data?.pagination;
  const stats = statsQuery.data;
  const confirmCopy = describeConfirmAction(confirmAction);
  const isWorking =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    statusMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === 'delete') {
      await deleteMutation.mutateAsync(confirmAction.vehicle._id);
      return;
    }

    await statusMutation.mutateAsync({
      vehicleId: confirmAction.vehicle._id,
      nextStatus: confirmAction.nextStatus,
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Vehicules</Title>
          <Text c="dimmed" mt={4}>
            Gestion du parc roulant: statut, affectations et maintenance.
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setModalMode('create');
            setSelectedVehicle(null);
            setIsFormModalOpen(true);
          }}
        >
          Ajouter un vehicule
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Vehicules suivis
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.total ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Assignes
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.assigned ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Disponibles
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {stats?.available ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Maintenance / hors service
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {(stats?.maintenance ?? 0) + (stats?.out_of_service ?? 0)}
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" wrap="wrap">
          <Group>
            <TextInput
              placeholder="Rechercher par reference, plaque, VIN..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.currentTarget.value);
                setPage(1);
              }}
            />
            <Select
              data={partnerOptions}
              value={companyRef}
              onChange={(value) => {
                setCompanyRef(value ?? '');
                setPage(1);
              }}
              searchable
            />
            <Select
              data={statusFilterOptions}
              value={status}
              onChange={(value) => {
                setStatus((value as VehicleStatus | null) ?? '');
                setPage(1);
              }}
            />
            <Select
              data={fuelTypeFilterOptions}
              value={fuelType}
              onChange={(value) => {
                setFuelType((value as VehicleFuelType | null) ?? '');
                setPage(1);
              }}
            />
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={920} mt="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Vehicule</Table.Th>
                <Table.Th>Immatriculation</Table.Th>
                <Table.Th>Carburant</Table.Th>
                <Table.Th>Conducteur</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Kilometrage</Table.Th>
                <Table.Th>Mise a jour</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {vehicles.map((vehicle) => (
                <Table.Tr key={vehicle._id}>
                  <Table.Td>{vehicle.reference || '-'}</Table.Td>
                  <Table.Td>{buildVehicleLabel(vehicle)}</Table.Td>
                  <Table.Td>{vehicle.licensePlate || '-'}</Table.Td>
                  <Table.Td>{formatFuelType(vehicle.fuelType)}</Table.Td>
                  <Table.Td>{buildDriverLabel(vehicle.assignedDriver)}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={badgeColorByStatus[vehicle.status ?? 'available']}
                      variant="light"
                    >
                      {vehicle.status ?? 'available'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{vehicle.mileage ?? 0}</Table.Td>
                  <Table.Td>{formatDateTime(vehicle.updatedAt)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label="Voir le detail du vehicule">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => navigate(`/vehicles/${vehicle._id}`)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Modifier le vehicule">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => {
                            setModalMode('edit');
                            setSelectedVehicle(vehicle);
                            setIsFormModalOpen(true);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Affecter ou retirer un conducteur">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => setAssignmentVehicle(vehicle)}
                        >
                          {vehicle.assignedDriver ? <IconUserMinus size={16} /> : <IconUserPlus size={16} />}
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Supprimer le vehicule">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => setConfirmAction({ type: 'delete', vehicle })}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {vehicles.length === 0 && !vehiclesQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed">Aucun vehicule trouve.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {pagination ? (
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Page {pagination.page} / {pagination.totalPages || 1} ({pagination.total} vehicules)
            </Text>
            <Pagination
              value={page}
              onChange={setPage}
              total={pagination.totalPages || 1}
            />
          </Group>
        ) : null}
      </Card>

      <VehicleFormModal
        opened={isFormModalOpen}
        mode={modalMode}
        vehicle={selectedVehicle}
        partners={partnersQuery.data ?? []}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={async (payload) => {
          if (modalMode === 'create') {
            await createMutation.mutateAsync(payload as CreateVehiclePayload);
            return;
          }

          if (!selectedVehicle) {
            return;
          }

          await updateMutation.mutateAsync({
            vehicleId: selectedVehicle._id,
            payload: payload as UpdateVehiclePayload,
          });
        }}
      />

      <VehicleAssignmentModal
        opened={Boolean(assignmentVehicle)}
        drivers={(driversQuery.data ?? []) as DriverRecord[]}
        currentDriverId={assignmentVehicle?.assignedDriver?._id ?? null}
        isSubmitting={assignMutation.isPending || unassignMutation.isPending}
        onClose={() => setAssignmentVehicle(null)}
        onAssign={async (driverId) => {
          if (!assignmentVehicle) {
            return;
          }
          await assignMutation.mutateAsync({ vehicleId: assignmentVehicle._id, driverId });
        }}
        onUnassign={async () => {
          if (!assignmentVehicle) {
            return;
          }
          await unassignMutation.mutateAsync(assignmentVehicle._id);
        }}
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
            <Button color="dark" onClick={() => void handleConfirm()} loading={isWorking}>
              {confirmCopy.confirmLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

