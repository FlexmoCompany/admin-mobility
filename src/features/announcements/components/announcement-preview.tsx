import type { CSSProperties } from 'react';
import { Download, Info, Megaphone, X } from 'lucide-react';

import type { AnnouncementKind } from '../api';

/**
 * Reproduction web de `AnnouncementCard` (mobility,
 * src/components/home/AnnouncementCard.tsx) : memes couleurs, tailles et
 * troncatures (titre 2 lignes, texte 4 lignes) que sur l'accueil chauffeur.
 */
const KINDS: Record<AnnouncementKind, { tag: string; fg: string; bg: string; Icon: typeof Info }> = {
  news: { tag: 'Nouveau', fg: '#3F6AF4', bg: '#F0F4FF', Icon: Megaphone },
  update: { tag: 'Mise à jour', fg: '#059669', bg: '#E7F8F1', Icon: Download },
  info: { tag: 'Info', fg: '#D97706', bg: '#FEF3C7', Icon: Info },
};

const clamp = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

interface AnnouncementPreviewProps {
  kind: AnnouncementKind;
  title: string;
  body: string;
  /** Le bouton n'apparait dans l'app que s'il a un libelle et une cible. */
  ctaLabel?: string | null;
  hasTarget?: boolean;
}

export function AnnouncementPreview({ kind, title, body, ctaLabel, hasTarget }: AnnouncementPreviewProps) {
  const k = KINDS[kind] ?? KINDS.info;
  const showCta = Boolean(ctaLabel?.trim()) && Boolean(hasTarget);

  return (
    <div
      data-testid="announcement-preview"
      style={{
        // Fond de l'accueil de l'app autour de la carte.
        background: '#F8FAFC',
        borderRadius: 24,
        padding: 16,
        maxWidth: 360,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #F0F4FF',
          padding: 16,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: k.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <k.Icon size={22} color={k.fg} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: k.fg,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              {k.tag}
            </div>
            <div
              style={{
                fontFamily: "Ubuntu, 'Segoe UI', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                lineHeight: '20px',
                color: '#0F172A',
                wordBreak: 'break-word',
                ...clamp(2),
              }}
            >
              {title.trim() || 'Titre de l’annonce'}
            </div>
          </div>
          <X size={18} color="#94A3B8" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden />
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            lineHeight: '18px',
            color: '#475569',
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
            ...clamp(4),
          }}
        >
          {body.trim() || 'Le texte de l’annonce apparaîtra ici.'}
        </div>
        {showCta ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginTop: 12,
              height: 36,
              padding: '0 16px',
              borderRadius: 999,
              background: '#F0F4FF',
              color: '#1B47C4',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {ctaLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
