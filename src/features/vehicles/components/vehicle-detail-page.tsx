import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconEdit, IconPlus, IconUserMinus, IconUserPlus } from '@tabler/icons-react';

import { listDrivers } from '@/features/drivers/api/drivers-api';
import type { DriverRecord } from '@/features/drivers/types';
import { listPartners } from '@/features/partners/api/partners-api';

import {
  assignVehicleDriver,
  completeVehicleMaintenanceTask,
  createVehicleMaintenanceTask,
  deleteVehicleMaintenanceTask,
  getVehicleById,
  listVehicleMaintenanceTasks,
  unassignVehicleDriver,
  updateVehicle,
  updateVehicleMaintenanceTask,
  updateVehicleStatus,
} from '../api/vehicles-api';
import { MaintenanceTaskModal } from './maintenance-task-modal';
import { VehicleAssignmentModal } from './vehicle-assignment-modal';
import { VehicleFormModal } from './vehicle-form-modal';
import type {
  CreateMaintenanceTaskPayload,
  MaintenanceTaskRecord,
  UpdateMaintenanceTaskPayload,
  UpdateVehiclePayload,
  VehicleFuelType,
  VehicleRecord,
  VehicleStatus,
} from '../types';

const badgeColorByStatus: Record<VehicleStatus, string> = {
  available: 'green',
  assigned: 'blue',
  maintenance: 'orange',
  out_of_service: 'red',
};

const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) : '-';

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

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

const buildVehicleLabel = (vehicle?: VehicleRecord | null) =>
  vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.reference || '-' : '-';

