import { useMemo, useState } from 'react';

import { INTERNAL_NAV_ITEMS, type AppRouteKey } from '@/config/navigation';
import { SECTION_CONTENT } from '@/features/sections/section-content';
import { useUiStore } from '@/app/store/ui-store';

const getKeyFromPath = (path: string): AppRouteKey => {
  const match = INTERNAL_NAV_ITEMS.find((item) => item.href === path);
  return match?.key ?? 'cockpit';
};

export function useAppRouter() {
  const [currentPath, setCurrentPath] = useState('/cockpit');
  const setActiveRoute = useUiStore((state) => state.setActiveRoute);

  const activeKey = getKeyFromPath(currentPath);

  const activeSection = useMemo(
    () => SECTION_CONTENT[activeKey],
    [activeKey]
  );

  const navigate = (path: string, key: AppRouteKey) => {
    setCurrentPath(path);
    setActiveRoute(key);
  };

  return {
    currentPath,
    activeSection,
    navigate,
  };
}
