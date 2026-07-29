import { NavLink as RouterNavLink } from 'react-router-dom';
import { Badge, Box, Group, Progress, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconGasStation, IconPointFilled } from '@tabler/icons-react';

import type { NavItem } from '@/config/navigation';

interface SidebarProps {
  items: NavItem[];
  activePath: string;
}

export function Sidebar({ items, activePath }: SidebarProps) {
  return (
    <Stack h="100%" gap="md" p="md">
      <Box className="brand-panel">
        <Group justify="space-between" align="flex-start" mb="md">
          <ThemeIcon size={42} radius={8} color="yellow" variant="filled">
            <IconGasStation size={22} />
          </ThemeIcon>
          <Badge color="green" variant="light" leftSection={<IconPointFilled size={12} />}>
            Live
          </Badge>
        </Group>
        <Text size="xs" fw={800} tt="uppercase" c="dimmed">
          FlexMo admin
        </Text>
        <Title order={2} mt={4}>
          Fuel Ops
        </Title>
        <Text size="sm" c="dimmed" mt={6}>
          Operations carburant, cartes et rapprochements TotalEnergies.
        </Text>
      </Box>

      <Stack component="nav" gap={4} aria-label="Navigation principale">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activePath === item.href || activePath.startsWith(`${item.href}/`);

          return (
            <RouterNavLink key={item.key} to={item.href} className={`admin-nav-link${active ? ' active' : ''}`}>
              <ThemeIcon size={34} radius={8} variant={active ? 'filled' : 'light'} color={active ? 'blue' : 'gray'}>
                <Icon size={18} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={750}>
                  {item.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {item.description}
                </Text>
              </Box>
            </RouterNavLink>
          );
        })}
      </Stack>

      <Box mt="auto" className="shift-panel">
        <Group justify="space-between" mb={8}>
          <Text size="xs" fw={800} tt="uppercase" c="dimmed">
            Quart actif
          </Text>
          <Text size="sm" fw={800}>
            08:00-18:00
          </Text>
        </Group>
        <Progress value={62} size="sm" radius="xl" color="blue" mb={8} />
        <Text size="xs" c="dimmed">
          Priorite: allocations bloquees, imports non rattaches, ecarts de soldes.
        </Text>
      </Box>
    </Stack>
  );
}
