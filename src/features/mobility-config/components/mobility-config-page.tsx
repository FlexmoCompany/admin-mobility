import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import {
  getCockpitCashbackTotals,
  getMobilityConfig,
  listRuleVersions,
  listTierTransitions,
  putAgentConfig,
  putCashbackConfig,
  putReferralConfig,
  putWelcomeConfig,
  type MobilityTier,
} from '../api';

function toastOk(msg: string) {
  notifications.show({ message: msg, color: 'green' });
}
function toastErr(error: Error) {
  notifications.show({ message: error.message || 'Erreur', color: 'red' });
}

function CashbackTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobility-config'], queryFn: getMobilityConfig });
  const versionsQuery = useQuery({
    queryKey: ['rule-versions', 'cashback_liter'],
    queryFn: () => listRuleVersions('cashback_liter'),
  });
  const totalsQuery = useQuery({
    queryKey: ['mobility-config', 'cockpit-totals'],
    queryFn: getCockpitCashbackTotals,
    retry: false,
  });
  const [bonus, setBonus] = useState<number | string>(20);
  const [minPayout, setMinPayout] = useState<number | string>(5000);
  const [gasoil, setGasoil] = useState<number | string>(725);
  const [essence, setEssence] = useState<number | string>(905);
  const [tiers, setTiers] = useState<MobilityTier[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const c = query.data?.config?.cashback;
    if (!c) return;
    setBonus(c.driverBonusPerLiter);
    setMinPayout(c.minPayout);
    setGasoil(c.products.find((p) => p.key === 'gasoil')?.refPricePerLiter ?? 725);
    setEssence(c.products.find((p) => p.key === 'essence')?.refPricePerLiter ?? 905);
    setTiers(c.tiers.map((t) => ({ ...t })));
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      putCashbackConfig({
        driverBonusPerLiter: Number(bonus),
        minPayout: Number(minPayout),
        products: [
          { key: 'gasoil', refPricePerLiter: Number(gasoil) },
          { key: 'essence', refPricePerLiter: Number(essence) },
        ],
        tiers: tiers.map((t) => ({
          fromLiters: Number(t.fromLiters),
          toLiters: t.toLiters == null ? null : Number(t.toLiters),
          ratePct: Number(t.ratePct),
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobility-config'] });
      void queryClient.invalidateQueries({ queryKey: ['rule-versions'] });
      setConfirmOpen(false);
      toastOk('Versions publiées (cashback / paliers / seuil)');
    },
    onError: toastErr,
  });

  const updateTier = (i: number, patch: Partial<MobilityTier>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const resetDraft = () => {
    const c = query.data?.config?.cashback;
    if (!c) return;
    setBonus(c.driverBonusPerLiter);
    setMinPayout(c.minPayout);
    setGasoil(c.products.find((p) => p.key === 'gasoil')?.refPricePerLiter ?? 725);
    setEssence(c.products.find((p) => p.key === 'essence')?.refPricePerLiter ?? 905);
    setTiers(c.tiers.map((t) => ({ ...t })));
  };

  const rv = query.data?.ruleVersions;
  const literV = rv?.cashback_liter?.version;
  const tierV = rv?.cashback_tier?.version;
  const thrV = rv?.bonus_threshold?.version;
  const totals = totalsQuery.data;
  const avgMargin =
    totals && totals.liters > 0
      ? (totals.totalReceivedFromPartner - totals.driverBonusPaid) / totals.liters
      : null;

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" title="Publication versionnée">
        Publier = version N+1. Les pleins passés restent collés à N. Total ne paie pas les 20 F/L ;
        le palier est un flux à part.
      </Alert>

      <Group gap="xs">
        <Badge variant="light" color="blue">
          cashback_liter v{literV ?? '-'}
        </Badge>
        <Badge variant="light" color="blue">
          cashback_tier v{tierV ?? '-'}
        </Badge>
        <Badge variant="light" color="blue">
          bonus_threshold v{thrV ?? '-'}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Bonus chauffeur
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(bonus)} F/L
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Seuil déblocage jauge
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(minPayout).toLocaleString('fr-FR')} F
          </Text>
        </Card>
        {totals && !totalsQuery.isError ? (
          <Card withBorder padding="md">
            <Text size="xs" c="dimmed" fw={700}>
              Volume (cockpit)
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {totals.liters.toLocaleString('fr-FR')} L
            </Text>
          </Card>
        ) : null}
        {avgMargin != null ? (
          <Card withBorder padding="md">
            <Text size="xs" c="dimmed" fw={700}>
              Marge nette moy. / L
            </Text>
            <Text fw={800} size="xl" mt={4} c={avgMargin >= 0 ? 'teal' : 'red'}>
              {avgMargin >= 0 ? '+' : ''}
              {avgMargin.toLocaleString('fr-FR', {maximumFractionDigits: 2})} F
            </Text>
          </Card>
        ) : null}
      </SimpleGrid>

      <Card withBorder padding="lg">
        <Group justify="space-between" mb="md">
          <Title order={4}>Paramètres candidats (brouillon)</Title>
          <Badge color="orange" variant="light">
            En édition
          </Badge>
        </Group>
        <Stack gap="lg">
          <div>
            <Text fw={700} mb="sm">
              1. Bonus chauffeur &amp; seuil
            </Text>
            <Group grow>
              <NumberInput
                label="Bonus chauffeur (F/L)"
                min={0}
                value={bonus}
                onChange={setBonus}
              />
              <NumberInput
                label="Seuil reversement (XOF)"
                min={0}
                allowDecimal={false}
                value={minPayout}
                onChange={setMinPayout}
              />
            </Group>
          </div>
          <div>
            <Text fw={700} mb="sm">
              2. Prix officiels de référence
            </Text>
            <Group grow>
              <NumberInput label="Prix ref gasoil" min={0} value={gasoil} onChange={setGasoil} />
              <NumberInput
                label="Prix ref essence"
                min={0}
                value={essence}
                onChange={setEssence}
              />
            </Group>
          </div>
          <div>
            <Group justify="space-between" mb="sm">
              <Text fw={700}>3. Paliers de rétrocession</Text>
              <Button
                size="xs"
                variant="default"
                onClick={() =>
                  setTiers((prev) => [...prev, { fromLiters: 0, toLiters: null, ratePct: 0 }])
                }
              >
                Ajouter un palier
              </Button>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>De (L)</Table.Th>
                  <Table.Th>À (L)</Table.Th>
                  <Table.Th>Taux %</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tiers.map((t, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        allowDecimal={false}
                        value={t.fromLiters}
                        onChange={(v) => updateTier(i, { fromLiters: Number(v) || 0 })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        allowDecimal={false}
                        placeholder="∞"
                        value={t.toLiters ?? ''}
                        onChange={(v) =>
                          updateTier(i, {
                            toLiters: v === '' || v == null ? null : Number(v),
                          })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        decimalScale={2}
                        value={t.ratePct}
                        onChange={(v) => updateTier(i, { ratePct: Number(v) || 0 })}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={resetDraft}>
              Réinitialiser le brouillon
            </Button>
            <Button
              loading={save.isPending}
              onClick={() => setConfirmOpen(true)}
              disabled={query.isLoading}
            >
              Publier la nouvelle version
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Historique des versions (cashback_liter)
        </Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Version</Table.Th>
              <Table.Th>Début validité</Table.Th>
              <Table.Th>Fin validité</Table.Th>
              <Table.Th>Statut</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(versionsQuery.data?.items ?? []).map((row) => (
              <Table.Tr key={row._id}>
                <Table.Td>v{row.version}</Table.Td>
                <Table.Td>{new Date(row.validFrom).toLocaleString('fr-FR')}</Table.Td>
                <Table.Td>
                  {row.validTo ? new Date(row.validTo).toLocaleString('fr-FR') : '—'}
                </Table.Td>
                <Table.Td>
                  <Badge color={row.validTo ? 'gray' : 'green'} variant="light">
                    {row.validTo ? 'Archivée' : 'Active'}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
            {(versionsQuery.data?.items ?? []).length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" size="sm">
                    Aucune version listée (seed v1 au premier démarrage moteur).
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Publier cashback & paliers"
        centered
      >
        <Stack>
          <Text size="sm">
            Bonus {bonus} F/L · seuil {minPayout} XOF · {tiers.length} palier(s). validFrom =
            maintenant.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Confirmer la publication
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function ReferralTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobility-config'], queryFn: getMobilityConfig });
  const [reward, setReward] = useState<number | string>(250);
  const [cap, setCap] = useState<number | string>(4000);

  useEffect(() => {
    const r = query.data?.config?.referral;
    if (!r) return;
    setReward(r.reward);
    setCap(r.cap);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => putReferralConfig({ reward: Number(reward), cap: Number(cap) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobility-config'] });
      toastOk('Parrainage enregistré');
    },
    onError: toastErr,
  });

  const refV = query.data?.ruleVersions?.referral?.version;

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" title="Parrainage">
        Récompense versée au parrain. Publication versionnée — passé figé.
      </Alert>
      {refV != null ? (
        <Badge variant="light" color="blue" w="fit-content">
          referral v{refV}
        </Badge>
      ) : null}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Récompense
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(reward).toLocaleString('fr-FR')} XOF
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Plafond
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(cap).toLocaleString('fr-FR')} XOF
          </Text>
        </Card>
      </SimpleGrid>
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Paramètres
        </Title>
        <Stack>
          <Group grow>
            <NumberInput
              label="Récompense (XOF)"
              min={0}
              allowDecimal={false}
              value={reward}
              onChange={setReward}
            />
            <NumberInput
              label="Plafond (XOF)"
              min={0}
              allowDecimal={false}
              value={cap}
              onChange={setCap}
            />
          </Group>
          <Group justify="flex-end">
            <Button
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={query.isLoading}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

function WelcomeTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobility-config'], queryFn: getMobilityConfig });
  const [amount, setAmount] = useState<number | string>(1500);
  const [cap, setCap] = useState<number | string>(4000);

  useEffect(() => {
    const w = query.data?.config?.welcome;
    if (!w) return;
    setAmount(w.amount);
    setCap(w.cap);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => putWelcomeConfig({ amount: Number(amount), cap: Number(cap) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobility-config'] });
      toastOk('Bienvenue enregistré');
    },
    onError: toastErr,
  });

  const welV = query.data?.ruleVersions?.welcome?.version;

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" title="Bienvenue">
        Bonus premier plein. Plafond = N premiers chauffeurs. Publication versionnée.
      </Alert>
      {welV != null ? (
        <Badge variant="light" color="blue" w="fit-content">
          welcome v{welV}
        </Badge>
      ) : null}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Montant
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(amount).toLocaleString('fr-FR')} XOF
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Plafond N premiers
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(cap).toLocaleString('fr-FR')}
          </Text>
        </Card>
      </SimpleGrid>
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Paramètres
        </Title>
        <Stack>
          <Group grow>
            <NumberInput
              label="Montant (XOF)"
              min={0}
              allowDecimal={false}
              value={amount}
              onChange={setAmount}
            />
            <NumberInput
              label="Plafond N premiers"
              min={0}
              allowDecimal={false}
              value={cap}
              onChange={setCap}
            />
          </Group>
          <Group justify="flex-end">
            <Button
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={query.isLoading}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

function AgentTab() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['mobility-config'], queryFn: getMobilityConfig });
  const [dailyBase, setDailyBase] = useState<number | string>(2000);
  const [dailyQuota, setDailyQuota] = useState<number | string>(5);
  const [extra, setExtra] = useState<number | string>(300);

  useEffect(() => {
    const a = query.data?.config?.agent;
    if (!a) return;
    setDailyBase(a.dailyBase);
    setDailyQuota(a.dailyQuota);
    setExtra(a.extraPerDriver);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      putAgentConfig({
        dailyBase: Number(dailyBase),
        dailyQuota: Number(dailyQuota),
        extraPerDriver: Number(extra),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['mobility-config'] });
      toastOk('Barème agents enregistré');
    },
    onError: toastErr,
  });

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" title="Barème agents">
        Config hors livre ledger. Base journalière + prime par effectif au-delà du quota.
      </Alert>
      <Badge variant="light" color="gray" w="fit-content">
        hors ledger
      </Badge>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Effectifs min / jour
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(dailyQuota).toLocaleString('fr-FR')}
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Base du jour
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(dailyBase).toLocaleString('fr-FR')} XOF
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Par effectif au-delà
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {Number(extra).toLocaleString('fr-FR')} XOF
          </Text>
        </Card>
      </SimpleGrid>
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Paramètres
        </Title>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <NumberInput
              label="Effectifs minimum / jour"
              min={0}
              allowDecimal={false}
              value={dailyQuota}
              onChange={setDailyQuota}
            />
            <NumberInput
              label="Base du jour (XOF)"
              min={0}
              allowDecimal={false}
              value={dailyBase}
              onChange={setDailyBase}
            />
            <NumberInput
              label="Par effectif au-delà (XOF)"
              min={0}
              allowDecimal={false}
              value={extra}
              onChange={setExtra}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              loading={save.isPending}
              onClick={() => save.mutate()}
              disabled={query.isLoading}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

function JournalTab() {
  const query = useQuery({
    queryKey: ['tier-transitions'],
    queryFn: () => listTierTransitions({ limit: 100 }),
  });

  const fmt = (d?: string) =>
    d
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(d)
        )
      : '-';

  const total = query.data?.total ?? query.data?.items?.length ?? 0;

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" title="Journal paliers">
        Passages de palier détectés à l’achat (lecture seule). Lien vers la fiche plein.
      </Alert>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder padding="md">
          <Text size="xs" c="dimmed" fw={700}>
            Passages listés
          </Text>
          <Text fw={800} size="xl" mt={4}>
            {query.isLoading ? '…' : total.toLocaleString('fr-FR')}
          </Text>
        </Card>
      </SimpleGrid>
      <Card withBorder padding="lg">
        <Title order={4} mb="md">
          Historique
        </Title>
        {query.isError ? <Text c="red" mb="md">Impossible de charger le journal.</Text> : null}
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Quand</Table.Th>
              <Table.Th>De → À</Table.Th>
              <Table.Th>Taux</Table.Th>
              <Table.Th>Au litre</Table.Th>
              <Table.Th>Achat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(query.data?.items || []).map((row) => (
              <Table.Tr key={row._id}>
                <Table.Td>{fmt(row.occurredAt)}</Table.Td>
                <Table.Td>
                  P{row.fromTierIndex} → P{row.toTierIndex}
                </Table.Td>
                <Table.Td>
                  {row.ratePctFrom}% → {row.ratePctTo}%
                </Table.Td>
                <Table.Td>{row.crossedAtLiters.toLocaleString('fr-FR')} L</Table.Td>
                <Table.Td>
                  <Text component={Link} to={`/fuel/${row.purchaseId}`} size="sm" c="blue">
                    {String(row.purchaseId).slice(-8)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {!query.isLoading && (query.data?.items?.length ?? 0) === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" size="sm">
                    Aucun passage de palier pour l’instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

export function MobilityConfigPage() {
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Config Mobility</Title>
        <Text c="dimmed" size="sm">
          Cashback / parrainage / welcome : publication de versions (passé figé). Agents :
          config hors livre.
        </Text>
      </div>
      <Tabs defaultValue="cashback">
        <Tabs.List>
          <Tabs.Tab value="cashback">Cashback & paliers</Tabs.Tab>
          <Tabs.Tab value="referral">Parrainage</Tabs.Tab>
          <Tabs.Tab value="welcome">Bienvenue</Tabs.Tab>
          <Tabs.Tab value="agent">Agents</Tabs.Tab>
          <Tabs.Tab value="journal">Journal paliers</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="cashback" pt="md">
          <CashbackTab />
        </Tabs.Panel>
        <Tabs.Panel value="referral" pt="md">
          <ReferralTab />
        </Tabs.Panel>
        <Tabs.Panel value="welcome" pt="md">
          <WelcomeTab />
        </Tabs.Panel>
        <Tabs.Panel value="agent" pt="md">
          <AgentTab />
        </Tabs.Panel>
        <Tabs.Panel value="journal" pt="md">
          <JournalTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
