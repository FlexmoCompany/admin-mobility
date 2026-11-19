import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, Stack, Table, Text, Title } from '@mantine/core';

import type { Campaign } from '../types';
import { getCampaign, listCampaigns } from '../api';

export function DrawsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const items = await listCampaigns();
        const drawn = items.filter((c) => c.status === 'drawn' || c.winnersPublished);
        const detailed = await Promise.all(drawn.map((c) => getCampaign(c.id)));
        setRows(detailed);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Tirages</Title>
          <Text c="dimmed" size="sm">
            Vue transversale des campagnes tirées
          </Text>
        </div>
        <Button component={Link} to="/campaigns" variant="light">
          Campagnes
        </Button>
      </Group>

      <Table striped withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Campagne</Table.Th>
            <Table.Th>Tirage</Table.Th>
            <Table.Th>Gagnants</Table.Th>
            <Table.Th>Publié</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((c) => {
            const winners = c.participants?.filter((p) => p.isWinner) ?? [];
            return (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Text component={Link} to={`/campaigns/${c.id}`} c="blue" fw={600}>
                    {c.title}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {c.drawnAt
                    ? new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(c.drawnAt))
                    : '—'}
                </Table.Td>
                <Table.Td>
                  {winners.length ? winners.map((w) => w.driverName).join(', ') : '—'}
                </Table.Td>
                <Table.Td>
                  <Badge color={c.winnersPublished ? 'green' : 'orange'}>
                    {c.winnersPublished ? 'Oui' : 'Non'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {rows.length === 0 ? <Text c="dimmed">Aucun tirage pour le moment.</Text> : null}
    </Stack>
  );
}
