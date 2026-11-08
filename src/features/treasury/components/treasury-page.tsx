import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import {
  getLedger,
  postCashbackSettle,
  postProvision,
  postSweep,
  type LedgerLine,
  type TreasuryActionResult,
} from '../api/treasury-api';

type ActionKind = 'provision' | 'settle' | 'sweep';

const formatCents = (cents?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);

export function TreasuryPage() {
  const [amounts, setAmounts] = useState<Record<ActionKind, number | string>>({
    provision: '',
    settle: '',
    sweep: '',
  });
  const [last, setLast] = useState<TreasuryActionResult | null>(null);
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [pendingKind, setPendingKind] = useState<ActionKind | null>(null);

  const feePreview = useMemo(() => {
    const n = Number(amounts.provision);
    if (!Number.isFinite(n) || n <= 0) return null;
    const cents = Math.round(n * 100);
    const fee = Math.round((cents * 50) / 10000);
    return { fee, net: cents - fee };
  }, [amounts.provision]);

  const run = useMutation({
    mutationFn: async (kind: ActionKind) => {
      const n = Number(amounts[kind]);
      if (!Number.isFinite(n) || n <= 0) throw new Error('Montant invalide');
      setPendingKind(kind);
      if (kind === 'provision') return postProvision(n);
      if (kind === 'settle') return postCashbackSettle(n);
      if (kind === 'sweep') return postSweep(n);
      throw new Error('Action inconnue');
    },
    onSuccess: async (result, kind) => {
      setLast(result);
      setAmounts((prev) => ({ ...prev, [kind]: '' }));
      notifications.show({ message: `OK · ${result.eventId}`, color: 'green' });
      try {
        const ledger = await getLedger(result.eventId);
        setLines(ledger.lines ?? result.lines ?? []);
      } catch {
        setLines(result.lines ?? []);
      }
    },
    onError: (error: Error) => {
      notifications.show({ message: error.message || 'Erreur treasury', color: 'red' });
    },
    onSettled: () => setPendingKind(null),
  });

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Trésorerie Mobility</Title>
        <Text c="dimmed" size="sm">
          Écritures journal (centimes). Pas de soldes flotte live ici.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={4}>Appro Wave → Total</Title>
            <Text size="sm" c="dimmed">
              0,5 % de frais Wave (50 bps). Montant = brut FCFA.
            </Text>
            <NumberInput
              label="Montant (FCFA)"
              min={1}
              allowDecimal={false}
              value={amounts.provision}
              onChange={(v) => setAmounts((prev) => ({ ...prev, provision: v }))}
            />
            {feePreview ? (
              <Text size="sm" c="dimmed">
                Frais {formatCents(feePreview.fee)} · Net Total {formatCents(feePreview.net)}
              </Text>
            ) : null}
            <Button
              color="blue"
              loading={run.isPending && pendingKind === 'provision'}
              onClick={() => run.mutate('provision')}
            >
              Approvisionner
            </Button>
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={4}>Encaissement Total → Wave</Title>
            <Text size="sm" c="dimmed">
              Baisse la créance CASHBACK_DUE, crédite Wave.
            </Text>
            <NumberInput
              label="Montant (FCFA)"
              min={1}
              allowDecimal={false}
              value={amounts.settle}
              onChange={(v) => setAmounts((prev) => ({ ...prev, settle: v }))}
            />
            <Button
              color="teal"
              loading={run.isPending && pendingKind === 'settle'}
              onClick={() => run.mutate('settle')}
            >
              Encaisser
            </Button>
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={4}>Sweep Wave → FlexMo</Title>
            <Text size="sm" c="dimmed">
              Déplace du cash Wave vers le compte FlexMo.
            </Text>
            <NumberInput
              label="Montant (FCFA)"
              min={1}
              allowDecimal={false}
              value={amounts.sweep}
              onChange={(v) => setAmounts((prev) => ({ ...prev, sweep: v }))}
            />
            <Button
              color="dark"
              loading={run.isPending && pendingKind === 'sweep'}
              onClick={() => run.mutate('sweep')}
            >
              Balayer
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>

      {last ? (
        <Card withBorder padding="lg">
          <Title order={4} mb="sm">
            Dernière écriture
          </Title>
          <Text size="sm" mb="xs">
            eventId : <code>{last.eventId}</code>
          </Text>
          {last.fee != null ? (
            <Text size="sm" mb="md">
              Frais {formatCents(last.fee)} · Net Total {formatCents(last.net)}
            </Text>
          ) : null}
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Compte</Table.Th>
                <Table.Th>Sens</Table.Th>
                <Table.Th>Montant</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((l, i) => (
                <Table.Tr key={`${l.accountCode}-${i}`}>
                  <Table.Td>{l.accountCode}</Table.Td>
                  <Table.Td>{l.direction}</Table.Td>
                  <Table.Td>{formatCents(l.amount)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ) : null}
    </Stack>
  );
}
