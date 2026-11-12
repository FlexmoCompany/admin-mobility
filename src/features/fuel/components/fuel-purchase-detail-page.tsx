import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Group, SimpleGrid, Stack, Table, Text, Tooltip, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import { getFuelPurchaseById } from '../api/fuel-api';
import { FuelLedgerCard } from './fuel-ledger-card';
import type { FuelPurchaseStatus } from '../types';

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value)
      )
    : '-';

const badgeColorByStatus: Record<FuelPurchaseStatus, string> = {
  pending: 'yellow',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export function FuelPurchaseDetailPage() {
  const navigate = useNavigate();
  const { purchaseId = '' } = useParams();

  const purchaseQuery = useQuery({
    queryKey: ['fuel', purchaseId, 'detail'],
    queryFn: async () => {
      const response = await getFuelPurchaseById(purchaseId);
      if (!response.success || !response.data) {
        throw new Error('Chargement du detail carburant impossible.');
      }
      return response.data;
    },
    enabled: Boolean(purchaseId),
    retry: false,
  });

  const purchase = purchaseQuery.data;

  if (purchaseQuery.isLoading) {
    return (
      <Stack gap="lg">
        <Text c="dimmed">Chargement du detail carburant...</Text>
      </Stack>
    );
  }

  if (purchaseQuery.isError || !purchase) {
    return (
      <Stack gap="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/fuel')}>
          Retour a la liste
        </Button>
        <Card withBorder radius="md" padding="lg">
          <Text c="red">Impossible de charger le detail de cet achat carburant.</Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Tooltip label="Retour a la liste carburants">
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/fuel')}>
              Retour a la liste
            </Button>
          </Tooltip>
          <Title order={2} mt="xs">
            Achat carburant
          </Title>
          <Group gap="sm" mt="sm">
            <Badge color={badgeColorByStatus[purchase.status ?? 'pending']} variant="light">
              {purchase.status ?? 'pending'}
            </Badge>
            <Badge color="gray" variant="light">
              {purchase.station || '-'}
            </Badge>
          </Group>
        </div>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Resume achat
          </Title>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Reference</Table.Th>
                <Table.Td>{purchase.reference || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Transaction</Table.Th>
                <Table.Td>{purchase.transactionId || purchase.externalTransactionId || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Td>{formatDateTime(purchase.date)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Station</Table.Th>
                <Table.Td>{purchase.station || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Source</Table.Th>
                <Table.Td>{purchase.source || '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Statut</Table.Th>
                <Table.Td>{purchase.status || '-'}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Conducteur
          </Title>
          {purchase.driver ? (
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Td>
                    {purchase.driver._id ? (
                      <Text component={Link} to={`/drivers/${purchase.driver._id}`}>
                        {purchase.driver.name || '-'}
                      </Text>
                    ) : (
                      purchase.driver.name || '-'
                    )}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Td>{purchase.driver.reference || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Telephone</Table.Th>
                  <Table.Td>{purchase.driver.phone || '-'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Td>{purchase.driver.email || '-'}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed">Aucun conducteur lie a cet achat.</Text>
          )}
        </Card>
      </SimpleGrid>

      {(() => {
        const bonusXof =
          purchase.driverBonusAmount ??
          (purchase.ruleApplications?.liter?.result?.amountCents != null
            ? purchase.ruleApplications.liter.result.amountCents / 100
            : null);
        const receivedXof =
          purchase.totalReceivedAmount ??
          (purchase.ruleApplications?.tier?.result?.amountCents != null
            ? purchase.ruleApplications.tier.result.amountCents / 100
            : null);
        const resultXof =
          bonusXof != null && receivedXof != null
            ? Math.round((receivedXof - bonusXof) * 100) / 100
            : purchase.flexmoSubsidyAmount != null
              ? Math.round((-purchase.flexmoSubsidyAmount) * 100) / 100
              : null;
        const hasMarge = bonusXof != null || receivedXof != null;
        const literV = purchase.ruleApplications?.liter?.version;
        const tierV = purchase.ruleApplications?.tier?.version;
        if (!hasMarge) return null;
        return (
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" mb="xs" align="flex-start">
              <Title order={4}>Marge de ce plein</Title>
              <Group gap="xs">
                {literV != null ? (
                  <Badge variant="light" color="blue">
                    cashback_liter v{literV}
                  </Badge>
                ) : null}
                {tierV != null ? (
                  <Badge variant="light" color="blue">
                    cashback_tier v{tierV}
                  </Badge>
                ) : null}
              </Group>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              Total ne finance pas les 20 F/L ; palier à part. FlexMo doit toujours le bonus
              chauffeur.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card withBorder padding="md">
                <Text size="xs" c="dimmed">
                  Bonus FlexMo
                </Text>
                <Text fw={700}>{formatCurrency(bonusXof ?? undefined)}</Text>
              </Card>
              <Card withBorder padding="md">
                <Text size="xs" c="dimmed">
                  Reçu Total
                </Text>
                <Text fw={700}>{formatCurrency(receivedXof ?? undefined)}</Text>
              </Card>
              <Card withBorder padding="md">
                <Text size="xs" c="dimmed">
                  Résultat
                </Text>
                <Text fw={700} c={resultXof == null ? undefined : resultXof >= 0 ? 'teal' : 'red'}>
                  {formatCurrency(resultXof ?? undefined)}
                </Text>
              </Card>
            </SimpleGrid>
          </Card>
        );
      })()}

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Montants et volumes
        </Title>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Th>Produit</Table.Th>
              <Table.Td>{purchase.product || '-'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Litres</Table.Th>
              <Table.Td>{purchase.liters ?? purchase.volume ?? 0}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Prix partenaire</Table.Th>
              <Table.Td>{formatCurrency(purchase.partnerPricePerLiter)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Prix FlexMo</Table.Th>
              <Table.Td>{formatCurrency(purchase.flexmoPricePerLiter ?? purchase.unitPrice)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Montant total</Table.Th>
              <Table.Td>{formatCurrency(purchase.totalAmount)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Remise FlexMo</Table.Th>
              <Table.Td>{formatCurrency(purchase.flexmoDiscount)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Cashback conducteur</Table.Th>
              <Table.Td>{formatCurrency(purchase.driverCashback)}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      {purchase.tierLedgerApplied ? (
        <Card withBorder radius="md" padding="lg">
          <Title order={4} mb="md">
            Snapshot paliers
          </Title>
          <Table mb="md">
            <Table.Tbody>
              <Table.Tr>
                <Table.Th>Palier</Table.Th>
                <Table.Td>P{purchase.tierIndex ?? '-'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Cumul litres</Table.Th>
                <Table.Td>
                  {purchase.cumulativeLitersBefore ?? 0} → {purchase.cumulativeLitersAfter ?? 0}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Prix ref / produit</Table.Th>
                <Table.Td>
                  {formatCurrency(purchase.refPricePerLiter ?? undefined)} ({purchase.productKey || '-'}
                  )
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Reçu Total / L</Table.Th>
                <Table.Td>{formatCurrency(purchase.totalReceivedPerLiter ?? undefined)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Diff FlexMo / L</Table.Th>
                <Table.Td>{formatCurrency(purchase.flexmoDiffPerLiter ?? undefined)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Bonus chauffeur / L</Table.Th>
                <Table.Td>{formatCurrency(purchase.driverBonusPerLiter ?? undefined)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Reçu Total (montant)</Table.Th>
                <Table.Td>{formatCurrency(purchase.totalReceivedAmount ?? undefined)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Subvention FlexMo</Table.Th>
                <Table.Td>{formatCurrency(purchase.flexmoSubsidyAmount ?? undefined)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Th>Bonus chauffeur</Table.Th>
                <Table.Td>{formatCurrency(purchase.driverBonusAmount ?? undefined)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          {(purchase.segments?.length ?? 0) > 1 ? (
            <>
              <Title order={5} mb="sm">
                Segments multi-paliers
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Palier</Table.Th>
                    <Table.Th>Litres</Table.Th>
                    <Table.Th>Taux</Table.Th>
                    <Table.Th>Reçu Total</Table.Th>
                    <Table.Th>Diff FlexMo</Table.Th>
                    <Table.Th>Bonus</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {purchase.segments?.map((s, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>P{s.tierIndex}</Table.Td>
                      <Table.Td>{s.liters}</Table.Td>
                      <Table.Td>{s.ratePct}%</Table.Td>
                      <Table.Td>{formatCurrency(s.totalReceivedAmount)}</Table.Td>
                      <Table.Td>{formatCurrency(s.flexmoSubsidyAmount)}</Table.Td>
                      <Table.Td>{formatCurrency(s.driverBonusAmount)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          ) : null}
        </Card>
      ) : null}

      {purchase.status === 'completed' ? <FuelLedgerCard purchaseId={purchaseId} /> : null}
    </Stack>
  );
}

