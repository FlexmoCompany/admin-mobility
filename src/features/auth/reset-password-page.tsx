import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconArrowLeft, IconCheck } from '@tabler/icons-react';

import { resetAdminPassword, validateResetOtp } from './auth-api';
import { useAuthStore } from './auth-store';

const extractAdminIdFromToken = (token: string) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return '';
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const parsed = JSON.parse(decoded) as { res?: { id?: string } };

    return parsed.res?.id || '';
  } catch {
    return '';
  }
};

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminId = useMemo(() => extractAdminIdFromToken(token), [token]);
  const hasValidRouteParams = Boolean(token && adminId);

  if (isAuthenticated) {
    return <Navigate to="/cockpit" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidRouteParams) {
      notifications.show({
        color: 'red',
        title: 'Lien invalide',
        message: 'Le lien de reinitialisation est incomplet ou invalide.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notifications.show({
        color: 'red',
        title: 'Verification impossible',
        message: 'Les deux mots de passe doivent etre identiques.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await validateResetOtp(token, otp);
      await resetAdminPassword(adminId, newPassword);

      notifications.show({
        color: 'green',
        title: 'Mot de passe mis a jour',
        message: 'Vous pouvez maintenant vous reconnecter avec votre nouveau mot de passe.',
      });

      navigate('/auth/login', { replace: true });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Reinitialisation impossible',
        message:
          error instanceof Error
            ? error.message
            : 'Le code OTP ou le lien de reinitialisation est invalide.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="auth-shell">
      <Container size="sm" py={{ base: 'xl', md: 72 }}>
        <Paper withBorder shadow="sm" radius="md" p={{ base: 'lg', sm: 'xl' }}>
          <Stack gap="lg">
            <div>
              <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                FlexMo Fuel Ops
              </Text>
              <Title order={2}>Reinitialisation du mot de passe</Title>
              <Text c="dimmed" size="sm" mt="sm">
                Saisissez le code OTP recu par email puis definissez votre nouveau mot de passe admin.
              </Text>
            </div>

            {!hasValidRouteParams ? (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
              >
                Le lien de reinitialisation est invalide ou incomplet.
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit}>
              <Stack>
                <TextInput
                  label="Code OTP"
                  placeholder="1234"
                  value={otp}
                  onChange={(event) => setOtp(event.currentTarget.value)}
                  required
                />
                <PasswordInput
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.currentTarget.value)}
                  required
                />
                <PasswordInput
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.currentTarget.value)
                  }
                  required
                />

                <Group grow>
                  <Button
                    component={Link}
                    to="/auth/login"
                    variant="default"
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    Retour connexion
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={
                      !hasValidRouteParams ||
                      !otp ||
                      !newPassword ||
                      !confirmPassword
                    }
                    rightSection={<IconCheck size={16} />}
                  >
                    Enregistrer
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
