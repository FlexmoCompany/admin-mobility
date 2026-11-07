import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  Group,
  Modal,
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

const ACTIONS: Array<{
  kind: ActionKind;
  title: string;
  hint: string;
}> = [
  {
    kind: 'provision',
    title: 'Appro Wave → Total',
    hint: '0,5 % de frais Wave (50 bps). Montant = brut FCFA.',
  },
  {
    kind: 'settle',
    title: 'Encaissement Total → Wave',
    hint: 'Baisse la créance CASHBACK_DUE, crédite Wave.',
  },
  {
    kind: 'sweep',
    title: 'Sweep Wave → FlexMo',
    hint: 'Déplace du cash Wave vers le compte FlexMo.',
  },
];

const formatCents = (cents?: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);

export function TreasuryPage() {
  const [kind, setKind] = useState<ActionKind | null>(null);
  const [amount, setAmount] = useState<number | string>('');
  const [last, setLast] = useState<TreasuryActionResult | null>(null);
  const [lines, setLines] = useState<LedgerLine[]>([]);

  const feePreview = useMemo(() => {
    const n = Number(amount);
    if (kind !== 'provision' || !Number.isFinite(n) || n <= 0) return null;
    const cents = Math.round(n * 100);
    const fee = Math.round((cents * 50) / 10000);
    return {fee, net: cents - fee};
  }, [amount, kind]);

  const run = useMutation({
    mutationFn: async () => {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) throw new Error('Montant invalide');
      if (kind === 'provision') return postProvision(n);
      if (kind === 'settle') return postCashbackSettle(n);
      if (kind === 'sweep') return postSweep(n);
      throw new Error('Action inconnue');
    },
    onSuccess: async (result) => {
      setLast(result);
      setKind(null);
      setAmount('');
      notifications.show({message: `OK · ${result.eventId}`, color: 'green'});
      try {
        const ledger = await getLedger(result.eventId);
        setLines(ledger.lines ?? result.lines ?? []);
      } catch {
        setLines(result.lines ?? []);
      }
    },
    onError: (error: Error) => {
      notifications.show({message: error.message || 'Erreur treasury', color: 'red'});
    },
  });

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Trésorerie Mobility</Title>
        <Text c="dimmed" size="sm">
          Écritures journal (centimes). Pas de soldes poches live ici.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {ACTIONS.map((a) => (
          <Card key={a.kind} withBorder padding="lg">
            <Stack gap="sm">
              <Title order={4}>{a.title}</Title>
              <Text size="sm" c="dimmed">
                {a.hint}
              </Text>
              <Button onClick={() => setKind(a.kind)}>Lancer</Button>
            </Stack>
          </Card>
        ))}
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

      <Modal
        opened={kind != null}
        onClose={() => setKind(null)}
        title={ACTIONS.find((a) => a.kind === kind)?.title ?? 'Treasury'}
        centered
      >
        <Stack>
          <NumberInput
            label="Montant (FCFA)"
            min={1}
            allowDecimal={false}
            value={amount}
            onChange={setAmount}
          />
          {feePreview ? (
            <Text size="sm" c="dimmed">
              Frais estimés {formatCents(feePreview.fee)} · Net Total{' '}
              {formatCents(feePreview.net)}
            </Text>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setKind(null)}>
              Annuler
            </Button>
            <Button loading={run.isPending} onClick={() => run.mutate()}>
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
