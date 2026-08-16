import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Group, SimpleGrid, Stack, Table, Text, Tooltip, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

import { getFuelPurchaseById } from '../api/fuel-api';
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
    </Stack>
  );
}

