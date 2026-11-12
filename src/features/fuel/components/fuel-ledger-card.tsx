import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Group, Table, Text, Title } from '@mantine/core';

import { ApiError } from '@/shared/api/http';
import { getLedger, type LedgerResponse } from '@/features/treasury/api/treasury-api';

const ACCOUNT_LABELS: Record<string, string> = {
  PREPAID: 'Prepaye chauffeur',
  SOLDE: 'Solde',
  BONUS: 'Bonus chauffeur',
  INCOME_TIER: 'Marge paliers',
  INCOME_PENALTY: 'Penalites',
  EXPENSE_CASHBACK: 'Cashback',
  CASHBACK_DUE: 'Cashback du',
  TOTAL: 'Total',
  WAVE: 'Wave',
  FLEXMO: 'FlexMo',
  CARD: 'Carte',
};

function accountLabel(code: string) {
  const [base, owner] = code.split(':');
  const label = ACCOUNT_LABELS[base] ?? base;
  return owner ? `${label} · ${owner.slice(-6)}` : label;
}

const formatCents = (cents: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(cents / 100);

/**
 * Ecriture comptable de l'achat, telle que passee au grand livre finance.
 * Absente tant que le relais outbox tiers -> finance ne l'a pas transmise.
 */
export function FuelLedgerCard({ purchaseId }: { purchaseId: string }) {
  // tiers-service passe l'achat au grand livre avec son identifiant comme
  // cle d'idempotence (models/driver/fuel.js -> postFuel).
  const eventId = purchaseId;
  const ledgerQuery = useQuery<LedgerResponse | null>({
    queryKey: ['ledger', eventId],
    queryFn: async () => {
      try {
        return await getLedger(eventId);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    retry: false,
  });

  const ledger = ledgerQuery.data;
  const lines = ledger?.lines ?? [];

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Grand livre</Title>
        {ledgerQuery.isLoading ? null : ledger ? (
          <Badge color="green" variant="light">
            Ecriture passee
          </Badge>
        ) : ledgerQuery.isError ? (
          <Badge color="red" variant="light">
            Indisponible
          </Badge>
        ) : (
          <Badge color="yellow" variant="light">
            En attente
          </Badge>
        )}
      </Group>

      {ledgerQuery.isLoading ? (
        <Text c="dimmed">Chargement de l&apos;ecriture...</Text>
      ) : ledgerQuery.isError ? (
        <Text c="red">
          {ledgerQuery.error instanceof Error
            ? ledgerQuery.error.message
            : 'Grand livre injoignable.'}
        </Text>
      ) : !ledger ? (
        <Text c="dimmed">
          Pas encore au grand livre. L&apos;ecriture est transmise par tiers-service
          quelques secondes apres la validation de l&apos;achat.
        </Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Compte</Table.Th>
              <Table.Th ta="right">Debit</Table.Th>
              <Table.Th ta="right">Credit</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line, index) => (
              <Table.Tr key={`${line.accountCode}-${line.direction}-${index}`}>
                <Table.Td>{accountLabel(line.accountCode)}</Table.Td>
                <Table.Td ta="right">
                  {line.direction === 'debit' ? formatCents(line.amount) : ''}
                </Table.Td>
                <Table.Td ta="right">
                  {line.direction === 'credit' ? formatCents(line.amount) : ''}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}
