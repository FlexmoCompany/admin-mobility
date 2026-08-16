import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';

import type { DriverRecord } from '@/features/drivers/types';

interface VehicleAssignmentModalProps {
  opened: boolean;
  drivers: DriverRecord[];
  currentDriverId?: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onAssign: (driverId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
}

const buildDriverLabel = (driver: DriverRecord) =>
  [driver.firstName, driver.lastName].filter(Boolean).join(' ') || driver.reference || 'Conducteur';

export function VehicleAssignmentModal({
  opened,
  drivers,
  currentDriverId,
  isSubmitting,
  onClose,
  onAssign,
  onUnassign,
}: VehicleAssignmentModalProps) {
  const [driverId, setDriverId] = useState('');

  const driverOptions = useMemo(
    () =>
      drivers.map((driver) => ({
        value: driver._id,
        label: `${buildDriverLabel(driver)}${driver.reference ? ` (${driver.reference})` : ''}`,
      })),
    [drivers]
  );

  useEffect(() => {
    if (opened) {
      setDriverId(currentDriverId ?? '');
    }
  }, [currentDriverId, opened]);

  const isDisabled = !driverId || driverId === currentDriverId;

  return (
    <Modal opened={opened} onClose={onClose} title="Affectation conducteur" centered>
      <Stack>
        <Text c="dimmed" size="sm">
          Selectionne un conducteur pour lier ce vehicule.
        </Text>
        <Select
          label="Conducteur"
          data={driverOptions}
          value={driverId}
          onChange={(value) => setDriverId(value ?? '')}
          searchable
        />
        <Group justify="space-between">
          <Button variant="default" onClick={onClose}>
            Fermer
          </Button>
          <Group>
            <Button
              variant="default"
              color="red"
              onClick={() => void onUnassign()}
              disabled={!currentDriverId}
              loading={isSubmitting}
            >
              Retirer
            </Button>
            <Button
              onClick={() => void onAssign(driverId)}
              disabled={isDisabled}
              loading={isSubmitting}
            >
              Assigner
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

