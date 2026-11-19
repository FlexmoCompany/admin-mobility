import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, Image, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { CampaignGrant } from '../types';
import { GRANT_STATUS_LABEL } from '../labels';
import { listGrants, patchGrant } from '../api';

export function FulfillmentPage() {
  const [grants, setGrants] = useState<CampaignGrant[]>([]);

  const reload = async () => {
    try {
      setGrants(await listGrants());
    } catch {
      setGrants([]);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const markDelivered = async (grant: CampaignGrant) => {
    try {
      const next = await patchGrant(grant.id, 'delivered');
      setGrants((prev) => prev.map((g) => (g.id === next.id ? next : g)));
      notifications.show({
        color: 'green',
        title: 'Livré',
        message: `${grant.driverName} — ${grant.prizeLabel}`,
      });
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Échec',
      });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Livraison des lots</Title>
          <Text c="dimmed" size="sm">
            Lots à remettre après publication des gagnants
          </Text>
        </div>
        <Button component={Link} to="/campaigns" variant="light">
          Campagnes
        </Button>
      </Group>

      <Table striped withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Image</Table.Th>
            <Table.Th>Campagne</Table.Th>
            <Table.Th>Chauffeur</Table.Th>
            <Table.Th>Lot</Table.Th>
            <Table.Th>Statut</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {grants.map((g) => (
            <Table.Tr key={g.id}>
              <Table.Td>
                {g.imageUrl ? (
                  <Image src={g.imageUrl} alt={g.prizeLabel} w={48} h={48} radius="sm" fit="cover" />
                ) : (
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
              <Table.Td>{g.campaignTitle}</Table.Td>
              <Table.Td>{g.driverName}</Table.Td>
              <Table.Td>{g.prizeLabel}</Table.Td>
              <Table.Td>
                <Badge color={g.status === 'delivered' ? 'green' : 'orange'}>
                  {GRANT_STATUS_LABEL[g.status]}
                </Badge>
              </Table.Td>
              <Table.Td>
                {g.status === 'pending' ? (
                  <Button size="xs" onClick={() => void markDelivered(g)}>
                    Marquer livré
                  </Button>
                ) : null}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {grants.length === 0 ? <Text c="dimmed">Aucun lot à livrer.</Text> : null}
    </Stack>
  );
}
