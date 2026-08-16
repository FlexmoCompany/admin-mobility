import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserCheck,
} from '@tabler/icons-react';

import type {
  AdminRecord,
  AdminRole,
  AdminStatus,
  CreateAdminPayload,
  UpdateAdminPayload,
} from '@/features/admins/api/admins-api';

import {
  createAdmin,
  listAdmins,
  toggleAdminStatus,
  updateAdmin,
} from '../api/admins-api';
import { AdminFormModal } from './admin-form-modal';

const roleFilterOptions = [
  { value: '', label: 'Tous les roles' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
];

const statusFilterOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'suspended', label: 'Suspendu' },
];

const verifiedFilterOptions = [
  { value: '', label: 'Tous' },
  { value: 'true', label: 'Verifies' },
  { value: 'false', label: 'Non verifies' },
];

const badgeColorByStatus: Record<AdminStatus, string> = {
  active: 'green',
  inactive: 'gray',
  suspended: 'red',
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
      }).format(new Date(value))
    : '-';

export function AdminsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [role, setRole] = useState<'' | AdminRole>('');
  const [status, setStatus] = useState<'' | AdminStatus>('');
  const [verified, setVerified] = useState<'' | 'true' | 'false'>('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const adminsQuery = useQuery({
    queryKey: ['admins', page, searchTerm, role, status, verified],
    queryFn: async () => {
      const response = await listAdmins({
        page,
        limit: 10,
        searchTerm,
        role,
        status,
        verified,
      });

      if (!response.success) {
        throw new Error('Chargement des admins impossible.');
      }

      return response;
    },
  });

  const refreshAdmins = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admins'] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAdminPayload) => {
      const response = await createAdmin(payload);
      if (!response.success) {
        throw new Error(response.message || 'Creation admin impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {

      setIsModalOpen(false);
      setSelectedAdmin(null);
      await refreshAdmins();
      notifications.show({
        color: 'green',
        title: 'Admin cree',
        message: response.message || 'Le compte admin a ete cree.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Creation impossible',
        message: error instanceof Error ? error.message : 'Le compte admin n a pas pu etre cree.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      adminId,
      payload,
    }: {
      adminId: string;
      payload: UpdateAdminPayload;
    }) => {
      const response = await updateAdmin(adminId, payload);
      if (!response.success) {
        throw new Error(response.message || 'Mise a jour admin impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {

      setIsModalOpen(false);
      setSelectedAdmin(null);
      await refreshAdmins();
      notifications.show({
        color: 'green',
        title: 'Admin mis a jour',
        message: response.message || 'Les informations admin ont ete modifiees.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message: error instanceof Error ? error.message : 'La mise a jour admin a echoue.',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      adminId,
      nextStatus,
    }: {
      adminId: string;
      nextStatus: AdminStatus;
    }) => {
      const response = await toggleAdminStatus(adminId, nextStatus);
      if (!response.success) {
        throw new Error(response.message || 'Changement de statut impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {

      await refreshAdmins();
      notifications.show({
        color: 'green',
        title: 'Statut mis a jour',
        message: response.message || 'Le statut admin a bien change.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error ? error.message : 'Le statut admin n a pas pu etre modifie.',
      });
    },
  });

  const overview = useMemo(() => {
    const admins = adminsQuery.data?.admins ?? [];
    return {
      total: adminsQuery.data?.count ?? 0,
      active: admins.filter((admin) => admin.status === 'active').length,
      suspended: admins.filter((admin) => admin.status === 'suspended').length,
      superadmins: admins.filter((admin) => admin.role === 'superadmin').length,
    };
  }, [adminsQuery.data]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedAdmin(null);
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminRecord) => {
    setModalMode('edit');
    setSelectedAdmin(admin);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (admin: AdminRecord) => {
    const nextStatus: AdminStatus =
      admin.status === 'suspended' ? 'active' : 'suspended';
    toggleStatusMutation.mutate({ adminId: admin._id, nextStatus });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Superadmin console
          </Text>
          <Title order={2}>Gestion des admins</Title>
          <Text c="dimmed" mt="sm">
            Liste, creation, mise a jour et suspension logique des comptes administrateurs.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Creer un admin
        </Button>
      </Group>

      <Group grow>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Total admins
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {overview.total}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Actifs
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {overview.active}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Suspendus
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {overview.suspended}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Superadmins
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {overview.superadmins}
          </Text>
        </Card>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack>
          <Group grow align="end">
            <TextInput
              label="Recherche"
              leftSection={<IconSearch size={16} />}
              placeholder="Nom, email, role, telephone"
              value={searchTerm}
              onChange={(event) => {
                setPage(1);
                setSearchTerm(event.currentTarget.value);
              }}
            />
            <Select
              label="Role"
              data={roleFilterOptions}
              value={role}
              onChange={(value) => {
                setPage(1);
                setRole(((value as AdminRole) || '') as '' | AdminRole);
              }}
            />
            <Select
              label="Statut"
              data={statusFilterOptions}
              value={status}
              onChange={(value) => {
                setPage(1);
                setStatus(((value as AdminStatus) || '') as '' | AdminStatus);
              }}
            />
            <Select
              label="Verification"
              data={verifiedFilterOptions}
              value={verified}
              onChange={(value) => {
                setPage(1);
                setVerified(((value as 'true' | 'false') || '') as '' | 'true' | 'false');
              }}
            />
          </Group>

          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Telephone</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Verifie</Table.Th>
                <Table.Th>Cree le</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(adminsQuery.data?.admins ?? []).map((admin) => (
                <Table.Tr key={admin._id}>
                  <Table.Td>{admin.fullname}</Table.Td>
                  <Table.Td>{admin.email}</Table.Td>
                  <Table.Td>{admin.phoneNumber}</Table.Td>
                  <Table.Td>{admin.role}</Table.Td>
                  <Table.Td>
                    <Badge color={badgeColorByStatus[admin.status]}>
                      {admin.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={admin.verified ? 'green' : 'yellow'}>
                      {admin.verified ? 'Oui' : 'Non'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(admin.createdAt)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(admin)}
                        aria-label={`Modifier ${admin.fullname}`}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color={admin.status === 'suspended' ? 'green' : 'red'}
                        onClick={() => handleToggleStatus(admin)}
                        aria-label={
                          admin.status === 'suspended'
                            ? `Reactiver ${admin.fullname}`
                            : `Suspendre ${admin.fullname}`
                        }
                      >
                        {admin.status === 'suspended' ? (
                          <IconUserCheck size={16} />
                        ) : (
                          <IconTrash size={16} />
                        )}
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {adminsQuery.isLoading ? (
            <Text c="dimmed">Chargement des admins...</Text>
          ) : null}
          {adminsQuery.isError ? (
            <Text c="red">Impossible de charger la liste des admins.</Text>
          ) : null}
          {!adminsQuery.isLoading && !adminsQuery.isError && !(adminsQuery.data?.admins.length) ? (
            <Text c="dimmed">Aucun admin ne correspond aux filtres courants.</Text>
          ) : null}

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {(adminsQuery.data?.count ?? 0)} comptes admin suivis
            </Text>
            <Pagination
              total={Math.max(adminsQuery.data?.totalPages ?? 1, 1)}
              value={page}
              onChange={setPage}
            />
          </Group>
        </Stack>
      </Card>

      <AdminFormModal
        opened={isModalOpen}
        mode={modalMode}
        admin={selectedAdmin}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (payload) => {
          if (modalMode === 'create') {
            await createMutation.mutateAsync(payload as CreateAdminPayload);
            return;
          }

          if (!selectedAdmin?._id) return;
          await updateMutation.mutateAsync({
            adminId: selectedAdmin._id,
            payload: payload as UpdateAdminPayload,
          });
        }}
      />
    </Stack>
  );
}
