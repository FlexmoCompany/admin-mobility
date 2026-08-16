import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

import {
  getPartnerAccounts,
  getPartnerAdmins,
  getPartnerById,
  getPartnerDrivers,
  getPartnerMembers,
  getPartnerStats,
  getPartnerVehicles,
  togglePartnerStatus,
  updatePartner,
} from '@/features/partners/api/partners-api';
import { ApiError } from '@/shared/api/http';
import type {
  PartnerCompany,
  PartnerStatus,
  PartnerAccount,
  PartnerAdminMember,
  PartnerDriver,
  PartnerEmployee,
  PartnerVehicle,
} from '@/features/partners/types';

const editableStatusOptions = [
  {value: 'active', label: 'Actif'},
  {value: 'inactive', label: 'Inactif'},
  {value: 'suspended', label: 'Suspendu'},
];

const formatCurrency = (amount: number | undefined | null) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(new Date(value))
    : '-';

const getStatusColor = (status: PartnerStatus) => {
  if (status === 'active') return 'green';
  if (status === 'inactive') return 'gray';
  return 'red';
};

const getVehicleStatusColor = (status?: string) => {
  if (status === 'available') return 'green';
  if (status === 'assigned') return 'blue';
  if (status === 'maintenance') return 'yellow';
  return 'red';
};

interface PartnerFormState {
  name: string;
  email: string;
  phoneNumber: string;
  rccm: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  status: PartnerStatus;
  isVerified: boolean;
}

const createFormState = (company?: PartnerCompany): PartnerFormState => ({
  name: company?.companyInfos?.name ?? '',
  email: company?.companyInfos?.email ?? '',
  phoneNumber: company?.companyInfos?.phoneNumber ?? '',
  rccm: company?.companyInfos?.rccm ?? '',
  street: company?.companyInfos?.address?.street ?? '',
  city: company?.companyInfos?.address?.city ?? '',
  zipCode: company?.companyInfos?.address?.zipCode ?? '',
  country: company?.companyInfos?.address?.country ?? '',
  status: company?.status ?? 'active',
  isVerified: company?.isVerified ?? false,
});

type ConfirmAction =
  | {type: 'status'; nextStatus: PartnerStatus}
  | {type: 'verification'; nextIsVerified: boolean};

const buildMemberName = (member: PartnerAdminMember | PartnerEmployee) =>
  [member.personalInfos?.firstname, member.personalInfos?.lastname].filter(Boolean).join(' ') ||
  'Nom indisponible';

