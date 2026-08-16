import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';

import type {
  CreateDriverPayload,
  DriverRecord,
  DriverStatus,
  DriverVehicleType,
  UpdateDriverPayload,
} from '@/features/drivers/types';
import type { PartnerCompany } from '@/features/partners/types';

interface DriverFormModalProps {
  opened: boolean;
  mode: 'create' | 'edit';
  driver: DriverRecord | null;
  partners: PartnerCompany[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDriverPayload | UpdateDriverPayload) => Promise<void>;
}

const statusOptions = [
  {value: 'active', label: 'Actif'},
  {value: 'inactive', label: 'Inactif'},
  {value: 'suspended', label: 'Suspendu'},
];

const genderOptions = [
  {value: 'male', label: 'Homme'},
  {value: 'female', label: 'Femme'},
];

const vehicleTypeOptions = [
  {value: 'personal', label: 'Personnel'},
  {value: 'two_wheels', label: 'Deux roues'},
  {value: 'three_wheels', label: 'Trois roues'},
  {value: 'cargo', label: 'Cargo'},
  {value: 'heavy_truck', label: 'Poids lourd'},
];

export function DriverFormModal({
  opened,
  mode,
  driver,
  partners,
  isSubmitting,
  onClose,
  onSubmit,
}: DriverFormModalProps) {
  const [companyRef, setCompanyRef] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reference, setReference] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [status, setStatus] = useState<DriverStatus>('inactive');
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>('personal');

  const partnerOptions = useMemo(
    () =>
      partners.map((partner) => ({
        value: partner.reference,
        label: partner.companyInfos?.name || partner.reference,
      })),
    [partners]
  );

  useEffect(() => {
    if (mode === 'edit' && driver) {
      setCompanyRef(driver.company?.reference ?? '');
      setFirstName(driver.firstName ?? '');
      setLastName(driver.lastName ?? '');
      setPhoneNumber(driver.phoneNumber ?? '');
      setEmail(driver.email ?? '');
      setPassword('');
      setReference(driver.reference ?? '');
      setGender(driver.gender ?? '');
      setStatus(driver.status ?? 'inactive');
      setVehicleType(driver.vehicleType ?? 'personal');
      return;
    }

    setCompanyRef(partners[0]?.reference ?? '');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setReference('');
    setGender('');
    setStatus('inactive');
    setVehicleType('personal');
  }, [driver, mode, opened, partners]);

  const isDisabled =
    !companyRef ||
    !firstName.trim() ||
    !lastName.trim() ||
    !phoneNumber.trim() ||
    (mode === 'create' && password.trim().length !== 4);

  const handleSubmit = async () => {
    if (mode === 'create') {
      await onSubmit({
        companyRef,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
        reference: reference.trim() || undefined,
        gender: gender || undefined,
        status,
        vehicleType,
      });
      return;
    }

    await onSubmit({
      companyRef,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      reference: reference.trim() || undefined,
      gender: gender || undefined,
      status,
      vehicleType,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Creer un conducteur' : 'Modifier le conducteur'}
      centered
    >
      <Stack>
        <Select
          label="Partenaire"
          data={partnerOptions}
          value={companyRef}
          onChange={(value) => setCompanyRef(value ?? '')}
          searchable
          allowDeselect={false}
          required
        />
        <Group grow>
          <TextInput
            label="Prenom"
            value={firstName}
            onChange={(event) => setFirstName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Nom"
            value={lastName}
            onChange={(event) => setLastName(event.currentTarget.value)}
            required
          />
        </Group>
        <Group grow>
          <TextInput
            label="Telephone"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.currentTarget.value)}
            placeholder="+2250700000000"
            required
          />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Reference"
            value={reference}
            onChange={(event) => setReference(event.currentTarget.value)}
            placeholder="Generee si vide"
          />
          <Select
            label="Genre"
            data={genderOptions}
            value={gender}
            onChange={(value) => setGender((value as 'male' | 'female' | null) ?? '')}
          />
        </Group>
        <Group grow>
          <Select
            label="Statut"
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus((value as DriverStatus | null) ?? 'inactive')}
            allowDeselect={false}
          />
          <Select
            label="Type de vehicule"
            data={vehicleTypeOptions}
            value={vehicleType}
            onChange={(value) =>
              setVehicleType((value as DriverVehicleType | null) ?? 'personal')
            }
            allowDeselect={false}
          />
        </Group>
        {mode === 'create' ? (
          <PasswordInput
            label="Code PIN provisoire (4 chiffres)"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
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
