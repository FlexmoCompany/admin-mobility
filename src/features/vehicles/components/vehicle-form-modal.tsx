import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';

import type { PartnerCompany } from '@/features/partners/types';

import type {
  CreateVehiclePayload,
  UpdateVehiclePayload,
  VehicleFuelType,
  VehicleRecord,
  VehicleStatus,
} from '../types';

interface VehicleFormModalProps {
  opened: boolean;
  mode: 'create' | 'edit';
  vehicle: VehicleRecord | null;
  partners: PartnerCompany[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateVehiclePayload | UpdateVehiclePayload) => Promise<void>;
}

const statusOptions = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Assigne' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Hors service' },
];

const fuelTypeOptions = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline', label: 'Essence' },
  { value: 'electric', label: 'Electrique' },
  { value: 'hybrid', label: 'Hybride' },
];

export function VehicleFormModal({
  opened,
  mode,
  vehicle,
  partners,
  isSubmitting,
  onClose,
  onSubmit,
}: VehicleFormModalProps) {
  const [companyRef, setCompanyRef] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [fuelType, setFuelType] = useState<VehicleFuelType>('diesel');
  const [status, setStatus] = useState<VehicleStatus>('available');
  const [mileage, setMileage] = useState<number | ''>('');

  const partnerOptions = useMemo(
    () =>
      partners.map((partner) => ({
        value: partner.reference,
        label: partner.companyInfos?.name || partner.reference,
      })),
    [partners]
  );

  useEffect(() => {
    if (mode === 'edit' && vehicle) {
      setCompanyRef(vehicle.company?.reference ?? '');
      setMake(vehicle.make ?? '');
      setModel(vehicle.model ?? '');
      setYear(vehicle.year ?? '');
      setLicensePlate(vehicle.licensePlate ?? '');
      setVin(vehicle.vin ?? '');
      setFuelType((vehicle.fuelType as VehicleFuelType) ?? 'diesel');
      setStatus(vehicle.status ?? 'available');
      setMileage(vehicle.mileage ?? '');
      return;
    }

    setCompanyRef(partners[0]?.reference ?? '');
    setMake('');
    setModel('');
    setYear('');
    setLicensePlate('');
    setVin('');
    setFuelType('diesel');
    setStatus('available');
    setMileage('');
  }, [mode, opened, partners, vehicle]);

  const isDisabled =
    !companyRef ||
    !make.trim() ||
    !model.trim() ||
    !licensePlate.trim() ||
    !vin.trim() ||
    !year;

  const handleSubmit = async () => {
    const basePayload = {
      companyRef,
      make: make.trim(),
      model: model.trim(),
      year: typeof year === 'number' ? year : Number(year),
      licensePlate: licensePlate.trim().toUpperCase(),
      vin: vin.trim().toUpperCase(),
      fuelType,
      mileage: typeof mileage === 'number' ? mileage : mileage ? Number(mileage) : undefined,
      status,
    };

    if (mode === 'create') {
      await onSubmit(basePayload as CreateVehiclePayload);
      return;
    }

    await onSubmit(basePayload as UpdateVehiclePayload);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Ajouter un vehicule' : 'Modifier le vehicule'}
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
            label="Marque"
            value={make}
            onChange={(event) => setMake(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Modele"
            value={model}
            onChange={(event) => setModel(event.currentTarget.value)}
            required
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Annee"
            value={year}
            onChange={(value) => setYear(value === '' ? '' : (value as number))}
            min={1900}
            max={new Date().getFullYear() + 1}
            required
          />
          <NumberInput
            label="Kilometrage"
            value={mileage}
            onChange={(value) => setMileage(value === '' ? '' : (value as number))}
            min={0}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Immatriculation"
            value={licensePlate}
            onChange={(event) => setLicensePlate(event.currentTarget.value)}
            required
          />
          <TextInput
            label="VIN"
            value={vin}
            onChange={(event) => setVin(event.currentTarget.value)}
            required
          />
        </Group>
        <Group grow>
          <Select
            label="Carburant"
            data={fuelTypeOptions}
            value={fuelType}
            onChange={(value) => setFuelType((value as VehicleFuelType | null) ?? 'diesel')}
            allowDeselect={false}
          />
          <Select
            label="Statut"
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus((value as VehicleStatus | null) ?? 'available')}
            allowDeselect={false}
          />
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={isDisabled}>
            {mode === 'create' ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