const buildDriverLabel = (driver?: VehicleRecord['assignedDriver'] | null) =>
  driver ? [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.reference || '-' : '-';

const formatTaskType = (value?: MaintenanceTaskRecord['type']) => {
  switch (value) {
    case 'oil_change':
      return 'Vidange';
    case 'tire_rotation':
      return 'Pneus';
    case 'brake_check':
      return 'Freins';
    case 'inspection':
      return 'Inspection';
    case 'repair':
      return 'Reparation';
    case 'other':
      return 'Autre';
    default:
      return '-';
  }
};

const formatTaskStatus = (value?: MaintenanceTaskRecord['status']) => {
  switch (value) {
    case 'pending':
      return 'En attente';
    case 'scheduled':
      return 'Planifie';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Termine';
    case 'cancelled':
      return 'Annule';
    default:
      return '-';
  }
};

type ConfirmAction =
  | { type: 'status'; nextStatus: VehicleStatus }
  | { type: 'completeTask'; task: MaintenanceTaskRecord }
  | { type: 'deleteTask'; task: MaintenanceTaskRecord };

const describeConfirmAction = (action: ConfirmAction | null) => {
  if (!action) {
    return { title: '', body: '', confirmLabel: '' };
  }

  if (action.type === 'status') {
    return { title: 'Changer le statut', body: `Le statut passera a ${action.nextStatus}.`, confirmLabel: 'Mettre a jour' };
  }

  if (action.type === 'deleteTask') {
    return { title: 'Supprimer la tache', body: 'La tache de maintenance sera supprimee.', confirmLabel: 'Supprimer' };
  }

  return { title: 'Completer la tache', body: 'La tache passera au statut termine.', confirmLabel: 'Completer' };
};

export function VehicleDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { vehicleId = '' } = useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTaskRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [tasksPage, setTasksPage] = useState(1);

  const vehicleQuery = useQuery({
    queryKey: ['vehicles', vehicleId, 'detail'],
    queryFn: async () => {
      const response = await getVehicleById(vehicleId);
      if (!response.success || !response.data?.vehicle) {
        throw new Error('Chargement du vehicule impossible.');
      }
      return response.data;
    },
    enabled: Boolean(vehicleId),
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: ['vehicles', vehicleId, 'maintenance', tasksPage],
    queryFn: async () => {
      const response = await listVehicleMaintenanceTasks(vehicleId, tasksPage, 10);
      if (!response.success) {
        throw new Error('Chargement des taches de maintenance impossible.');
      }
      return response.data;
    },
    enabled: Boolean(vehicleId),
    retry: false,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', 'options', 'vehicle-detail'],
    queryFn: async () => {
      const response = await listPartners({ page: 1, limit: 100 });
      return response.companies ?? [];
    },
  });

  const driversQuery = useQuery({
    queryKey: ['drivers', 'assignment', vehicleQuery.data?.vehicle.company?.reference],
    queryFn: async () => {
      const response = await listDrivers({
        page: 1,
        limit: 100,
        companyRef: vehicleQuery.data?.vehicle.company?.reference ?? '',
        status: 'active',
      });
      if (!response.success) {
        throw new Error('Chargement des conducteurs impossible.');
      }
      return response.data.drivers;
    },
    enabled: Boolean(vehicleQuery.data?.vehicle.company?.reference) && assignmentOpen,
    retry: false,
  });

  const refreshVehicle = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['drivers'] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateVehiclePayload) => {
      const response = await updateVehicle(vehicleId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour vehicule impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setIsEditModalOpen(false);
      notifications.show({
        color: 'green',
        title: 'Vehicule mis a jour',
        message: response.message || 'Les informations du vehicule ont ete mises a jour.',
      });
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message: error instanceof Error ? error.message : 'La mise a jour du vehicule a echoue.',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: VehicleStatus) => {
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
      refreshVehicle();
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
    mutationFn: async (driverId: string) => {
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
      setAssignmentOpen(false);
      refreshVehicle();
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
    mutationFn: async () => {
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
      setAssignmentOpen(false);
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Retrait impossible',
        message: error instanceof Error ? error.message : 'Le conducteur n a pas pu etre retire.',
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: CreateMaintenanceTaskPayload) => {
      const response = await createVehicleMaintenanceTask(vehicleId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Creation tache impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setTaskModalOpen(false);
      setSelectedTask(null);
      notifications.show({
        color: 'green',
        title: 'Tache ajoutee',
        message: response.message || 'La tache de maintenance a ete creee.',
      });
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Creation impossible',
        message: error instanceof Error ? error.message : 'La tache de maintenance a echoue.',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: UpdateMaintenanceTaskPayload }) => {
      const response = await updateVehicleMaintenanceTask(vehicleId, taskId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour tache impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setTaskModalOpen(false);
      setSelectedTask(null);
      notifications.show({
        color: 'green',
        title: 'Tache mise a jour',
        message: response.message || 'La tache de maintenance a ete mise a jour.',
      });
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message: error instanceof Error ? error.message : 'La mise a jour de la tache a echoue.',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await deleteVehicleMaintenanceTask(vehicleId, taskId);
      if (!response.success) {
        throw new Error(response.message || 'Suppression tache impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
      notifications.show({
        color: 'green',
        title: 'Tache supprimee',
        message: response.message || 'La tache de maintenance a ete supprimee.',
      });
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Suppression impossible',
        message: error instanceof Error ? error.message : 'La tache n a pas pu etre supprimee.',
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await completeVehicleMaintenanceTask(vehicleId, taskId, {});
      if (!response.success) {
        throw new Error(response.message || 'Completion impossible.');
      }
      return response;
    },
    onSuccess: (response) => {
      setConfirmAction(null);
      notifications.show({
        color: 'green',
        title: 'Tache completee',
        message: response.message || 'La tache de maintenance est terminee.',
      });
      refreshVehicle();
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message: error instanceof Error ? error.message : 'La tache n a pas pu etre completee.',
      });
    },
  });

  const vehicle = vehicleQuery.data?.vehicle;
  const maintenanceSummary = vehicleQuery.data?.maintenanceSummary;
  const tasks = tasksQuery.data?.tasks ?? [];
  const tasksPagination = tasksQuery.data?.pagination;
  const confirmCopy = describeConfirmAction(confirmAction);

  const nextStatus: VehicleStatus = useMemo(() => {
    if (!vehicle?.status) {
      return 'maintenance';
    }
    if (vehicle.status === 'available') return 'assigned';
    if (vehicle.status === 'assigned') return 'maintenance';
    if (vehicle.status === 'maintenance') return 'out_of_service';
    return 'available';
  }, [vehicle?.status]);

  const isWorking =
    updateMutation.isPending ||
    statusMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending ||
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    completeTaskMutation.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === 'status') {
      await statusMutation.mutateAsync(confirmAction.nextStatus);
      return;
    }

    if (confirmAction.type === 'deleteTask') {
      await deleteTaskMutation.mutateAsync(confirmAction.task._id);
      return;
    }

    await completeTaskMutation.mutateAsync(confirmAction.task._id);
  };

  if (vehicleQuery.isLoading) {
    return (
      <Stack gap="lg">
        <Text c="dimmed">Chargement du vehicule...</Text>
      </Stack>
    );
  }

  if (vehicleQuery.isError || !vehicle) {
    return (
      <Stack gap="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/vehicles')}>
          Retour a la liste
        </Button>
        <Card withBorder radius="md" padding="lg">
          <Text c="red">Impossible de charger le detail de ce vehicule.</Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/vehicles')}>
            Retour a la liste
          </Button>
          <Title order={2} mt="xs">
            {buildVehicleLabel(vehicle)}
          </Title>
          <Group gap="sm" mt="sm">
            <Badge color={badgeColorByStatus[vehicle.status ?? 'available']} variant="light">
              {vehicle.status ?? 'available'}
            </Badge>
            <Badge color="gray" variant="light">
              {vehicle.company?.companyInfos?.name || vehicle.company?.reference || '-'}
            </Badge>
          </Group>
        </div>
        <Group>
          <Tooltip label="Modifier les informations du vehicule">
            <Button variant="default" leftSection={<IconEdit size={16} />} onClick={() => setIsEditModalOpen(true)}>
              Modifier
            </Button>
          </Tooltip>
          <Tooltip label="Affecter ou retirer un conducteur">
            <Button
              variant="default"
              leftSection={vehicle.assignedDriver ? <IconUserMinus size={16} /> : <IconUserPlus size={16} />}
              onClick={() => setAssignmentOpen(true)}
            >
              Conducteur
            </Button>
          </Tooltip>
          <Tooltip label="Changer le statut du vehicule">
            <Button color="dark" onClick={() => setConfirmAction({ type: 'status', nextStatus })}>
              Statut
            </Button>
          </Tooltip>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Informations vehicule
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Td>{vehicle.reference || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Immatriculation</Table.Th>
                <Table.Td>{vehicle.licensePlate || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>VIN</Table.Th>
                <Table.Td>{vehicle.vin || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Carburant</Table.Th>
                <Table.Td>{formatFuelType(vehicle.fuelType)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Kilometrage</Table.Th>
                <Table.Td>{vehicle.mileage ?? 0}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Cree le</Table.Th>
                <Table.Td>{formatDate(vehicle.createdAt)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Conducteur assigne
          </Title>
          {vehicle.assignedDriver ? (
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Td>{buildDriverLabel(vehicle.assignedDriver)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Td>{vehicle.assignedDriver.reference || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Telephone</Table.Th>
                  <Table.Td>{vehicle.assignedDriver.phoneNumber || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Td>{vehicle.assignedDriver.email || '-'}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed">Aucun conducteur n est actuellement assigne.</Text>
          )}
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Title order={4}>Maintenance</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {maintenanceSummary?.upcomingTasks ?? 0} a venir, {maintenanceSummary?.overdueTasks ?? 0} en retard
            </Text>
          </div>
          <Tooltip label="Ajouter une tache de maintenance">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setTaskModalMode('create');
                setSelectedTask(null);
                setTaskModalOpen(true);
              }}
            >
              Ajouter
            </Button>
          </Tooltip>
        </Group>

        <Table.ScrollContainer minWidth={860}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Echeance</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Cout estime</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task) => (
                <Table.Tr key={task._id}>
                  <Table.Td>{formatTaskType(task.type)}</Table.Td>
                  <Table.Td>{task.description || '-'}</Table.Td>
                  <Table.Td>{formatDate(task.dueDate)}</Table.Td>
                  <Table.Td>{formatTaskStatus(task.status)}</Table.Td>
                  <Table.Td>{formatCurrency(task.estimatedCost)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label="Modifier la tache">
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => {
                            setTaskModalMode('edit');
                            setSelectedTask(task);
                            setTaskModalOpen(true);
                          }}
                        >
                          Editer
                        </Button>
                      </Tooltip>
                      <Tooltip label="Completer la tache">
                        <Button
                          size="xs"
                          color="green"
                          variant="light"
                          disabled={task.status === 'completed'}
                          onClick={() => setConfirmAction({ type: 'completeTask', task })}
                        >
                          Completer
                        </Button>
                      </Tooltip>
                      <Tooltip label="Supprimer la tache">
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() => setConfirmAction({ type: 'deleteTask', task })}
                        >
                          Supprimer
                        </Button>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {tasks.length === 0 && !tasksQuery.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed">Aucune tache de maintenance.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {tasksPagination ? (
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Page {tasksPagination.page} / {tasksPagination.totalPages || 1} ({tasksPagination.total} taches)
            </Text>
            <Pagination value={tasksPage} onChange={setTasksPage} total={tasksPagination.totalPages || 1} />
          </Group>
        ) : null}
      </Card>

      <VehicleFormModal
        opened={isEditModalOpen}
        mode="edit"
        vehicle={vehicle}
        partners={partnersQuery.data ?? []}
        isSubmitting={updateMutation.isPending}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload as UpdateVehiclePayload);
        }}
      />

      <VehicleAssignmentModal
        opened={assignmentOpen}
        drivers={(driversQuery.data ?? []) as DriverRecord[]}
        currentDriverId={vehicle.assignedDriver?._id ?? null}
        isSubmitting={assignMutation.isPending || unassignMutation.isPending}
        onClose={() => setAssignmentOpen(false)}
        onAssign={async (driverId) => {
          await assignMutation.mutateAsync(driverId);
        }}
        onUnassign={async () => {
          await unassignMutation.mutateAsync();
        }}
      />

      <MaintenanceTaskModal
        opened={taskModalOpen}
        mode={taskModalMode}
        task={selectedTask}
        isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={async (payload) => {
          if (taskModalMode === 'create') {
            await createTaskMutation.mutateAsync(payload as CreateMaintenanceTaskPayload);
            return;
          }

          if (!selectedTask) {
            return;
          }

          await updateTaskMutation.mutateAsync({
            taskId: selectedTask._id,
            payload: payload as UpdateMaintenanceTaskPayload,
          });
        }}
      />

      <Modal opened={Boolean(confirmAction)} onClose={() => setConfirmAction(null)} title={confirmCopy.title} centered>
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
