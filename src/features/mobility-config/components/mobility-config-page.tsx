import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import {
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

  const rv = query.data?.ruleVersions;
  const literV = rv?.cashback_liter?.version;
  const tierV = rv?.cashback_tier?.version;
  const thrV = rv?.bonus_threshold?.version;

  return (
    <Card withBorder maw={720}>
      <Stack>
        <Text size="sm" c="dimmed">
          Publier crée des versions N+1. Les pleins passés restent collés à N.
        </Text>
        <Group gap="xs">
          <Badge variant="light">cashback_liter v{literV ?? '-'}</Badge>
          <Badge variant="light">cashback_tier v{tierV ?? '-'}</Badge>
          <Badge variant="light">bonus_threshold v{thrV ?? '-'}</Badge>
        </Group>
        <Group grow>
          <NumberInput label="Bonus chauffeur (F/L)" min={0} value={bonus} onChange={setBonus} />
          <NumberInput
            label="Seuil reversement (XOF)"
            min={0}
            allowDecimal={false}
            value={minPayout}
            onChange={setMinPayout}
          />
        </Group>
        <Group grow>
          <NumberInput label="Prix ref gasoil" min={0} value={gasoil} onChange={setGasoil} />
          <NumberInput label="Prix ref essence" min={0} value={essence} onChange={setEssence} />
        </Group>
        <Title order={5}>Paliers</Title>
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
        <Group>
          <Button
            variant="default"
            onClick={() =>
              setTiers((prev) => [...prev, { fromLiters: 0, toLiters: null, ratePct: 0 }])
            }
          >
            Ajouter un palier
          </Button>
          <Button
            loading={save.isPending}
            onClick={() => setConfirmOpen(true)}
            disabled={query.isLoading}
          >
            Publier
          </Button>
        </Group>
        <Title order={5}>Historique cashback_liter</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Version</Table.Th>
              <Table.Th>Valide de</Table.Th>
              <Table.Th>Valide à</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(versionsQuery.data?.items ?? []).map((row) => (
              <Table.Tr key={row._id}>
                <Table.Td>v{row.version}</Table.Td>
                <Table.Td>{new Date(row.validFrom).toLocaleString('fr-FR')}</Table.Td>
                <Table.Td>
                  {row.validTo ? new Date(row.validTo).toLocaleString('fr-FR') : 'ouverte'}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Publier cashback & paliers"
        centered
      >
        <Stack>
          <Text size="sm">
            Bonus {bonus} F/L · seuil {minPayout} XOF · {tiers.length} palier(s). validFrom = maintenant.
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
    </Card>
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

  return (
    <Card withBorder maw={420}>
      <Stack>
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
        <Button loading={save.isPending} onClick={() => save.mutate()} disabled={query.isLoading}>
          Enregistrer
        </Button>
      </Stack>
    </Card>
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

  return (
    <Card withBorder maw={420}>
      <Stack>
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
        <Button loading={save.isPending} onClick={() => save.mutate()} disabled={query.isLoading}>
          Enregistrer
        </Button>
      </Stack>
    </Card>
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
    <Card withBorder maw={480}>
      <Stack>
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
        <Button loading={save.isPending} onClick={() => save.mutate()} disabled={query.isLoading}>
          Enregistrer
        </Button>
      </Stack>
    </Card>
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

  return (
    <Card withBorder>
      <Stack>
        <Text size="sm" c="dimmed">
          Passages de palier (lecture seule).
        </Text>
        {query.isError ? <Text c="red">Impossible de charger le journal.</Text> : null}
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
      </Stack>
    </Card>
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
