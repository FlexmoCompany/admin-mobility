import { useEffect, useState } from 'react';
import {
  Button,
  FileInput,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';

import type { PublishVersionPayload } from '../types';

interface PublishVersionModalProps {
  opened: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: PublishVersionPayload) => Promise<void>;
}

export function PublishVersionModal({
  opened,
  isSubmitting,
  onClose,
  onSubmit,
}: PublishVersionModalProps) {
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [apkFile, setApkFile] = useState<File | null>(null);

  useEffect(() => {
    if (!opened) return;
    setVersion('');
    setChangelog('');
    setApkFile(null);
  }, [opened]);

  const canSubmit =
    version.trim().length > 0 &&
    changelog.trim().length > 0 &&
    apkFile !== null;

  const handleSubmit = async () => {
    if (!apkFile) return;
    await onSubmit({
      version: version.trim(),
      changelog: changelog.trim(),
      apkFileName: apkFile.name,
      apkSizeBytes: apkFile.size,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Publier une version"
      centered
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          LOCK UI — l&apos;APK sera uploadé via files-service plus tard.
        </Text>
        <TextInput
          label="Version"
          placeholder="1.2.1"
          value={version}
          onChange={(event) => setVersion(event.currentTarget.value)}
          required
        />
        <Textarea
          label="Changelog"
          placeholder="Ce qui change dans cette version…"
          minRows={4}
          value={changelog}
          onChange={(event) => setChangelog(event.currentTarget.value)}
          required
        />
        <FileInput
          label="Fichier APK"
          placeholder="Choisir un .apk"
          accept=".apk,application/vnd.android.package-archive"
          value={apkFile}
          onChange={setApkFile}
          required
          clearable
        />
        {apkFile ? (
          <Text size="xs" c="dimmed">
            {apkFile.name} · {(apkFile.size / 1_000_000).toFixed(1)} Mo
          </Text>
        ) : null}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={isSubmitting}
            disabled={!canSubmit}
          >
            Publier
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
