import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';

import type { FuelCardEnv } from '../types';

interface AllocationModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (payload: {amount: number; env: FuelCardEnv}) => Promise<void> | void;
  loading?: boolean;
  env?: FuelCardEnv;
  driverLabel?: string;
}

export function AllocationModal({
  opened,
  onClose,
  onSubmit,
  loading = false,
  env = 'sandbox',
  driverLabel,
}: AllocationModalProps) {
  const [amount, setAmount] = useState('');
  const [targetEnv, setTargetEnv] = useState<FuelCardEnv>(env);

  useEffect(() => {
    if (opened) {
      setAmount('');
      setTargetEnv(env);
    }
  }, [env, opened]);

  return (
    <Modal opened={opened} onClose={onClose} title="Allouer du solde" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {driverLabel
            ? `Crediter la carte carburant de ${driverLabel}.`
            : 'Crediter la carte carburant selectionnee.'}
        </Text>
        <TextInput
          label="Montant (FCFA)"
          type="number"
          min="1"
          value={amount}
          onChange={(event) => setAmount(event.currentTarget.value)}
        />
        <TextInput
          label="Environnement"
          value={targetEnv}
          onChange={(event) => setTargetEnv(event.currentTarget.value as FuelCardEnv)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={loading}
            onClick={async () => {
              const parsedAmount = Number.parseFloat(amount);
              if (!parsedAmount || parsedAmount <= 0) {
                return;
              }
              await onSubmit({amount: parsedAmount, env: targetEnv});
            }}
          >
            Confirmer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

