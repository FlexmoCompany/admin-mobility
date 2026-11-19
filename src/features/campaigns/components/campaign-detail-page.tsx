import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Group,
  Image,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { Campaign } from '../types';
import {
  KIND_LABEL,
  PRIZE_KIND_LABEL,
  PRIZE_ROLE_LABEL,
  STATUS_LABEL,
} from '../labels';
import { getCampaign, updateCampaign } from '../api';

export function CampaignDetailPage() {
  const { campaignId = '' } = useParams();
  const [campaign, setCampaign] = useState<Campaign | undefined>();
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setCampaign(await getCampaign(campaignId));
    } catch {
      setCampaign(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  const enabledCriteria = useMemo(
    () => campaign?.criteria.filter((c) => c.enabled) ?? [],
    [campaign]
  );

  if (loading) {
    return <Text c="dimmed">Chargement…</Text>;
  }

  if (!campaign) {
    return (
      <Stack>
        <Text>Campagne introuvable.</Text>
        <Button component={Link} to="/campaigns" variant="light">
          Retour
        </Button>
      </Stack>
    );
  }

  const setStatus = async (status: Campaign['status']) => {
    try {
      const next = await updateCampaign(campaign.id, { status });
      setCampaign(next);
      notifications.show({
        color: 'green',
        title: 'Mis à jour',
        message: STATUS_LABEL[status],
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
          <Button component={Link} to="/campaigns" variant="subtle" size="compact-sm" mb={4}>
            ← Campagnes
          </Button>
          <Title order={2}>{campaign.title}</Title>
          <Group gap="xs" mt={4}>
            <Badge>{KIND_LABEL[campaign.kind]}</Badge>
            <Badge color="gray">{STATUS_LABEL[campaign.status]}</Badge>
            {campaign.winnersPublished ? (
              <Badge color="green">Gagnants publiés</Badge>
            ) : null}
          </Group>
        </div>
        <Group>
          <Button
            variant="light"
            disabled={campaign.status !== 'draft' && campaign.status !== 'scheduled'}
            onClick={() => void setStatus('active')}
          >
            Publier
          </Button>
          <Button
            variant="light"
            color="orange"
            disabled={campaign.status !== 'active'}
            onClick={() => void setStatus('closed')}
          >
            Clôturer
          </Button>
          <Button
            variant="light"
            color="violet"
            disabled
            title="Tirage auto — tranche suivante"
          >
            Tirer
          </Button>
          <Button disabled title="Publication gagnants — tranche suivante">
            Publier gagnants
          </Button>
        </Group>
      </Group>

      <Group grow align="stretch">
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Inscrits
          </Text>
          <Title order={3}>
            {campaign.entriesCount}
            {campaign.maxEntries ? ` / ${campaign.maxEntries}` : ''}
          </Title>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Couverture
          </Text>
          <Title order={3}>{campaign.coverage}</Title>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Lots
          </Text>
          <Title order={3}>{campaign.prizes.length}</Title>
        </Card>
      </Group>

      <Card withBorder>
        <Title order={4} mb="sm">
          Critères actifs
        </Title>
        {enabledCriteria.map((c) => (
          <Text key={c.key} size="sm">
            · {c.label}
            {c.value != null ? ` : ${c.value}` : ''}
          </Text>
        ))}
        <Text size="sm" mt="md" c="dimmed">
          {campaign.rules}
        </Text>
      </Card>

      <div>
        <Title order={4} mb="sm">
          Lots
        </Title>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Image</Table.Th>
              <Table.Th>Libellé</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Rôle</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {campaign.prizes.map((prize) => (
              <Table.Tr key={prize.id}>
                <Table.Td>
                  {prize.imageUrl ? (
                    <Image
                      src={prize.imageUrl}
                      alt={prize.label}
                      w={48}
                      h={48}
                      radius="sm"
                      fit="cover"
                    />
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{prize.label}</Table.Td>
                <Table.Td>{PRIZE_KIND_LABEL[prize.kind]}</Table.Td>
                <Table.Td>{PRIZE_ROLE_LABEL[prize.role]}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>

      <div>
        <Title order={4} mb="sm">
          Participants ({campaign.participants.length})
        </Title>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Chauffeur</Table.Th>
              <Table.Th>Téléphone</Table.Th>
              <Table.Th>Inscrit le</Table.Th>
              <Table.Th>Résultat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {campaign.participants.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>{p.driverName}</Table.Td>
                <Table.Td>{p.phone}</Table.Td>
                <Table.Td>
                  {p.enrolledAt
                    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
                        new Date(p.enrolledAt)
                      )
                    : '—'}
                </Table.Td>
                <Table.Td>
                  {p.isWinner ? (
                    <Badge color="green">{p.prizeLabel || 'Gagnant'}</Badge>
                  ) : (
                    '—'
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Stack>
  );
}
