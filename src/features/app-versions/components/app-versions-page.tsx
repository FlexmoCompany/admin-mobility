import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';

import { MOCK_APP_VERSIONS, MOCK_VERSION_ADOPTIONS } from '../mocks';
import type {
  AppVersion,
  PublishVersionPayload,
  VersionAdoption,
} from '../types';
import { PublishVersionModal } from './publish-version-modal';

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '-';

const formatSize = (bytes: number) =>
  `${(bytes / 1_000_000).toFixed(1)} Mo`;

export function AppVersionsPage() {
  const [versions, setVersions] = useState<AppVersion[]>(MOCK_APP_VERSIONS);
  const [adoptions] = useState<VersionAdoption[]>(MOCK_VERSION_ADOPTIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [versionFilter, setVersionFilter] = useState<string | null>('');

  const currentVersion = useMemo(
    () => versions.find((item) => item.isCurrent) ?? versions[0],
    [versions]
  );

  const versionFilterOptions = useMemo(
    () => [
      { value: '', label: 'Toutes les versions' },
      ...versions.map((item) => ({
        value: item.version,
        label: `v${item.version}`,
      })),
    ],
    [versions]
  );

  const filteredAdoptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return adoptions.filter((item) => {
      if (versionFilter && item.installedVersion !== versionFilter) {
        return false;
      }
      if (!term) return true;
      return (
        item.driverName.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.installedVersion.includes(term)
      );
    });
  }, [adoptions, searchTerm, versionFilter]);

  const handlePublish = async (payload: PublishVersionPayload) => {
    setIsSubmitting(true);
    try {
      // ponytail: mock until files-service + versions API
      await new Promise((resolve) => setTimeout(resolve, 400));
      setVersions((prev) => [
        {
          id: `ver-${Date.now()}`,
          version: payload.version,
          changelog: payload.changelog,
          apkFileName: payload.apkFileName,
          apkSizeBytes: payload.apkSizeBytes,
          publishedAt: new Date().toISOString(),
          downloadCount: 0,
          isCurrent: true,
        },
        ...prev.map((item) => ({ ...item, isCurrent: false })),
      ]);
      notifications.show({
        title: 'Version ajoutée (mock)',
        message: 'LOCK — upload files-service / API bientôt.',
        color: 'blue',
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetCurrent = (versionId: string) => {
    setVersions((prev) =>
      prev.map((item) => ({
        ...item,
        isCurrent: item.id === versionId,
      }))
    );
    notifications.show({
      title: 'Version courante mise à jour',
      message: 'LOCK — pas encore persisté côté API.',
      color: 'green',
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Versions app</Title>
          <Text c="dimmed" size="sm">
            Secours Play Store — publier des APK OTP Pay + suivre les
            téléchargements.
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setIsModalOpen(true)}
        >
          Publier une version
        </Button>
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Version courante
            </Text>
            <Title order={3}>v{currentVersion?.version ?? '—'}</Title>
            <Text size="sm">
              Publiée le {formatDate(currentVersion?.publishedAt)} ·{' '}
              {currentVersion
                ? formatSize(currentVersion.apkSizeBytes)
                : '-'}{' '}
              · {currentVersion?.apkFileName ?? '-'}
            </Text>
            <Text size="sm" c="dimmed" maw={640}>
              {currentVersion?.changelog}
            </Text>
          </Stack>
          <Badge color="green" variant="light" size="lg">
            Courante
          </Badge>
        </Group>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          Historique des versions
        </Title>
        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Version</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Changelog</Table.Th>
                <Table.Th>Téléchargements</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {versions.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text fw={600}>v{item.version}</Text>
                    <Text size="xs" c="dimmed">
                      {item.apkFileName}
                    </Text>
                  </Table.Td>
                  <Table.Td>{formatDate(item.publishedAt)}</Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2} maw={320}>
                      {item.changelog}
                    </Text>
                  </Table.Td>
                  <Table.Td>{item.downloadCount}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={item.isCurrent ? 'green' : 'gray'}
                      variant="light"
                    >
                      {item.isCurrent ? 'Courante' : 'Ancienne'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {!item.isCurrent ? (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleSetCurrent(item.id)}
                      >
                        Marquer courante
                      </Button>
                    ) : null}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={4}>Adoptions chauffeurs</Title>
          <Group>
            <TextInput
              placeholder="Rechercher chauffeur / téléphone"
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              w={260}
            />
            <Select
              data={versionFilterOptions}
              value={versionFilter}
              onChange={setVersionFilter}
              w={180}
              clearable={false}
            />
          </Group>
        </Group>
        <Table.ScrollContainer minWidth={720}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Chauffeur</Table.Th>
                <Table.Th>Téléphone</Table.Th>
                <Table.Th>Version installée</Table.Th>
                <Table.Th>Dernier téléchargement</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredAdoptions.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.driverName}</Table.Td>
                  <Table.Td>{item.phone}</Table.Td>
                  <Table.Td>
                    <Badge variant="outline">v{item.installedVersion}</Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(item.lastDownloadAt)}</Table.Td>
                </Table.Tr>
              ))}
              {filteredAdoptions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="md">
                      Aucune adoption pour ce filtre.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <PublishVersionModal
        opened={isModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handlePublish}
      />
    </Stack>
  );
}
