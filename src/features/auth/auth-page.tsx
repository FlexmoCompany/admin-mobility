import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
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
  IconArrowLeft,
  IconArrowRight,
  IconGasStation,
  IconKey,
  IconMail,
} from '@tabler/icons-react';

import { requestPasswordReset } from './auth-api';
import { useAuthStore } from './auth-store';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

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
      message: 'Bienvenue sur la console FlexMo Fuel Ops.',
    });
    navigate(from, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await login({ email, password, remember });

      if (result === 'authenticated') {
        completeLogin();
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Connexion refusee',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de vous connecter.',
      });
    }
  };

  const handlePasswordResetRequest = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setIsSubmittingReset(true);

    try {
      const response = await requestPasswordReset(forgotEmail);

      notifications.show({
        color: response.success ? 'green' : 'yellow',
        title: response.success ? 'Email envoye' : 'Information',
        message:
          response.message ||
          'Si ce compte existe, un email de reinitialisation a ete envoye.',
      });

      if (response.success) {
        setShowForgotPassword(false);
        setForgotEmail('');
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Demande impossible',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de demander une reinitialisation.',
      });
    } finally {
      setIsSubmittingReset(false);
    }
  };

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
              <Title order={1} className="auth-title">
                Bienvenue
              </Title>
              <Text c="dimmed" size="lg" maw={600} mt="md">
                Connectez-vous avec votre compte administrateur FlexMo pour
                acceder au suivi des cartes, des conducteurs et des achats
                carburant.
              </Text>
            </div>

          </Stack>

          <Paper
            withBorder
            shadow="sm"
            radius="md"
            p={{ base: 'lg', sm: 'xl' }}
            className="auth-card"
          >
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                    Acces securise
                  </Text>
                  <Title order={2}>
                    {showForgotPassword
                      ? 'Mot de passe oublie'
                      : 'Connexion'}
                  </Title>
                </div>
                <ThemeIcon variant="light" color="blue" radius={8}>
                  {showForgotPassword ? (
                    <IconMail size={20} />
                  ) : (
                    <IconKey size={20} />
                  )}
                </ThemeIcon>
              </Group>

              {authError && !showForgotPassword ? (
                <Alert
                  icon={<IconAlertCircle size={18} />}
                  color="red"
                  variant="light"
                >
                  {authError}
                </Alert>
              ) : null}

              {showForgotPassword ? (
                <form onSubmit={handlePasswordResetRequest}>
                  <Stack>
                    <Text c="dimmed" size="sm">
                      Saisissez votre email pour recevoir un lien et un code de
                      verification.
                    </Text>
                    <TextInput
                      label="Email admin"
                      placeholder="admin@flexmo.app"
                      type="email"
                      value={forgotEmail}
                      onChange={(event) =>
                        setForgotEmail(event.currentTarget.value)
                      }
                      required
                    />
                    <Group grow>
                      <Button
                        variant="default"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => setShowForgotPassword(false)}
                        type="button"
                      >
                        Retour
                      </Button>
                      <Button
                        type="submit"
                        loading={isSubmittingReset}
                        disabled={!forgotEmail}
                      >
                        Envoyer l&apos;email
                      </Button>
                    </Group>
                  </Stack>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Stack>
                    <TextInput
                      label="Email admin"
                      placeholder="admin@flexmo.app"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                      autoComplete="username"
                      required
                    />
                    <PasswordInput
                      label="Mot de passe"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.currentTarget.value)
                      }
                      autoComplete="current-password"
                      required
                    />
                    <Group justify="space-between" align="center">
                      <Checkbox
                        checked={remember}
                        onChange={(event) =>
                          setRemember(event.currentTarget.checked)
                        }
                        label="Garder cette session ouverte sur ce poste"
                      />
                      <Button
                        variant="subtle"
                        px={0}
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setShowForgotPassword(true);
                        }}
                      >
                        Mot de passe oublie ?
                      </Button>
                    </Group>

                    <Button
                      type="submit"
                      rightSection={<IconArrowRight size={17} />}
                      fullWidth
                      loading={isLoading}
                      disabled={!email || !password}
                    >
                      Se connecter
                    </Button>
                  </Stack>
                </form>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
