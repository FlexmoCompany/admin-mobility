import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';

import {
  AUDIENCE_LABELS,
  CTA_ROUTES,
  KIND_LABELS,
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  liveState,
  publishAnnouncement,
  updateAnnouncement,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementLiveState,
  type AnnouncementStatus,
} from '../api';
import { AnnouncementFormModal } from './announcement-form-modal';
import { AnnouncementPreview } from './announcement-preview';

const QUERY_KEY = ['announcements'] as const;

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : null;

const LIVE_BADGES: Record<AnnouncementLiveState, { label: string; color: string }> = {
  live: { label: 'En ligne', color: 'green' },
  scheduled: { label: 'Programmée', color: 'blue' },
  ended: { label: 'Terminée', color: 'orange' },
  draft: { label: 'Brouillon', color: 'gray' },
  archived: { label: 'Archivée', color: 'dark' },
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'La requête a échoué.');

type Filter = 'all' | AnnouncementStatus;
type Confirm = { action: 'archive' | 'delete'; announcement: Announcement } | null;

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Le contenu reste en place pendant l'animation de fermeture du modal.
  const [confirm, setConfirmState] = useState<Confirm>(null);
  const [confirmOpened, setConfirmOpened] = useState(false);
  const setConfirm = (next: Confirm) => {
    if (next) setConfirmState(next);
    setConfirmOpened(next !== null);
  };

  const query = useQuery({
    queryKey: [...QUERY_KEY, filter],
    queryFn: () => listAnnouncements({ status: filter === 'all' ? undefined : filter, limit: 100 }),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  // Celle que voit un chauffeur visé par « tous » : la plus récemment publiée en ligne.
  const current = useMemo(
    () =>
      items
        .filter((a) => liveState(a) === 'live' && a.audience === 'all')
        .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))[0] ?? null,
    [items]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: async ({ input, publish }: { input: AnnouncementInput; publish: boolean }) => {
      const saved = editing
        ? (await updateAnnouncement(editing._id, input)).announcement
        : (await createAnnouncement(input)).announcement;
      return publish ? (await publishAnnouncement(saved._id)).announcement : saved;
    },
    onSuccess: (saved, { publish }) => {
      void invalidate();
      setIsFormOpen(false);
      notifications.show({
        color: 'green',
        title: publish ? 'Annonce publiée' : 'Annonce enregistrée',
        message: publish ? `« ${saved.title} » est visible sur l'accueil des chauffeurs.` : `« ${saved.title} »`,
      });
    },
    onError: (error) => {
      // Une creation reussie suivie d'une publication refusee laisse un brouillon : rafraichir.
      void invalidate();
      setFormError(errorMessage(error));
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, id }: { action: 'publish' | 'archive' | 'delete'; id: string }) => {
      if (action === 'publish') return publishAnnouncement(id);
      if (action === 'archive') return archiveAnnouncement(id);
      return deleteAnnouncement(id);
    },
    onSuccess: (_data, { action }) => {
      void invalidate();
      setConfirm(null);
      notifications.show({
        color: action === 'delete' ? 'gray' : 'green',
        title: { publish: 'Annonce publiée', archive: 'Annonce archivée', delete: 'Annonce supprimée' }[action],
        message:
          action === 'archive' ? "Elle n'apparaît plus sur l'accueil des chauffeurs." : action === 'publish' ? 'Visible sur l\'accueil des chauffeurs.' : '',
      });
    },
    onError: (error) => notifications.show({ color: 'red', title: 'Action impossible', message: errorMessage(error) }),
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setIsFormOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setFormError(null);
    setIsFormOpen(true);
  };

  const ctaText = (a: Announcement) => {
    if (!a.ctaLabel) return null;
    const target = a.ctaRoute ? CTA_ROUTES.find((r) => r.value === a.ctaRoute)?.label ?? a.ctaRoute : a.ctaUrl;
    return `${a.ctaLabel} → ${target}`;
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Annonces</Title>
          <Text c="dimmed" size="sm">
            Carte affichée sur l'accueil de l'app chauffeur : info utile, mise à jour, nouveauté.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nouvelle annonce
        </Button>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Group align="flex-start" gap="xl" wrap="wrap">
          <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
            <Text size="sm" c="dimmed">
              En ce moment sur l'accueil (tous les chauffeurs)
            </Text>
            {current ? (
              <>
                <Title order={4}>{current.title}</Title>
                <Text size="sm">
                  Publiée le {formatDate(current.publishedAt)}
                  {current.endsAt ? ` · jusqu'au ${formatDate(current.endsAt)}` : ''}
                </Text>
                <Group mt="xs">
                  <Button size="xs" variant="light" color="red" onClick={() => setConfirm({ action: 'archive', announcement: current })}>
                    Archiver
                  </Button>
                </Group>
              </>
            ) : (
              <Text size="sm">Aucune annonce : la carte est masquée dans l'app.</Text>
            )}
          </Stack>
          {current ? (
            <AnnouncementPreview
              kind={current.kind}
              title={current.title}
              body={current.body}
              ctaLabel={current.ctaLabel}
              hasTarget={Boolean(current.ctaRoute || current.ctaUrl)}
            />
          ) : null}
        </Group>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={4}>Toutes les annonces</Title>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { value: 'all', label: 'Toutes' },
              { value: 'published', label: 'Publiées' },
              { value: 'draft', label: 'Brouillons' },
              { value: 'archived', label: 'Archivées' },
            ]}
          />
        </Group>

        {query.isError ? (
          <Alert color="red" variant="light" mb="md">
            {errorMessage(query.error)}
          </Alert>
        ) : null}

        <Table.ScrollContainer minWidth={860}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Annonce</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Audience</Table.Th>
                <Table.Th>Fenêtre</Table.Th>
                <Table.Th>État</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((a) => {
                const state = liveState(a);
                const badge = LIVE_BADGES[state];
                const busy = actionMutation.isPending && actionMutation.variables?.id === a._id;
                return (
                  <Table.Tr key={a._id} data-testid={`announcement-row-${a._id}`}>
                    <Table.Td maw={340}>
                      <Text fw={600} lineClamp={1}>
                        {a.title}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {a.body}
                      </Text>
                      {ctaText(a) ? (
                        <Text size="xs" c="blue" mt={2}>
                          {ctaText(a)}
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>{KIND_LABELS[a.kind]}</Table.Td>
                    <Table.Td>{AUDIENCE_LABELS[a.audience]}</Table.Td>
                    <Table.Td>
                      <Text size="xs">{a.startsAt ? `Du ${formatDate(a.startsAt)}` : 'Dès publication'}</Text>
                      <Text size="xs">{a.endsAt ? `Au ${formatDate(a.endsAt)}` : "Jusqu'à archivage"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={badge.color} variant="light">
                        {badge.label}
                      </Badge>
                      {a.publishedAt && a.status === 'published' ? (
                        <Text size="xs" c="dimmed" mt={2}>
                          {formatDate(a.publishedAt)}
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button size="xs" variant="default" onClick={() => openEdit(a)}>
                          Modifier
                        </Button>
                        {a.status !== 'published' && state !== 'ended' ? (
                          <Button
                            size="xs"
                            loading={busy && actionMutation.variables?.action === 'publish'}
                            onClick={() => actionMutation.mutate({ action: 'publish', id: a._id })}
                            disabled={Boolean(a.endsAt && new Date(a.endsAt) <= new Date())}
                          >
                            Publier
                          </Button>
                        ) : null}
                        {a.status === 'published' ? (
                          <Button size="xs" variant="light" color="red" onClick={() => setConfirm({ action: 'archive', announcement: a })}>
                            Archiver
                          </Button>
                        ) : (
                          <Button size="xs" variant="subtle" color="red" onClick={() => setConfirm({ action: 'delete', announcement: a })}>
                            Supprimer
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {query.isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Group justify="center" py="md">
                      <Loader size="sm" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ) : null}
              {!query.isLoading && items.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="md">
                      Aucune annonce{filter === 'all' ? '' : ' pour ce filtre'}.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <AnnouncementFormModal
        opened={isFormOpen}
        announcement={editing}
        isSubmitting={saveMutation.isPending}
        error={formError}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (input, { publish }) => {
          setFormError(null);
          await saveMutation.mutateAsync({ input, publish }).catch(() => undefined);
        }}
      />

      <Modal
        opened={confirmOpened}
        onClose={() => setConfirm(null)}
        title={confirm?.action === 'archive' ? "Archiver l'annonce ?" : "Supprimer l'annonce ?"}
        centered
      >
        <Text size="sm">
          {confirm?.action === 'archive'
            ? `« ${confirm.announcement.title} » disparaîtra de l'accueil des chauffeurs. Vous pourrez la republier.`
            : `« ${confirm?.announcement.title ?? ''} » sera supprimée définitivement.`}
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button
            color="red"
            loading={actionMutation.isPending}
            onClick={() => confirm && actionMutation.mutate({ action: confirm.action, id: confirm.announcement._id })}
          >
            {confirm?.action === 'archive' ? 'Archiver' : 'Supprimer'}
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
