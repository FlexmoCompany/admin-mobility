import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { INTERNAL_NAV_ITEMS } from '@/config/navigation';

import { SECTION_CONTENT } from './section-content';
import { SectionView } from './section-view';

export function SectionPage() {
  const location = useLocation();

  const section = useMemo(() => {
    const match = INTERNAL_NAV_ITEMS.find((item) =>
      location.pathname.startsWith(item.href)
    );

    return SECTION_CONTENT[match?.key ?? 'cockpit'];
  }, [location.pathname]);

  return <SectionView section={section} />;
}
