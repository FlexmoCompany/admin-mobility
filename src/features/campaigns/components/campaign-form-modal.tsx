import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';

import type {
  CampaignFormPrize,
  CampaignFormValues,
  CampaignKind,
  PrizeKind,
  PrizeRole,
} from '../types';
import { uploadPrizeImage } from '../api';

const emptyPrize = (): CampaignFormPrize => ({
  label: '25 000 FCFA',
  kind: 'cash',
  role: 'sponsor',
  amount: '25000',
  imageUrl: '',
});

const emptyForm = (): CampaignFormValues => ({
  title: '',
  kind: 'CONTEST',
  summary: '',
  rules: '',
  coverage: 'Tous les chauffeurs',
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  maxEntries: '500',
  accountActive: true,
  minTenureDaysEnabled: false,
  minTenureDays: '7',
  minWaveRechargesEnabled: true,
  minWaveRecharges: '2',
  minFuelPurchasesEnabled: false,
  minFuelPurchases: '1',
  minReferralsEnabled: false,
  minReferrals: '3',
  prizes: [emptyPrize()],
});

interface CampaignFormModalProps {
  opened: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CampaignFormValues) => Promise<void>;
}

export function CampaignFormModal({
  opened,
  isSubmitting,
  onClose,
  onSubmit,
}: CampaignFormModalProps) {
  const [form, setForm] = useState<CampaignFormValues>(emptyForm);

  useEffect(() => {
    if (opened) setForm(emptyForm());
  }, [opened]);

  const set = <K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setPrize = <K extends keyof CampaignFormPrize>(
    index: number,
    key: K,
    value: CampaignFormPrize[K]
  ) =>
    setForm((prev) => ({
      ...prev,
      prizes: prev.prizes.map((p, i) => (i === index ? { ...p, [key]: value } : p)),
    }));

  const canSubmit =
    form.title.trim().length > 2 &&
    form.rules.trim().length > 0 &&
    form.prizes.length > 0 &&
    form.prizes.every((p) => p.label.trim().length > 0);

  return (
    <Modal opened={opened} onClose={onClose} title="Nouvelle campagne" centered size="xl">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          S’adresse à tous les chauffeurs (filtre ville plus tard). Critères FlexMo (recharges,
          achats, filleuls).
        </Text>
        <TextInput
          label="Titre"
          value={form.title}
          onChange={(e) => set('title', e.currentTarget.value)}
        />
        <Select
          label="Type"
          data={[
            { value: 'CONTEST', label: 'Tombola' },
            { value: 'REFERRAL', label: 'Parrainage' },
          ]}
          value={form.kind}
          onChange={(v) => set('kind', (v as CampaignKind) || 'CONTEST')}
        />
        <TextInput
          label="Résumé"
          value={form.summary}
          onChange={(e) => set('summary', e.currentTarget.value)}
        />
        <Textarea
          label="Règlement"
          minRows={3}
          value={form.rules}
          onChange={(e) => set('rules', e.currentTarget.value)}
        />
        <TextInput
          label="Couverture"
          value={form.coverage}
          onChange={(e) => set('coverage', e.currentTarget.value)}
        />
        <Group grow>
          <TextInput
            label="Début"
            type="date"
            value={form.startsAt}
            onChange={(e) => set('startsAt', e.currentTarget.value)}
          />
          <TextInput
            label="Fin"
            type="date"
            value={form.endsAt}
            onChange={(e) => set('endsAt', e.currentTarget.value)}
          />
          <NumberInput
            label="Plafond inscriptions"
            value={Number(form.maxEntries) || undefined}
            onChange={(v) => set('maxEntries', String(v ?? ''))}
          />
        </Group>

        <Text fw={600} size="sm">
          Critères (ET)
        </Text>
        <Checkbox
          label="Compte actif"
          checked={form.accountActive}
          onChange={(e) => set('accountActive', e.currentTarget.checked)}
        />
        <Group align="flex-end">
          <Checkbox
            label="Ancienneté (jours)"
            checked={form.minTenureDaysEnabled}
            onChange={(e) => set('minTenureDaysEnabled', e.currentTarget.checked)}
          />
          <TextInput
            style={{ width: 100 }}
            value={form.minTenureDays}
            disabled={!form.minTenureDaysEnabled}
            onChange={(e) => set('minTenureDays', e.currentTarget.value)}
          />
        </Group>
        <Group align="flex-end">
          <Checkbox
            label="Min recharges Wave"
            checked={form.minWaveRechargesEnabled}
            onChange={(e) => set('minWaveRechargesEnabled', e.currentTarget.checked)}
          />
          <TextInput
            style={{ width: 100 }}
            value={form.minWaveRecharges}
            disabled={!form.minWaveRechargesEnabled}
            onChange={(e) => set('minWaveRecharges', e.currentTarget.value)}
          />
        </Group>
        <Group align="flex-end">
          <Checkbox
            label="Min achats carburant"
            checked={form.minFuelPurchasesEnabled}
            onChange={(e) => set('minFuelPurchasesEnabled', e.currentTarget.checked)}
          />
          <TextInput
            style={{ width: 100 }}
            value={form.minFuelPurchases}
            disabled={!form.minFuelPurchasesEnabled}
            onChange={(e) => set('minFuelPurchases', e.currentTarget.value)}
          />
        </Group>
        <Group align="flex-end">
          <Checkbox
            label="Min filleuls"
            checked={form.minReferralsEnabled}
            onChange={(e) => set('minReferralsEnabled', e.currentTarget.checked)}
          />
          <TextInput
            style={{ width: 100 }}
            value={form.minReferrals}
            disabled={!form.minReferralsEnabled}
            onChange={(e) => set('minReferrals', e.currentTarget.value)}
          />
        </Group>

        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            Lots ({form.prizes.length})
          </Text>
          <Button
            size="xs"
            variant="light"
            onClick={() => set('prizes', [...form.prizes, emptyPrize()])}
          >
            Ajouter un lot
          </Button>
        </Group>
        {form.prizes.map((prize, index) => (
          <Stack
            key={index}
            gap="xs"
            p="sm"
            style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
          >
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Lot {index + 1}
              </Text>
              {form.prizes.length > 1 ? (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    set(
                      'prizes',
                      form.prizes.filter((_, i) => i !== index)
                    )
                  }
                >
                  Retirer
                </Button>
              ) : null}
            </Group>
            <Group grow>
              <TextInput
                label="Libellé"
                value={prize.label}
                onChange={(e) => setPrize(index, 'label', e.currentTarget.value)}
              />
              <Select
                label="Type de lot"
                data={[
                  { value: 'cash', label: 'Espèces' },
                  { value: 'voucher', label: 'Bon d’achat' },
                  { value: 'physical', label: 'Cadeau' },
                ]}
                value={prize.kind}
                onChange={(v) => setPrize(index, 'kind', (v as PrizeKind) || 'cash')}
              />
              <Select
                label="Bénéficiaire"
                data={[
                  { value: 'sponsor', label: 'Gagnant' },
                  { value: 'referred', label: 'Filleul' },
                ]}
                value={prize.role}
                onChange={(v) => setPrize(index, 'role', (v as PrizeRole) || 'sponsor')}
              />
            </Group>
            <TextInput
              label="Montant (FCFA)"
              value={prize.amount}
              onChange={(e) => setPrize(index, 'amount', e.currentTarget.value)}
            />
            <TextInput
              label="Lien image du lot"
              placeholder="Coller une URL"
              value={prize.imageUrl}
              onChange={(e) => setPrize(index, 'imageUrl', e.currentTarget.value)}
            />
            <FileInput
              label="Fichier image"
              placeholder="Choisir une image"
              accept="image/*"
              clearable
              onChange={async (file) => {
                if (!file) return;
                try {
                  const url = await uploadPrizeImage(file);
                  setPrize(index, 'imageUrl', url);
                } catch (e) {
                  // garde l’URL manuelle ; toast via console pour rester léger
                  console.error(e);
                }
              }}
            />
            {prize.imageUrl ? (
              <Image
                src={prize.imageUrl}
                alt={`Aperçu lot ${index + 1}`}
                w={72}
                h={72}
                radius="md"
                fit="cover"
              />
            ) : null}
          </Stack>
        ))}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void onSubmit(form)}
          >
            Créer en brouillon
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
