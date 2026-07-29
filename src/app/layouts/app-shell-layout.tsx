import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Button,
  Group,
  Menu,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconRefresh,
  IconShieldCheck,
  IconSun,
} from '@tabler/icons-react';

import { useUiStore } from '@/app/store/ui-store';
import { INTERNAL_NAV_ITEMS } from '@/config/navigation';
import { useAuthStore } from '@/features/auth/auth-store';
import { Sidebar } from '@/features/navigation/components/sidebar';
import { runtimeConfig } from '@/shared/api/config';

const getRouteKeyFromPathname = (pathname: string) => {
  const match = INTERNAL_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  return match?.key ?? 'cockpit';
};

export function AppShellLayout() {
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const setActiveRoute = useUiStore((state) => state.setActiveRoute);
  const operator = useAuthStore((state) => state.operator);
  const logout = useAuthStore((state) => state.logout);

  const activePath = location.pathname;
  const activeItem = useMemo(
    () => INTERNAL_NAV_ITEMS.find((item) => activePath.startsWith(item.href)),
    [activePath]
  );

  useEffect(() => {
    setActiveRoute(getRouteKeyFromPathname(location.pathname));
    closeMobile();
  }, [closeMobile, location.pathname, setActiveRoute]);

  const isDark = colorScheme === 'dark';

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: 288,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
      className="admin-shell"
    >
      <AppShell.Header className="admin-header">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="md" size="sm" />
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Fuel Ops / {activeItem?.label ?? 'Cockpit'}
              </Text>
              <Title order={3} className="header-title">
                {activeItem?.label ?? 'Cockpit'}
              </Title>
            </div>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" color={runtimeConfig.env === 'production' ? 'green' : 'gray'} leftSection={<IconShieldCheck size={13} />}>
              {runtimeConfig.env}
            </Badge>
            <Button visibleFrom="sm" variant="default" leftSection={<IconRefresh size={16} />}>
              Synchroniser
            </Button>
            <Tooltip label={isDark ? 'Mode clair' : 'Mode sombre'}>
              <ActionIcon
                variant="default"
                aria-label="Changer le theme"
                onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Notifications">
              <ActionIcon variant="default" aria-label="Notifications">
                <IconBell size={18} />
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" width={220}>
              <Menu.Target>
                <Button variant="subtle" color="dark" px="xs" rightSection={<IconChevronDown size={14} />}>
                  <Group gap="xs" wrap="nowrap">
                    <Avatar size={30} radius={8} color="blue">
                      {operator?.name?.slice(0, 2).toUpperCase() ?? 'OP'}
                    </Avatar>
                    <div className="operator-text">
                      <Text size="sm" fw={700} lh={1.1}>
                        {operator?.name ?? 'Ops Lead'}
                      </Text>
                      <Text size="xs" c="dimmed" lh={1.1}>
                        {operator?.role ?? 'Fuel operations'}
                      </Text>
                    </div>
                  </Group>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Session</Menu.Label>
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
                  Se deconnecter
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="admin-navbar">
        <Sidebar items={INTERNAL_NAV_ITEMS} activePath={activePath} />
      </AppShell.Navbar>

      <AppShell.Main className="admin-main">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
