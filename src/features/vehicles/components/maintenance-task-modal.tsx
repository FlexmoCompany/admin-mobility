import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';

import type {
  CreateMaintenanceTaskPayload,
  MaintenanceTaskPriority,
  MaintenanceTaskRecord,
  MaintenanceTaskStatus,
  MaintenanceTaskType,
  UpdateMaintenanceTaskPayload,
} from '../types';

interface MaintenanceTaskModalProps {
  opened: boolean;
  mode: 'create' | 'edit';
  task: MaintenanceTaskRecord | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMaintenanceTaskPayload | UpdateMaintenanceTaskPayload) => Promise<void>;
}

const typeOptions = [
  { value: 'oil_change', label: 'Vidange' },
  { value: 'tire_rotation', label: 'Pneus' },
  { value: 'brake_check', label: 'Freins' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Reparation' },
  { value: 'other', label: 'Autre' },
];

const priorityOptions = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'scheduled', label: 'Planifie' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
];

export function MaintenanceTaskModal({
  opened,
  mode,
  task,
  isSubmitting,
  onClose,
  onSubmit,
}: MaintenanceTaskModalProps) {
  const [type, setType] = useState<MaintenanceTaskType>('inspection');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<MaintenanceTaskPriority>('medium');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [status, setStatus] = useState<MaintenanceTaskStatus>('pending');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (mode === 'edit' && task) {
      setType((task.type as MaintenanceTaskType) ?? 'inspection');
      setDescription(task.description ?? '');
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setPriority((task.priority as MaintenanceTaskPriority) ?? 'medium');
      setEstimatedCost(task.estimatedCost ?? '');
      setStatus((task.status as MaintenanceTaskStatus) ?? 'pending');
      setTechnician(task.technician ?? '');
      setNotes(task.notes ?? '');
      return;
    }

    setType('inspection');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setEstimatedCost('');
    setStatus('pending');
    setTechnician('');
    setNotes('');
  }, [mode, opened, task]);

  const isDisabled =
    !description.trim() || !dueDate || estimatedCost === '' || Number.isNaN(Number(estimatedCost));

  const handleSubmit = async () => {
    if (mode === 'create') {
      await onSubmit({
        type,
        description: description.trim(),
        dueDate,
        priority,
        estimatedCost: typeof estimatedCost === 'number' ? estimatedCost : Number(estimatedCost),
      });
      return;
    }

    await onSubmit({
      type,
      description: description.trim(),
      dueDate,
      priority,
      estimatedCost: typeof estimatedCost === 'number' ? estimatedCost : Number(estimatedCost),
      status,
      technician: technician.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Ajouter une tache maintenance' : 'Modifier la tache maintenance'}
      centered
    >
      <Stack>
        <Select
          label="Type"
          data={typeOptions}
          value={type}
          onChange={(value) => setType((value as MaintenanceTaskType | null) ?? 'inspection')}
          allowDeselect={false}
        />
        <TextInput
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          required
        />
        <Group grow>
          <TextInput
            type="date"
            label="Echeance"
            value={dueDate}
            onChange={(event) => setDueDate(event.currentTarget.value)}
            required
          />
          <Select
            label="Priorite"
            data={priorityOptions}
            value={priority}
            onChange={(value) => setPriority((value as MaintenanceTaskPriority | null) ?? 'medium')}
            allowDeselect={false}
          />
        </Group>
        <NumberInput
          label="Cout estime"
          value={estimatedCost}
          onChange={(value) => setEstimatedCost(value === '' ? '' : (value as number))}
          min={0}
          required
        />
        {mode === 'edit' ? (
          <>
            <Select
              label="Statut"
              data={statusOptions}
              value={status}
              onChange={(value) => setStatus((value as MaintenanceTaskStatus | null) ?? 'pending')}
              allowDeselect={false}
            />
            <TextInput
              label="Technicien"
              value={technician}
              onChange={(event) => setTechnician(event.currentTarget.value)}
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              autosize
              minRows={2}
            />
          </>
        ) : null}
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

