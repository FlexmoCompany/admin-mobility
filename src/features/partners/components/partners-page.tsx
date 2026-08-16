import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import {
  listPartners,
  togglePartnerStatus,
  updatePartner,
} from '@/features/partners/api/partners-api';
import type { PartnerCompany, PartnerStatus } from '@/features/partners/types';

const formatCurrency = (amount: number | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {dateStyle: 'medium'}).format(new Date(value))
    : '-';

const statusOptions = [
  {value: '', label: 'Tous les statuts'},
  {value: 'active', label: 'Actif'},
  {value: 'inactive', label: 'Inactif'},
  {value: 'suspended', label: 'Suspendu'},
];

const verificationOptions = [
  {value: '', label: 'Tous'},
  {value: 'true', label: 'Verifies'},
  {value: 'false', label: 'Non verifies'},
];

const getStatusColor = (status: PartnerStatus) => {
  if (status === 'active') return 'green';
  if (status === 'inactive') return 'gray';
  return 'red';
};

type ConfirmAction =
  | {
      type: 'status';
      partner: PartnerCompany;
      nextStatus: PartnerStatus;
    }
  | {
      type: 'verification';
      partner: PartnerCompany;
      nextIsVerified: boolean;
    };

export function PartnersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'' | PartnerStatus>('');
  const [verificationFilter, setVerificationFilter] = useState<'' | 'true' | 'false'>('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const partnersQuery = useQuery({
    queryKey: ['partners', page, searchTerm, verificationFilter, statusFilter],
    queryFn: async () => {
      const response = await listPartners({
        page,
        limit: 10,
        searchTerm,
        isVerified: verificationFilter,
        status: statusFilter,
      });

      if (!response.success) {
        throw new Error('Chargement des partenaires impossible.');
      }

      return response;
    },
    placeholderData: (previousData) => previousData,
  });

  const visiblePartners = partnersQuery.data?.companies ?? [];

  const refreshPartners = async () => {
    await queryClient.invalidateQueries({queryKey: ['partners']});
  };

  const toggleStatusMutation = useMutation({
    mutationFn: async ({companyId, status}: {companyId: string; status: PartnerStatus}) => {
      const response = await togglePartnerStatus(companyId, status);
      if (!response.success) {
        throw new Error(response.message || 'Changement de statut impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {
      await refreshPartners();
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
    mutationFn: async ({companyId, isVerified}: {companyId: string; isVerified: boolean}) => {
      const response = await updatePartner(companyId, {
        company: {isVerified},
      });

      if (!response.success) {
        throw new Error(response.message || 'Mise a jour de la verification impossible.');
      }

      return response;
    },
    onSuccess: async (response) => {
      await refreshPartners();
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

  const overview = useMemo(() => {
    return {
      totalPartners: visiblePartners.length,
      verifiedPartners: visiblePartners.filter((company) => company.isVerified).length,
      activePartners: visiblePartners.filter((company) => company.status === 'active').length,
      productionExposure: visiblePartners.reduce(
        (total, company) => total + (company.productionBalance ?? 0),
        0
      ),
    };
  }, [visiblePartners]);

  const loadingMutation = toggleStatusMutation.isPending || toggleVerificationMutation.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'status') {
      toggleStatusMutation.mutate({
        companyId: confirmAction.partner._id,
        status: confirmAction.nextStatus,
      });
    } else {
      toggleVerificationMutation.mutate({
        companyId: confirmAction.partner._id,
        isVerified: confirmAction.nextIsVerified,
      });
    }

    setConfirmAction(null);
  };

  const confirmationCopy = (() => {
    if (!confirmAction) {
      return null;
    }

    if (confirmAction.type === 'status') {
      const isSuspending = confirmAction.nextStatus === 'suspended';
      return {
        title: isSuspending ? 'Confirmer la suspension' : 'Confirmer l activation',
        description: isSuspending
          ? `Le partenaire ${confirmAction.partner.companyInfos?.name ?? confirmAction.partner.reference} sera suspendu.`
          : `Le partenaire ${confirmAction.partner.companyInfos?.name ?? confirmAction.partner.reference} sera reactive.`,
        confirmLabel: isSuspending ? 'Suspendre' : 'Activer',
        confirmColor: isSuspending ? 'red' : 'green',
      };
    }

    return {
      title: confirmAction.nextIsVerified
        ? 'Confirmer la verification'
        : 'Retirer la verification',
      description: confirmAction.nextIsVerified
        ? `Le partenaire ${confirmAction.partner.companyInfos?.name ?? confirmAction.partner.reference} sera marque comme verifie.`
        : `La verification du partenaire ${confirmAction.partner.companyInfos?.name ?? confirmAction.partner.reference} sera retiree.`,
      confirmLabel: confirmAction.nextIsVerified ? 'Verifier' : 'Retirer',
      confirmColor: confirmAction.nextIsVerified ? 'green' : 'yellow',
    };
  })();

  return (
    <Stack gap="lg">
      <div>
        <Text size="xs" fw={800} tt="uppercase" c="dimmed">
          Portefeuille partenaire
        </Text>
        <Title order={2}>Partenaires</Title>
        <Text c="dimmed" mt="sm">
          Vue de gestion courante pour suivre, filtrer et ouvrir la fiche detail partenaire.
        </Text>
      </div>

      {partnersQuery.isLoading ? (
        <SimpleGrid cols={{base: 1, sm: 2, xl: 4}}>
          {Array.from({length: 4}).map((_, index) => (
            <Card key={index} withBorder radius="md" padding="lg">
              <Skeleton height={18} width="40%" mb="sm" />
              <Skeleton height={28} width="55%" />
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{base: 1, sm: 2, xl: 4}}>
          <Card withBorder radius="md" padding="lg">
            <Text size="xs" c="dimmed" fw={700}>
              Total partenaires
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {overview.totalPartners}
            </Text>
          </Card>
          <Card withBorder radius="md" padding="lg">
            <Text size="xs" c="dimmed" fw={700}>
              Partenaires verifies
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {overview.verifiedPartners}
            </Text>
          </Card>
          <Card withBorder radius="md" padding="lg">
            <Text size="xs" c="dimmed" fw={700}>
              Partenaires actifs
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {overview.activePartners}
            </Text>
          </Card>
          <Card withBorder radius="md" padding="lg">
            <Text size="xs" c="dimmed" fw={700}>
              Exposition production
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {formatCurrency(overview.productionExposure)}
            </Text>
          </Card>
        </SimpleGrid>
      )}

      {partnersQuery.isError ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          Impossible de charger les partenaires. Verifie la connexion au tiers-service et la session admin.
        </Alert>
      ) : null}

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="end">
            <div>
              <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                Gestion courante
              </Text>
              <Title order={4}>Registre partenaires</Title>
            </div>
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void refreshPartners()}
            >
              Actualiser
            </Button>
          </Group>

          <Group grow align="end">
            <TextInput
              label="Recherche"
              leftSection={<IconSearch size={16} />}
              placeholder="Nom, email, telephone, reference"
              value={searchTerm}
              onChange={(event) => {
                setPage(1);
                setSearchTerm(event.currentTarget.value);
              }}
            />
            <Select
              label="Statut"
              data={statusOptions}
              value={statusFilter}
              onChange={(value) => {
                setPage(1);
                setStatusFilter(((value as PartnerStatus) || '') as '' | PartnerStatus);
              }}
            />
            <Select
              label="Verification"
              data={verificationOptions}
              value={verificationFilter}
              onChange={(value) => {
                setPage(1);
                setVerificationFilter(((value as 'true' | 'false') || '') as '' | 'true' | 'false');
              }}
            />
          </Group>

          <Table.ScrollContainer minWidth={1080}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Partenaire</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Telephone</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Verifie</Table.Th>
                  <Table.Th>Membres</Table.Th>
                  <Table.Th>Modules actifs</Table.Th>
                  <Table.Th>Solde prod</Table.Th>
                  <Table.Th>Creation</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visiblePartners.map((company) => {
                  const activeModulesCount =
                    company.modules?.filter((module) => module.status === 'active').length ?? 0;

                  return (
                    <Table.Tr key={company._id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={700}>{company.companyInfos?.name ?? 'Partenaire sans nom'}</Text>
                          <Text size="xs" c="dimmed">
                            {company.companyInfos?.rccm || 'RCCM non renseigne'}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>{company.reference}</Table.Td>
                      <Table.Td>{company.companyInfos?.email ?? '-'}</Table.Td>
                      <Table.Td>{company.companyInfos?.phoneNumber ?? '-'}</Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(company.status)}>{company.status}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={company.isVerified ? 'green' : 'yellow'}>
                          {company.isVerified ? 'Oui' : 'Non'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{company.companyMembers?.length ?? 0}</Table.Td>
                      <Table.Td>{activeModulesCount}</Table.Td>
                      <Table.Td>{formatCurrency(company.productionBalance)}</Table.Td>
                      <Table.Td>{formatDate(company.createdAt)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => navigate(`/partners/${company._id}`)}
                            aria-label={`Voir ${company.reference}`}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color={company.isVerified ? 'yellow' : 'green'}
                            onClick={() =>
                              setConfirmAction({
                                type: 'verification',
                                partner: company,
                                nextIsVerified: !company.isVerified,
                              })
                            }
                            aria-label={`Mettre a jour la verification ${company.reference}`}
                            disabled={loadingMutation}
                          >
                            {company.isVerified ? <IconX size={16} /> : <IconCheck size={16} />}
                          </ActionIcon>
                          <Button
                            size="xs"
                            variant="default"
                            onClick={() =>
                              setConfirmAction({
                                type: 'status',
                                partner: company,
                                nextStatus:
                                  company.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                            disabled={loadingMutation}
                          >
                            {company.status === 'active' ? 'Suspendre' : 'Activer'}
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {!partnersQuery.isLoading && visiblePartners.length === 0 ? (
            <Alert color="gray" variant="light">
              Aucun partenaire ne correspond aux filtres actuels.
            </Alert>
          ) : null}

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {partnersQuery.data?.total ?? 0} partenaires references
            </Text>
            <Pagination
              total={Math.max(partnersQuery.data?.totalPages ?? 1, 1)}
              value={page}
              onChange={setPage}
            />
          </Group>
        </Stack>
      </Card>

      <Modal
        opened={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmationCopy?.title ?? 'Confirmer'}
        centered
      >
        <Stack gap="md">
          <Text>{confirmationCopy?.description}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
            <Button
              color={confirmationCopy?.confirmColor ?? 'blue'}
              onClick={() => void handleConfirm()}
              loading={loadingMutation}
            >
              {confirmationCopy?.confirmLabel ?? 'Confirmer'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
