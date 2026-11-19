import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';

import type { Campaign, CampaignFormValues, CampaignStatus } from '../types';
import { KIND_LABEL, STATUS_LABEL } from '../labels';
import { createCampaign, formToCreateBody, listCampaigns } from '../api';
import { CampaignFormModal } from './campaign-form-modal';

const statusColor: Record<CampaignStatus, string> = {
  draft: 'gray',
  scheduled: 'blue',
  active: 'green',
  closed: 'orange',
  drawn: 'violet',
  archived: 'gray',
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
    : '-';

export function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await listCampaigns());
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Chargement impossible',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.kind.toLowerCase().includes(term) ||
        c.status.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const handleCreate = async (values: CampaignFormValues) => {
    setSubmitting(true);
    try {
      const campaign = await createCampaign(formToCreateBody(values));
      setRows((prev) => [campaign, ...prev]);
      setModalOpen(false);
      notifications.show({
        color: 'green',
        title: 'Campagne créée',
        message: `${campaign.title} — brouillon`,
      });
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Création échouée',
        message: e instanceof Error ? e.message : 'Erreur',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Campagnes jeux</Title>
          <Text c="dimmed" size="sm">
            Concours chauffeurs · tirage = inscrits seulement
          </Text>
        </div>
        <Group>
          <Button component={Link} to="/campaigns/draws" variant="light">
            Tirages
          </Button>
          <Button component={Link} to="/campaigns/fulfillment" variant="light">
            Livraison
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
            Nouvelle campagne
          </Button>
        </Group>
      </Group>

      <TextInput
        placeholder="Rechercher…"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={360}
      />

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Titre</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Statut</Table.Th>
            <Table.Th>Dates</Table.Th>
            <Table.Th>Inscrits</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>
                <Text component={Link} to={`/campaigns/${c.id}`} fw={600} c="blue">
                  {c.title}
                </Text>
              </Table.Td>
              <Table.Td>{KIND_LABEL[c.kind]}</Table.Td>
              <Table.Td>
                <Badge color={statusColor[c.status]}>{STATUS_LABEL[c.status]}</Badge>
              </Table.Td>
              <Table.Td>
                {formatDate(c.startsAt)} → {formatDate(c.endsAt)}
              </Table.Td>
              <Table.Td>
                {c.entriesCount}
                {c.maxEntries ? ` / ${c.maxEntries}` : ''}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {!loading && filtered.length === 0 ? (
        <Text c="dimmed">Aucune campagne.</Text>
      ) : null}

      <CampaignFormModal
        opened={modalOpen}
        isSubmitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </Stack>
  );
}
