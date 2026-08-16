import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconKey } from '@tabler/icons-react';

import { checkAdminSession } from '@/features/auth/auth-api';
import { useAuthStore } from '@/features/auth/auth-store';

import { updateAdmin, updateAdminPassword } from '../api/admins-api';

export function MyAccountPage() {
  const admin = useAuthStore((state) => state.admin);
  const token = useAuthStore((state) => state.token);
  const updateSessionAdmin = useAuthStore((state) => state.updateSessionAdmin);
  const [fullname, setFullname] = useState(admin?.fullname ?? '');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [phoneNumber, setPhoneNumber] = useState(admin?.phoneNumber ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileQuery = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      const response = await checkAdminSession(token);
      if (!response.success || !response.admin) {
        throw new Error(response.message || 'Chargement du profil admin impossible.');
      }

      return response;
    },
    enabled: Boolean(token),
  });

  useEffect(() => {
    const currentAdmin = profileQuery.data?.admin ?? admin;
    if (!currentAdmin) return;

    setFullname(currentAdmin.fullname ?? '');
    setEmail(currentAdmin.email ?? '');
    setPhoneNumber(currentAdmin.phoneNumber ?? '');
  }, [admin, profileQuery.data?.admin]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const response = await updateAdmin(admin?._id ?? '', {
        fullname: fullname.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (!response.success || !response.admin) {
        throw new Error(response.message || 'Mise a jour du profil impossible.');
      }

      return response.admin;
    },
    onSuccess: (updatedAdmin) => {
      updateSessionAdmin(updatedAdmin);
      notifications.show({
        color: 'green',
        title: 'Profil mis a jour',
        message: 'Vos informations personnelles ont ete enregistrees.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Echec de mise a jour',
        message: error instanceof Error ? error.message : 'Le profil n a pas pu etre mis a jour.',
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const response = await updateAdminPassword(admin?._id ?? '', {
        currentPassword,
        newPassword,
      });

      if (!response.success) {
        throw new Error(response.message || 'Changement de mot de passe impossible.');
      }

      return response;
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notifications.show({
        color: 'green',
        title: 'Mot de passe mis a jour',
        message: 'Votre mot de passe a bien ete change.',
      });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Echec de mise a jour',
        message:
          error instanceof Error
            ? error.message
            : 'Le mot de passe n a pas pu etre modifie.',
      });
    },
  });

  const currentAdmin = profileQuery.data?.admin ?? admin;
  const passwordMismatch =
    Boolean(newPassword || confirmPassword) && newPassword !== confirmPassword;

  return (
    <Stack gap="lg">
      <div>
        <Text size="xs" fw={800} tt="uppercase" c="dimmed">
          Session admin
        </Text>
        <Title order={2}>Mon compte</Title>
        <Text c="dimmed" mt="sm">
          Modifiez vos informations personnelles et gerez votre securite sans toucher au role ni au statut du compte.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Role
          </Text>
          <Text fw={700} mt={4}>
            {currentAdmin?.role ?? 'admin'}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Statut
          </Text>
          <Badge mt={8} color={currentAdmin?.status === 'active' ? 'green' : 'gray'}>
            {currentAdmin?.status ?? 'inconnu'}
          </Badge>
        </Card>
        <Card withBorder radius="md" padding="lg">
          <Text size="xs" c="dimmed" fw={700}>
            Verification
          </Text>
          <Badge mt={8} color={currentAdmin?.verified ? 'green' : 'yellow'}>
            {currentAdmin?.verified ? 'Verifie' : 'En attente'}
          </Badge>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
        <Card withBorder radius="md" padding="lg">
          <Stack>
            <div>
              <Title order={4}>Informations personnelles</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Champs modifiables pour votre propre compte admin.
              </Text>
            </div>
            <TextInput
              label="Nom complet"
              value={fullname}
              onChange={(event) => setFullname(event.currentTarget.value)}
            />
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <TextInput
              label="Telephone"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={() => profileMutation.mutate()}
                loading={profileMutation.isPending || profileQuery.isLoading}
                disabled={!admin?._id || !fullname.trim() || !email.trim() || !phoneNumber.trim()}
              >
                Enregistrer les informations
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack>
            <div>
              <Title order={4}>Changer le mot de passe</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Cette action reste separee du flux “mot de passe oublie”.
              </Text>
            </div>
            {passwordMismatch ? (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                La confirmation doit correspondre au nouveau mot de passe.
              </Alert>
            ) : null}
            <PasswordInput
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
            />
            <PasswordInput
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
            />
            <PasswordInput
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button
                leftSection={<IconKey size={16} />}
                onClick={() => passwordMutation.mutate()}
                loading={passwordMutation.isPending}
                disabled={
                  !admin?._id ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  passwordMismatch
                }
              >
                Changer le mot de passe
              </Button>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
