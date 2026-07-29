import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  PinInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowRight,
  IconDeviceDesktop,
  IconGasStation,
  IconKey,
  IconShieldCheck,
} from '@tabler/icons-react';

import { runtimeConfig } from '@/shared/api/config';

import { useAuthStore } from './auth-store';

const authFacts = [
  { label: 'Contrat backend', value: 'company-member/auth' },
  { label: 'Session', value: 'JWT 24h web' },
  { label: 'Acces produit', value: runtimeConfig.product },
];

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const verifyMfa = useAuthStore((state) => state.verifyMfa);
  const verifyDeviceOtp = useAuthStore((state) => state.verifyDeviceOtp);
  const pendingChallenge = useAuthStore((state) => state.pendingChallenge);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [challengeCode, setChallengeCode] = useState('');

  const from = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname || '/cockpit';
  }, [location.state]);

  if (isAuthenticated) {
    return <Navigate to="/cockpit" replace />;
  }

  const completeLogin = () => {
    notifications.show({
      color: 'green',
      title: 'Session ouverte',
      message: 'Authentification membre validee par tiers-service.',
    });
    navigate(from, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (pendingChallenge?.type === 'mfa') {
        await verifyMfa(challengeCode);
        completeLogin();
        return;
      }

      if (pendingChallenge?.type === 'device-otp') {
        await verifyDeviceOtp(challengeCode);
        completeLogin();
        return;
      }

      const result = await login({ identifier, password, remember });

      if (result === 'authenticated') {
        completeLogin();
        return;
      }

      notifications.show({
        color: 'blue',
        title: result === 'mfa' ? 'MFA requis' : 'Verification appareil requise',
        message:
          result === 'mfa'
            ? 'Saisissez le code de votre application MFA.'
            : 'Saisissez le code OTP envoye pour valider cet appareil.',
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Connexion refusee',
        message: error instanceof Error ? error.message : 'Impossible de vous connecter.',
      });
    }
  };

  const challengeTitle =
    pendingChallenge?.type === 'mfa' ? 'Verification MFA' : 'Verification appareil';
  const challengeDescription =
    pendingChallenge?.type === 'mfa'
      ? 'Le compte a une authentification multifacteur activee.'
      : `Nouvel appareil detecte${pendingChallenge?.email ? ` pour ${pendingChallenge.email}` : ''}.`;

  return (
    <Box className="auth-shell">
      <Container size="lg" py={{ base: 'xl', md: 56 }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" verticalSpacing="xl">
          <Stack justify="center" gap="lg">
            <Group>
              <ThemeIcon size={44} radius={8} color="yellow">
                <IconGasStation size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                  FlexMo Fuel Ops
                </Text>
                <Title order={2}>Console admin carburant</Title>
              </div>
            </Group>

            <div>
              <Badge variant="light" color="blue" mb="sm">
                Auth tiers-service
              </Badge>
              <Title order={1} className="auth-title">
                Connexion backoffice
              </Title>
              <Text c="dimmed" size="lg" maw={600} mt="md">
                Utilisez le compte membre admin/owner de la compagnie. Le backend valide le mot de passe,
                le produit autorise, le token JWT, les permissions et les controles MFA si actifs.
              </Text>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              {authFacts.map((item) => (
                <Card key={item.label} withBorder radius="md" padding="md">
                  <Text size="xs" c="dimmed" fw={700}>
                    {item.label}
                  </Text>
                  <Text size="sm" fw={760} mt={4}>
                    {item.value}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>

          <Paper withBorder shadow="sm" radius="md" p={{ base: 'lg', sm: 'xl' }} className="auth-card">
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                    Acces securise
                  </Text>
                  <Title order={2}>{pendingChallenge ? challengeTitle : 'Connexion'}</Title>
                </div>
                <ThemeIcon variant="light" color="blue" radius={8}>
                  {pendingChallenge ? <IconShieldCheck size={20} /> : <IconKey size={20} />}
                </ThemeIcon>
              </Group>

              {pendingChallenge ? (
                <Alert icon={<IconDeviceDesktop size={18} />} color="blue" variant="light">
                  {challengeDescription}
                </Alert>
              ) : null}

              {authError ? (
                <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
                  {authError}
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit}>
                <Stack>
                  {pendingChallenge ? (
                    <Box>
                      <Text size="sm" fw={500} mb={6}>
                        Code de verification
                      </Text>
                      <PinInput length={6} value={challengeCode} onChange={setChallengeCode} inputMode="numeric" />
                    </Box>
                  ) : (
                    <>
                      <TextInput
                        label="Telephone ou email"
                        placeholder="+2250700000000 ou admin@company.com"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.currentTarget.value)}
                        autoComplete="username"
                        required
                      />
                      <PasswordInput
                        label="Mot de passe"
                        value={password}
                        onChange={(event) => setPassword(event.currentTarget.value)}
                        autoComplete="current-password"
                        required
                      />
                      <Checkbox
                        checked={remember}
                        onChange={(event) => setRemember(event.currentTarget.checked)}
                        label="Garder cette session ouverte sur ce poste"
                      />
                    </>
                  )}

                  <Button
                    type="submit"
                    rightSection={<IconArrowRight size={17} />}
                    fullWidth
                    loading={isLoading}
                    disabled={pendingChallenge ? challengeCode.length < 4 : !identifier || !password}
                  >
                    {pendingChallenge ? 'Valider le code' : 'Se connecter'}
                  </Button>
                </Stack>
              </form>

            </Stack>
          </Paper>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
