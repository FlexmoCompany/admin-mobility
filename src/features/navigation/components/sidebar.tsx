import { NavLink as RouterNavLink } from 'react-router-dom';
import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconGasStation, IconPointFilled } from '@tabler/icons-react';

import { NAV_SECTIONS, type NavItem } from '@/config/navigation';

interface SidebarProps {
  items: NavItem[];
  activePath: string;
}

/**
 * Barre latérale : entrées sur une ligne, regroupées par rubrique. La
 * description de chaque écran reste disponible au survol (title).
 */
export function Sidebar({ items, activePath }: SidebarProps) {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => item.section === section.key),
  })).filter((section) => section.items.length > 0);

  return (
    <Stack h="100%" gap="sm" p="md" style={{ minHeight: 0, overflow: 'hidden' }}>
      <Group className="brand-panel" gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
        <ThemeIcon size={32} radius={8} color="yellow" variant="filled">
          <IconGasStation size={18} />
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" fw={800} tt="uppercase" c="dimmed" lh={1.2} style={{ whiteSpace: 'nowrap' }}>
              FlexMo admin
            </Text>
            <IconPointFilled size={10} color="var(--mantine-color-green-6)" aria-label="En ligne" />
          </Group>
          <Text fw={800} size="lg" lh={1.2} style={{ whiteSpace: 'nowrap' }}>
            Fuel Ops
          </Text>
        </Box>
      </Group>

      <Stack
        component="nav"
        gap={10}
        aria-label="Navigation principale"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        {sections.map((section) => (
          <Box key={section.key}>
            <Text className="admin-nav-section" size="xs" fw={800} tt="uppercase" c="dimmed">
              {section.label}
            </Text>
            <Stack gap={2}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.href || activePath.startsWith(`${item.href}/`);

                return (
                  <RouterNavLink
                    key={item.key}
                    to={item.href}
                    title={item.description}
                    className={`admin-nav-link${active ? ' active' : ''}`}
                  >
                    <ThemeIcon
                      size={28}
                      radius={6}
                      variant={active ? 'filled' : 'light'}
                      color={active ? 'blue' : 'gray'}
                    >
                      <Icon size={16} />
                    </ThemeIcon>
                    <Text size="sm" fw={active ? 750 : 600} truncate>
                      {item.label}
                    </Text>
                  </RouterNavLink>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
