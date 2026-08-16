import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';

import type {
  AdminRecord,
  AdminRole,
  AdminStatus,
  CreateAdminPayload,
  UpdateAdminPayload,
} from '@/features/admins/api/admins-api';

interface AdminFormModalProps {
  opened: boolean;
  mode: 'create' | 'edit';
  admin: AdminRecord | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminPayload | UpdateAdminPayload) => Promise<void>;
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'developer', label: 'Developer' },
];

const statusOptions = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'suspended', label: 'Suspendu' },
];

export function AdminFormModal({
  opened,
  mode,
  admin,
  isSubmitting,
  onClose,
  onSubmit,
}: AdminFormModalProps) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [status, setStatus] = useState<AdminStatus>('inactive');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && admin) {
      setFullname(admin.fullname);
      setEmail(admin.email);
      setPhoneNumber(admin.phoneNumber);
      setPassword('');
      setRole(admin.role);
      setStatus(admin.status);
      setVerified(admin.verified);
      return;
    }

    setFullname('');
    setEmail('');
    setPhoneNumber('');
    setPassword('');
    setRole('admin');
    setStatus('inactive');
    setVerified(false);
  }, [admin, mode, opened]);

  const handleSubmit = async () => {
    if (mode === 'create') {
      await onSubmit({
        fullname,
        email,
        phoneNumber,
        password,
        role,
      });
      return;
    }

    await onSubmit({
      fullname,
      email,
      phoneNumber,
      role,
      status,
      verified,
    });
  };

  const isDisabled =
    !fullname.trim() || !email.trim() || !phoneNumber.trim() || (mode === 'create' && !password);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Creer un admin' : 'Modifier un admin'}
      centered
    >
      <Stack>
        <TextInput
          label="Nom complet"
          value={fullname}
          onChange={(event) => setFullname(event.currentTarget.value)}
          required
        />
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
        />
        <TextInput
          label="Telephone"
          placeholder="+2250700000000"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.currentTarget.value)}
          required
        />
        {mode === 'create' ? (
          <PasswordInput
            label="Mot de passe provisoire"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
        ) : null}
        <Select
          label="Role"
          data={roleOptions}
          value={role}
          onChange={(value) => setRole((value as AdminRole) || 'admin')}
          allowDeselect={false}
        />
        {mode === 'edit' ? (
          <>
            <Select
              label="Statut"
              data={statusOptions}
              value={status}
              onChange={(value) => setStatus((value as AdminStatus) || 'inactive')}
              allowDeselect={false}
            />
            <Checkbox
              label="Compte verifie"
              checked={verified}
              onChange={(event) => setVerified(event.currentTarget.checked)}
            />
          </>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={isDisabled}>
            {mode === 'create' ? 'Creer' : 'Enregistrer'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