const buildDriverName = (driver: PartnerDriver) =>
  [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Conducteur sans nom';

const buildVehicleName = (vehicle: PartnerVehicle) =>
  [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.reference || 'Vehicule';

export function PartnerDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {partnerId = ''} = useParams();
  const [formState, setFormState] = useState<PartnerFormState>(createFormState());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const partnerQuery = useQuery({
    queryKey: ['partners', partnerId, 'detail'],
    queryFn: async () => {
      const response = await getPartnerById(partnerId);
      if (!response.success || !response.company) {
        throw new Error('Chargement du detail partenaire impossible.');
      }

      return response.company;
    },
    enabled: Boolean(partnerId),
  });

  useEffect(() => {
    if (!partnerQuery.data) return;
    setFormState(createFormState(partnerQuery.data));
  }, [partnerQuery.data]);

  const partnerStatsQuery = useQuery({
    queryKey: ['partners', partnerId, 'stats'],
    queryFn: async () => {
      const response = await getPartnerStats(partnerId);
      if (!response.success) {
        throw new Error('Chargement des statistiques impossible.');
      }

      return response.data;
    },
    enabled: Boolean(partnerId),
  });

  const partnerAdminsQuery = useQuery({
    queryKey: ['partners', partnerId, 'admins'],
    queryFn: async () => {
      try {
        const response = await getPartnerAdmins(partnerId);
        return response.admins ?? [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: Boolean(partnerId),
  });

  const partnerMembersQuery = useQuery({
    queryKey: ['partners', partnerId, 'members'],
    queryFn: async () => {
      const response = await getPartnerMembers(partnerId);
      return response.data?.members ?? [];
    },
    enabled: Boolean(partnerId),
  });

  const partnerAccountsQuery = useQuery({
    queryKey: ['partners', partnerId, 'accounts'],
    queryFn: async () => {
      try {
        const response = await getPartnerAccounts(partnerId);
        return response.accounts ?? [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: Boolean(partnerId),
  });

  const partnerVehiclesQuery = useQuery({
    queryKey: ['partners', partnerId, 'vehicles'],
    queryFn: async () => {
      try {
        const response = await getPartnerVehicles(partnerId);
        return response.data?.vehicles ?? [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: Boolean(partnerId),
  });

  const partnerDriversQuery = useQuery({
    queryKey: ['partners', partnerId, 'drivers', partnerQuery.data?.reference],
    queryFn: async () => {
      try {
        const response = await getPartnerDrivers(partnerQuery.data?.reference ?? '');
        return response.data?.drivers ?? [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled: Boolean(partnerQuery.data?.reference),
  });

  const refreshPartner = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ['partners']}),
      queryClient.invalidateQueries({queryKey: ['partners', partnerId]}),
    ]);
  };

  const updatePartnerMutation = useMutation({
    mutationFn: async () => {
      const response = await updatePartner(partnerId, {
        company: {
          companyInfos: {
            name: formState.name.trim(),
            email: formState.email.trim(),
            phoneNumber: formState.phoneNumber.trim(),
            rccm: formState.rccm.trim(),
            address: {
              street: formState.street.trim(),
              city: formState.city.trim(),
              zipCode: formState.zipCode.trim(),
              country: formState.country.trim(),
            },
          },
          status: formState.status,
          isVerified: formState.isVerified,
        },
      });

      if (!response.success) {
        throw new Error(response.message || 'Mise a jour partenaire impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {
      await refreshPartner();
      notifications.show({
        color: 'green',
        title: 'Partenaire mis a jour',
        message: response.message || 'Les informations du partenaire ont ete enregistrees.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mise a jour impossible',
        message:
          error instanceof Error
            ? error.message
            : 'Le partenaire n a pas pu etre modifie.',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (status: PartnerStatus) => {
      const response = await togglePartnerStatus(partnerId, status);
      if (!response.success) {
        throw new Error(response.message || 'Changement de statut impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {
      await refreshPartner();
      notifications.show({
        color: 'green',
        title: 'Statut mis a jour',
        message: response.message || 'Le statut du partenaire a ete mis a jour.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error
            ? error.message
            : 'Le statut du partenaire n a pas pu etre modifie.',
      });
    },
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async (nextIsVerified: boolean) => {
      const response = await updatePartner(partnerId, {
        company: {isVerified: nextIsVerified},
      });

      if (!response.success) {
        throw new Error(response.message || 'Mise a jour de la verification impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {
      await refreshPartner();
      notifications.show({
        color: 'green',
        title: 'Verification mise a jour',
        message: response.message || 'L etat de verification a ete modifie.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Action impossible',
        message:
          error instanceof Error
            ? error.message
            : 'La verification n a pas pu etre modifiee.',
      });
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'status') {
      toggleStatusMutation.mutate(confirmAction.nextStatus);
    } else {
      toggleVerificationMutation.mutate(confirmAction.nextIsVerified);
    }
    setConfirmAction(null);
  };

  const confirmCopy = (() => {
    if (!confirmAction || !partnerQuery.data) return null;
    const companyName = partnerQuery.data.companyInfos?.name ?? partnerQuery.data.reference;
    if (confirmAction.type === 'status') {
      const isSuspending = confirmAction.nextStatus === 'suspended';
      return {
        title: isSuspending ? 'Confirmer la suspension' : 'Confirmer l activation',
        description: isSuspending
          ? `Le partenaire ${companyName} sera suspendu et ses operations pourront etre limitees.`
          : `Le partenaire ${companyName} sera reactiver pour les operations courantes.`,
        confirmLabel: isSuspending ? 'Suspendre' : 'Activer',
        confirmColor: isSuspending ? 'red' : 'green',
      };
    }

    return {
      title: confirmAction.nextIsVerified
        ? 'Confirmer la verification'
        : 'Retirer la verification',
      description: confirmAction.nextIsVerified
        ? `Le partenaire ${companyName} sera marque comme verifie.`
        : `La verification du partenaire ${companyName} sera retiree.`,
      confirmLabel: confirmAction.nextIsVerified ? 'Verifier' : 'Retirer',
      confirmColor: confirmAction.nextIsVerified ? 'green' : 'yellow',
    };
  })();

  const accounts = partnerAccountsQuery.data ?? [];
  const drivers = partnerDriversQuery.data ?? [];
  const vehicles = partnerVehiclesQuery.data ?? [];
  const admins = partnerAdminsQuery.data ?? [];
  const members = partnerMembersQuery.data ?? [];

  const accountSummary = useMemo(() => {
    return accounts.reduce(
      (summary, account) => {
        summary.total += account.balance ?? 0;
        if (account.type === 'collect') {
          summary.collect += account.balance ?? 0;
        }
        if (account.type === 'fuel') {
          summary.fuel += account.balance ?? 0;
        }
        return summary;
      },
      {total: 0, collect: 0, fuel: 0}
    );
  }, [accounts]);

  if (partnerQuery.isLoading) {
    return (
      <Stack gap="lg">
        <Skeleton height={32} width={220} />
        <SimpleGrid cols={{base: 1, md: 3}}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </SimpleGrid>
        <Skeleton height={280} />
      </Stack>
    );
  }

  if (partnerQuery.isError || !partnerQuery.data) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
        Impossible de charger cette fiche partenaire.
      </Alert>
    );
  }

  const partner = partnerQuery.data;
  const loadingSensitiveAction =
    toggleStatusMutation.isPending || toggleVerificationMutation.isPending;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="start">
        <div>
          <Group gap="xs" mb="xs">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/partners')}
            >
              Retour aux partenaires
            </Button>
          </Group>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Fiche partenaire
          </Text>
          <Title order={2}>{partner.companyInfos?.name ?? 'Partenaire sans nom'}</Title>
          <Text c="dimmed" mt="sm">
            Vue detaillee du partenaire avec ses comptes, conducteurs, vehicules et membres.
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            onClick={() =>
              setConfirmAction({
                type: 'verification',
                nextIsVerified: !partner.isVerified,
              })
            }
            disabled={loadingSensitiveAction}
          >
            {partner.isVerified ? 'Retirer la verification' : 'Verifier'}
          </Button>
          <Button
            color={partner.status === 'active' ? 'red' : 'green'}
            onClick={() =>
              setConfirmAction({
                type: 'status',
                nextStatus: partner.status === 'active' ? 'suspended' : 'active',
              })
            }
            disabled={loadingSensitiveAction}
          >
            {partner.status === 'active' ? 'Suspendre' : 'Activer'}
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{base: 1, md: 4}}>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Statut
          </Text>
          <Badge mt={8} color={getStatusColor(partner.status)}>
            {partner.status}
          </Badge>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Verification
          </Text>
          <Badge mt={8} color={partner.isVerified ? 'green' : 'yellow'}>
            {partner.isVerified ? 'Verifie' : 'Non verifie'}
          </Badge>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Membres actifs
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {partnerStatsQuery.data?.members?.active ?? 0}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Exposition carburant
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {formatCurrency(accountSummary.total)}
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{base: 1, xl: 3}}>
        <Card withBorder radius="md" padding="lg" style={{gridColumn: 'span 2'}}>
          <Stack gap="md">
            <Title order={4}>Informations partenaire</Title>
            <SimpleGrid cols={{base: 1, sm: 2}}>
              <TextInput
                label="Nom du partenaire"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({...current, name: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({...current, email: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Telephone"
                value={formState.phoneNumber}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    phoneNumber: event.currentTarget.value,
                  }))
                }
              />
              <TextInput
                label="RCCM"
                value={formState.rccm}
                onChange={(event) =>
                  setFormState((current) => ({...current, rccm: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Ville"
                value={formState.city}
                onChange={(event) =>
                  setFormState((current) => ({...current, city: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Pays"
                value={formState.country}
                onChange={(event) =>
                  setFormState((current) => ({...current, country: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Rue"
                value={formState.street}
                onChange={(event) =>
                  setFormState((current) => ({...current, street: event.currentTarget.value}))
                }
              />
              <TextInput
                label="Code postal"
                value={formState.zipCode}
                onChange={(event) =>
                  setFormState((current) => ({...current, zipCode: event.currentTarget.value}))
                }
              />
            </SimpleGrid>
            <Group grow align="end">
              <Select
                label="Statut"
                data={editableStatusOptions}
                value={formState.status}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    status: (value as PartnerStatus) || 'active',
                  }))
                }
                allowDeselect={false}
              />
              <Switch
                label="Compte verifie"
                checked={formState.isVerified}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    isVerified: event.currentTarget.checked,
                  }))
                }
              />
            </Group>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setFormState(createFormState(partner))}
              >
                Reinitialiser
              </Button>
              <Button
                onClick={() => updatePartnerMutation.mutate()}
                loading={updatePartnerMutation.isPending}
                disabled={!formState.name.trim()}
              >
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Title order={4}>Soldes carburant</Title>
            <Text size="sm" c="dimmed">
              Comptes et soldes visibles pour ce partenaire dans l environnement courant.
            </Text>
            <SimpleGrid cols={1}>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed" fw={700}>
                  Solde total
                </Text>
                <Text fw={700} mt={4}>
                  {formatCurrency(accountSummary.total)}
                </Text>
              </Card>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed" fw={700}>
                  Solde collect
                </Text>
                <Text fw={700} mt={4}>
                  {formatCurrency(accountSummary.collect)}
                </Text>
              </Card>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed" fw={700}>
                  Solde fuel
                </Text>
                <Text fw={700} mt={4}>
                  {formatCurrency(accountSummary.fuel)}
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Comptes carburant</Title>
          <Table.ScrollContainer minWidth={760}>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Env</Table.Th>
                  <Table.Th>Solde</Table.Th>
                  <Table.Th>Solde partenaire</Table.Th>
                  <Table.Th>Sync</Table.Th>
                  <Table.Th>Actif</Table.Th>
                  <Table.Th>Maj</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {accounts.map((account: PartnerAccount) => (
                  <Table.Tr key={account._id}>
                    <Table.Td>{account.type ?? '-'}</Table.Td>
                    <Table.Td>{account.env ?? '-'}</Table.Td>
                    <Table.Td>{formatCurrency(account.balance)}</Table.Td>
                    <Table.Td>{formatCurrency(account.partnerBalance)}</Table.Td>
                    <Table.Td>{account.partnerSyncStatus ?? '-'}</Table.Td>
                    <Table.Td>{account.isActive ? 'Oui' : 'Non'}</Table.Td>
                    <Table.Td>{formatDate(account.updatedAt)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!partnerAccountsQuery.isLoading && accounts.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun compte carburant trouve pour ce partenaire.
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Conducteurs</Title>
          <Table.ScrollContainer minWidth={760}>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Telephone</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Carte carburant</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {drivers.map((driver: PartnerDriver) => (
                  <Table.Tr key={driver._id}>
                    <Table.Td>{buildDriverName(driver)}</Table.Td>
                    <Table.Td>{driver.reference ?? '-'}</Table.Td>
                    <Table.Td>{driver.email ?? '-'}</Table.Td>
                    <Table.Td>{driver.phoneNumber ?? '-'}</Table.Td>
                    <Table.Td>{driver.status ?? '-'}</Table.Td>
                    <Table.Td>{driver.fuelCardStatus ?? '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!partnerDriversQuery.isLoading && drivers.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun conducteur associe a ce partenaire.
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Vehicules</Title>
          <Table.ScrollContainer minWidth={820}>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Vehicule</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Immatriculation</Table.Th>
                  <Table.Th>Carburant</Table.Th>
                  <Table.Th>Kilometrage</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Conducteur assigne</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {vehicles.map((vehicle: PartnerVehicle) => (
                  <Table.Tr key={vehicle._id}>
                    <Table.Td>{buildVehicleName(vehicle)}</Table.Td>
                    <Table.Td>{vehicle.reference ?? '-'}</Table.Td>
                    <Table.Td>{vehicle.licensePlate ?? '-'}</Table.Td>
                    <Table.Td>{vehicle.fuelType ?? '-'}</Table.Td>
                    <Table.Td>{vehicle.mileage ?? 0} km</Table.Td>
                    <Table.Td>
                      <Badge color={getVehicleStatusColor(vehicle.status)}>{vehicle.status ?? '-'}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {vehicle.assignedDriver
                        ? [vehicle.assignedDriver.firstName, vehicle.assignedDriver.lastName]
                            .filter(Boolean)
                            .join(' ')
                        : '-'}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!partnerVehiclesQuery.isLoading && vehicles.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun vehicule associe a ce partenaire.
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Title order={4}>Admins / membres</Title>
          <SimpleGrid cols={{base: 1, xl: 2}}>
            <Card withBorder radius="md" padding="md">
              <Stack gap="sm">
                <Text fw={700}>Admins compagnie</Text>
                <Table.ScrollContainer minWidth={460}>
                  <Table withTableBorder striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Nom</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>Actif</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {admins.map((admin: PartnerAdminMember) => (
                        <Table.Tr key={admin._id}>
                          <Table.Td>{buildMemberName(admin)}</Table.Td>
                          <Table.Td>{admin.personalInfos?.email ?? '-'}</Table.Td>
                          <Table.Td>{admin.role?.label ?? admin.role?.value ?? '-'}</Table.Td>
                          <Table.Td>{admin.active ? 'Oui' : 'Non'}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
                {!partnerAdminsQuery.isLoading && admins.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Aucun admin compagnie trouve.
                  </Text>
                ) : null}
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="md">
              <Stack gap="sm">
                <Text fw={700}>Membres entreprise</Text>
                <Table.ScrollContainer minWidth={460}>
                  <Table withTableBorder striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Nom</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Telephone</Table.Th>
                        <Table.Th>Actif</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {members.map((member: PartnerEmployee) => (
                        <Table.Tr key={member._id}>
                          <Table.Td>{buildMemberName(member)}</Table.Td>
                          <Table.Td>{member.personalInfos?.email ?? '-'}</Table.Td>
                          <Table.Td>{member.phoneNumber ?? '-'}</Table.Td>
                          <Table.Td>{member.active ? 'Oui' : 'Non'}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
                {!partnerMembersQuery.isLoading && members.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Aucun membre entreprise trouve.
                  </Text>
                ) : null}
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      </Card>

      <Modal
        opened={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmCopy?.title ?? 'Confirmer'}
        centered
      >
        <Stack gap="md">
          <Text>{confirmCopy?.description}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
            <Button
              color={confirmCopy?.confirmColor ?? 'blue'}
              onClick={handleConfirm}
              loading={loadingSensitiveAction}
            >
              {confirmCopy?.confirmLabel ?? 'Confirmer'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
