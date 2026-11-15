import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';

import {
  ANNOUNCEMENT_LIMITS,
  AUDIENCE_LABELS,
  CTA_ROUTES,
  KIND_LABELS,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementInput,
  type AnnouncementKind,
} from '../api';
import { AnnouncementPreview } from './announcement-preview';

type CtaMode = 'none' | 'route' | 'url';

interface AnnouncementFormModalProps {
  opened: boolean;
  /** Annonce a modifier ; absente pour une creation. */
  announcement: Announcement | null;
  isSubmitting: boolean;
  /** Superadmin : peut publier. Sinon, seul le brouillon est proposé. */
  canPublish: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: AnnouncementInput, options: { publish: boolean }) => Promise<void>;
}

/** ISO -> valeur d'un <input type="datetime-local"> (heure locale). */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function AnnouncementFormModal({
  opened,
  announcement,
  isSubmitting,
  canPublish,
  error,
  onClose,
  onSubmit,
}: AnnouncementFormModalProps) {
  const [kind, setKind] = useState<AnnouncementKind>('news');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaMode, setCtaMode] = useState<CtaMode>('none');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaRoute, setCtaRoute] = useState<string | null>(null);
  const [ctaUrl, setCtaUrl] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    if (!opened) return;
    const a = announcement;
    setKind(a?.kind ?? 'news');
    setTitle(a?.title ?? '');
    setBody(a?.body ?? '');
    setCtaMode(a?.ctaRoute ? 'route' : a?.ctaUrl ? 'url' : 'none');
    setCtaLabel(a?.ctaLabel ?? '');
    setCtaRoute(a?.ctaRoute ?? null);
    setCtaUrl(a?.ctaUrl ?? '');
    setAudience(a?.audience ?? 'all');
    setStartsAt(toLocalInput(a?.startsAt));
    setEndsAt(toLocalInput(a?.endsAt));
  }, [opened, announcement]);

  const hasTarget = ctaMode === 'route' ? Boolean(ctaRoute) : ctaMode === 'url' ? ctaUrl.trim().length > 0 : false;
  const windowInvalid = Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt));
  const endInPast = Boolean(endsAt && new Date(endsAt) <= new Date());
  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (ctaMode === 'none' || (hasTarget && ctaLabel.trim().length > 0)) &&
    !windowInvalid;

  const buildInput = (): AnnouncementInput => ({
    kind,
    title: title.trim(),
    body: body.trim(),
    ctaLabel: ctaMode === 'none' ? null : ctaLabel.trim(),
    ctaRoute: ctaMode === 'route' ? ctaRoute : null,
    ctaUrl: ctaMode === 'url' ? ctaUrl.trim() : null,
    audience,
    startsAt: fromLocalInput(startsAt),
    endsAt: fromLocalInput(endsAt),
  });

  const isPublished = announcement?.status === 'published';
  const isEdit = Boolean(announcement);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Modifier l'annonce" : 'Nouvelle annonce'}
      centered
      size="xl"
    >
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="sm">
            <Select
              label="Type"
              data={(Object.keys(KIND_LABELS) as AnnouncementKind[]).map((value) => ({
                value,
                label: KIND_LABELS[value],
              }))}
              value={kind}
              onChange={(v) => v && setKind(v as AnnouncementKind)}
              allowDeselect={false}
            />
            <TextInput
              label="Titre"
              placeholder="Trouvez une station près de vous"
              value={title}
              maxLength={ANNOUNCEMENT_LIMITS.title}
              description={`${title.length}/${ANNOUNCEMENT_LIMITS.title} — 2 lignes visibles dans l'app`}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Texte"
              placeholder="Ce que le chauffeur doit savoir…"
              minRows={3}
              autosize
              value={body}
              maxLength={ANNOUNCEMENT_LIMITS.body}
              description={`${body.length}/${ANNOUNCEMENT_LIMITS.body} — 4 lignes visibles dans l'app`}
              onChange={(e) => setBody(e.currentTarget.value)}
              required
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                Bouton
              </Text>
              <SegmentedControl
                fullWidth
                value={ctaMode}
                onChange={(v) => setCtaMode(v as CtaMode)}
                data={[
                  { value: 'none', label: 'Aucun' },
                  { value: 'route', label: "Écran de l'app" },
                  { value: 'url', label: 'Lien web' },
                ]}
              />
            </div>
            {ctaMode !== 'none' ? (
              <Group grow align="flex-start">
                <TextInput
                  label="Libellé du bouton"
                  placeholder="Essayer"
                  value={ctaLabel}
                  maxLength={ANNOUNCEMENT_LIMITS.ctaLabel}
                  onChange={(e) => setCtaLabel(e.currentTarget.value)}
                  required
                />
                {ctaMode === 'route' ? (
                  <Select
                    label="Écran ouvert"
                    placeholder="Choisir un écran"
                    data={CTA_ROUTES}
                    value={ctaRoute}
                    onChange={setCtaRoute}
                    required
                  />
                ) : (
                  <TextInput
                    label="Lien"
                    placeholder="https://…"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.currentTarget.value)}
                    required
                  />
                )}
              </Group>
            ) : null}

            <Select
              label="Audience"
              data={(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((value) => ({
                value,
                label: AUDIENCE_LABELS[value],
              }))}
              value={audience}
              onChange={(v) => v && setAudience(v as AnnouncementAudience)}
              allowDeselect={false}
            />
            <Group grow align="flex-start">
              <TextInput
                type="datetime-local"
                label="Début (facultatif)"
                description="Vide : dès la publication"
                value={startsAt}
                onChange={(e) => setStartsAt(e.currentTarget.value)}
              />
              <TextInput
                type="datetime-local"
                label="Fin (facultatif)"
                description="Vide : jusqu'à l'archivage"
                value={endsAt}
                onChange={(e) => setEndsAt(e.currentTarget.value)}
                error={windowInvalid ? 'La fin doit suivre le début.' : endInPast ? 'Date déjà passée.' : undefined}
              />
            </Group>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Aperçu sur l'accueil
            </Text>
            <AnnouncementPreview kind={kind} title={title} body={body} ctaLabel={ctaLabel} hasTarget={hasTarget} />
            <Text size="xs" c="dimmed">
              Une seule annonce est visible à la fois : la plus récemment publiée. Le chauffeur peut la fermer ; elle
              ne réapparaît plus chez lui, même modifiée.
            </Text>
          </Stack>
        </Grid.Col>
      </Grid>

      {error ? (
        <Alert color="red" mt="md" variant="light">
          {error}
        </Alert>
      ) : null}

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        {isPublished ? (
          <Button onClick={() => void onSubmit(buildInput(), { publish: false })} loading={isSubmitting} disabled={!canSubmit}>
            Enregistrer (en ligne)
          </Button>
        ) : (
          <>
            <Button
              variant="light"
              onClick={() => void onSubmit(buildInput(), { publish: false })}
              loading={isSubmitting}
              disabled={!canSubmit}
            >
              Enregistrer le brouillon
            </Button>
            {canPublish ? (
              <Button
                onClick={() => void onSubmit(buildInput(), { publish: true })}
                loading={isSubmitting}
                disabled={!canSubmit || endInPast}
              >
                Enregistrer et publier
              </Button>
            ) : null}
          </>
        )}
      </Group>
    </Modal>
  );
}
