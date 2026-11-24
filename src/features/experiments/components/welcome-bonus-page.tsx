import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import {
  DEFAULT_MIN_FIRST_RECHARGE_XOF,
  getWelcomeExperiment,
  updateWelcomeExperiment,
  type Variant,
  type VariantStats,
  type WelcomeExperimentUpdate,
} from '../api';
import { MIN_DRIVERS_PER_VARIANT, conversionVerdict } from '../stats';

const QUERY_KEY = ['experiments', 'welcome-bonus'] as const;

// fr-FR sépare les milliers par une espace fine (U+202F) que la police en gras
// n'affiche pas : on la remplace par une espace insécable classique.
const num = (v: number, digits = 0) =>
  v.toLocaleString('fr-FR', { maximumFractionDigits: digits }).replace(/\u202f/g, '\u00a0');
const fcfa = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${num(Math.round(v))} F`);
const pct = (v: number) => `${num(v * 100, 1)} %`;
const hours = (v: number | null) => {
  if (v === null) return '—';
  if (v < 1) return `${Math.round(v * 60)} min`;
  if (v < 48) return `${num(v, 1)} h`;
  return `${num(v / 24, 1)} j`;
};
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';

type Row = { label: string; hint?: string; value: (s: VariantStats) => string };

const rows = (min: number): Row[] => [
  { label: 'Chauffeurs inscrits', value: (s) => num(s.drivers) },
  { label: 'Ont rechargé au moins une fois', value: (s) => num(s.converted) },
  { label: 'Taux de conversion', hint: '1re recharge Wave / inscrits', value: (s) => pct(s.conversionRate) },
  { label: '1re recharge moyenne', hint: 'hors bonus', value: (s) => fcfa(s.firstRechargeAvg) },
  { label: `1re recharge ≥ ${fcfa(min)}`, value: (s) => num(s.firstRechargeAtLeastMin) },
  { label: 'Délai médian avant la 1re recharge', value: (s) => hours(s.medianHoursToFirstRecharge) },
  { label: 'Recharges', value: (s) => num(s.rechargeCount) },
  { label: 'Recharges par chauffeur converti', value: (s) => num(s.rechargesPerConverted, 1) },
  { label: 'Total rechargé', hint: 'hors bonus', value: (s) => fcfa(s.totalRecharged) },
  { label: 'Bonus versés', value: (s) => num(s.bonusGranted) },
  { label: 'Bonus perdus', hint: '1re recharge trop petite (A)', value: (s) => num(s.bonusForfeited) },
  { label: 'Coût du bonus', value: (s) => fcfa(s.bonusCost) },
  { label: 'Coût par chauffeur converti', value: (s) => fcfa(s.costPerConverted) },
];

function VerdictAlert({ a, b }: { a: VariantStats; b: VariantStats }) {
  const v = conversionVerdict(a, b);
  if (v.kind === 'insufficient') {
    return (
      <Alert color="gray" variant="light" title="Pas encore assez de données">
        Il faut au moins {MIN_DRIVERS_PER_VARIANT} inscrits par groupe pour comparer la conversion. Il manque{' '}
        {v.missingA} chauffeur(s) en A et {v.missingB} en B. Les chiffres ci-dessous sont indicatifs.
      </Alert>
    );
  }
  const diff = `${v.diffPoints > 0 ? '+' : ''}${num(v.diffPoints, 1)} points pour A`;
  const p = v.pValue === null ? '' : ` (p = ${num(v.pValue, 3)})`;
  if (v.kind === 'no-difference') {
    return (
      <Alert color="yellow" variant="light" title="Pas de différence nette sur la conversion">
        Écart : {diff}
        {p}. Il peut venir du hasard : laissez tourner l'expérience.
      </Alert>
    );
  }
  return (
    <Alert color="green" variant="light" title={`Le groupe ${v.winner} convertit mieux`}>
      Écart : {diff}
      {p}, peu probable par hasard. Comparez aussi le coût par chauffeur converti avant de trancher.
    </Alert>
  );
}

type Pending = { title: string; body: string; update: WelcomeExperimentUpdate } | null;

export function WelcomeBonusExperimentPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: getWelcomeExperiment });
  const experiment = query.data?.experiment;
  const min = experiment?.params?.minFirstRechargeXof ?? DEFAULT_MIN_FIRST_RECHARGE_XOF;

  const [splitA, setSplitA] = useState<number | string>(50);
  const [minRecharge, setMinRecharge] = useState<number | string>(DEFAULT_MIN_FIRST_RECHARGE_XOF);
  // Le contenu reste en place pendant l'animation de fermeture du modal.
  const [pending, setPendingState] = useState<Pending>(null);
  const [confirmOpened, setConfirmOpened] = useState(false);
  const setPending = (next: Pending) => {
    if (next) setPendingState(next);
    setConfirmOpened(next !== null);
  };

  useEffect(() => {
    if (!experiment) return;
    setSplitA(experiment.splitA);
    setMinRecharge(min);
  }, [experiment, min]);

  const mutation = useMutation({
    mutationFn: updateWelcomeExperiment,
    onSuccess: () => {
      notifications.show({ message: 'Expérience mise à jour.', color: 'green' });
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => notifications.show({ message: error.message || 'Erreur', color: 'red' }),
  });

  if (query.isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (query.isError || !experiment || !query.data) {
    return (
      <Alert color="red" title="Impossible de charger l'A/B test">
        {query.error instanceof Error ? query.error.message : 'La requête a échoué.'}
      </Alert>
    );
  }

  const { A, B } = query.data.stats;
  const running = experiment.status === 'running';
  const settingsChanged = Number(splitA) !== experiment.splitA || Number(minRecharge) !== min;
  const settingsValid =
    Number.isInteger(Number(splitA)) &&
    Number(splitA) >= 0 &&
    Number(splitA) <= 100 &&
    Number.isInteger(Number(minRecharge)) &&
    Number(minRecharge) >= 100;
  const variants: Variant[] = ['A', 'B'];

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>A/B test : bonus de bienvenue</Title>
          <Text c="dimmed" size="sm">
            Même bonus pour tous, versé à deux moments différents. On compare qui recharge le plus, et à quel coût.
          </Text>
        </div>
        <Badge size="lg" color={running ? 'green' : 'gray'} variant="light">
          {running ? 'En cours' : 'Arrêtée'}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder padding="md">
          <Group gap="xs" mb={6}>
            <Badge color="blue">A</Badge>
            <Text fw={700}>Bonus à la 1re recharge</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Rien à l'inscription. Le bonus est versé sur le solde à la 1re recharge, si elle atteint {fcfa(min)} ;
            sinon il est perdu. Le chauffeur voit l'offre sur l'accueil.
          </Text>
        </Card>
        <Card withBorder padding="md">
          <Group gap="xs" mb={6}>
            <Badge color="grape">B</Badge>
            <Text fw={700}>Bonus dans la jauge (actuel)</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Le bonus est placé dans la jauge Objectif dès l'inscription, comme avant l'expérience.
          </Text>
        </Card>
      </SimpleGrid>

      <Group gap="lg">
        <Text size="sm">
          <Text span c="dimmed">
            Démarrée le{' '}
          </Text>
          {formatDate(experiment.startedAt)}
        </Text>
        {!running ? (
          <Text size="sm">
            <Text span c="dimmed">
              Arrêtée le{' '}
            </Text>
            {formatDate(experiment.stoppedAt)}
          </Text>
        ) : null}
        <Text size="sm">
          <Text span c="dimmed">
            Répartition{' '}
          </Text>
          {experiment.splitA} % A / {100 - experiment.splitA} % B
        </Text>
      </Group>

      <VerdictAlert a={A} b={B} />

      <Card withBorder padding={0}>
        <Table striped verticalSpacing="sm" horizontalSpacing="md" data-testid="ab-results">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Indicateur</Table.Th>
              {variants.map((v) => (
                <Table.Th key={v} ta="right">
                  Groupe {v}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows(min).map((row) => (
              <Table.Tr key={row.label}>
                <Table.Td>
                  <Text size="sm">{row.label}</Text>
                  {row.hint ? (
                    <Text size="xs" c="dimmed">
                      {row.hint}
                    </Text>
                  ) : null}
                </Table.Td>
                {variants.map((v) => (
                  <Table.Td key={v} ta="right" fw={600}>
                    {row.value(query.data.stats[v])}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Text size="xs" c="dimmed">
        Seuls les chauffeurs inscrits depuis le démarrage sont comptés (les plus anciens restent au comportement B). Le
        coût du groupe B est estimé : inscrits × montant actuel du bonus de bienvenue. Celui du groupe A est le montant
        réellement versé.
      </Text>

      <Card withBorder padding="md">
        <Title order={4} mb="sm">
          Réglages
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label="Part des nouveaux inscrits en A (%)"
            description="Les chauffeurs déjà répartis gardent leur groupe."
            min={0}
            max={100}
            allowDecimal={false}
            value={splitA}
            onChange={setSplitA}
          />
          <NumberInput
            label="1re recharge minimale en A (F)"
            description="En dessous, le bonus du groupe A est perdu."
            min={100}
            step={500}
            allowDecimal={false}
            thousandSeparator=" "
            value={minRecharge}
            onChange={setMinRecharge}
          />
        </SimpleGrid>
        <Group mt="md" justify="space-between">
          <Button
            disabled={!settingsChanged || !settingsValid}
            onClick={() =>
              setPending({
                title: 'Enregistrer les réglages',
                body: `Les prochains inscrits iront à ${Number(splitA)} % en A ; 1re recharge minimale en A : ${fcfa(
                  Number(minRecharge)
                )}.`,
                update: { splitA: Number(splitA), minFirstRechargeXof: Number(minRecharge) },
              })
            }
          >
            Enregistrer
          </Button>
          <Button
            variant="light"
            color={running ? 'red' : 'green'}
            onClick={() =>
              setPending(
                running
                  ? {
                      title: "Arrêter l'expérience",
                      body: "Les nouveaux inscrits suivront le comportement B (bonus dans la jauge). Les chauffeurs déjà en A gardent leur offre.",
                      update: { status: 'stopped' },
                    }
                  : {
                      title: "Relancer l'expérience",
                      body: `Les nouveaux inscrits seront de nouveau répartis (${experiment.splitA} % en A).`,
                      update: { status: 'running' },
                    }
              )
            }
          >
            {running ? "Arrêter l'expérience" : "Relancer l'expérience"}
          </Button>
        </Group>
      </Card>

      <Modal opened={confirmOpened} onClose={() => setPending(null)} title={pending?.title} centered>
        <Stack>
          <Text size="sm">{pending?.body}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPending(null)}>
              Annuler
            </Button>
            <Button loading={mutation.isPending} onClick={() => pending && mutation.mutate(pending.update)}>
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
