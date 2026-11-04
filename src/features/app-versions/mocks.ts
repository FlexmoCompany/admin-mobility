// ponytail: mock until files-service + versions API
import type { AppVersion, VersionAdoption } from './types';

export const MOCK_APP_VERSIONS: AppVersion[] = [
  {
    id: 'ver-120',
    version: '1.2.0',
    changelog:
      'Historique carburant / recharges, banner MAJ, cartes Wave, header Home.',
    apkFileName: 'otp-pay-1.2.0.apk',
    apkSizeBytes: 48_200_000,
    publishedAt: '2026-11-04T10:00:00.000Z',
    downloadCount: 42,
    isCurrent: true,
  },
  {
    id: 'ver-110',
    version: '1.1.0',
    changelog: 'Parrainage 250 F, objectif Home, redesign notifications.',
    apkFileName: 'otp-pay-1.1.0.apk',
    apkSizeBytes: 46_800_000,
    publishedAt: '2026-10-20T09:00:00.000Z',
    downloadCount: 118,
    isCurrent: false,
  },
  {
    id: 'ver-105',
    version: '1.0.5',
    changelog: 'Correctifs recharge Wave et guide pompiste.',
    apkFileName: 'otp-pay-1.0.5.apk',
    apkSizeBytes: 45_100_000,
    publishedAt: '2026-10-01T14:30:00.000Z',
    downloadCount: 203,
    isCurrent: false,
  },
  {
    id: 'ver-100',
    version: '1.0.0',
    changelog: 'Première release OTP Pay (inscription, solde, achat carburant).',
    apkFileName: 'otp-pay-1.0.0.apk',
    apkSizeBytes: 44_500_000,
    publishedAt: '2026-09-15T08:00:00.000Z',
    downloadCount: 310,
    isCurrent: false,
  },
];

export const MOCK_VERSION_ADOPTIONS: VersionAdoption[] = [
  {
    id: 'ado-1',
    driverName: 'Ibrahim Traoré',
    phone: '+225 07 47 51 00 00',
    installedVersion: '1.2.0',
    lastDownloadAt: '2026-11-04T11:20:00.000Z',
  },
  {
    id: 'ado-2',
    driverName: 'Aya Koné',
    phone: '+225 05 12 34 56 78',
    installedVersion: '1.2.0',
    lastDownloadAt: '2026-11-04T12:05:00.000Z',
  },
  {
    id: 'ado-3',
    driverName: 'Moussa Diabaté',
    phone: '+225 01 98 76 54 32',
    installedVersion: '1.1.0',
    lastDownloadAt: '2026-10-22T16:40:00.000Z',
  },
  {
    id: 'ado-4',
    driverName: 'Fatou Bamba',
    phone: '+225 07 11 22 33 44',
    installedVersion: '1.1.0',
    lastDownloadAt: '2026-10-25T09:15:00.000Z',
  },
  {
    id: 'ado-5',
    driverName: 'Koffi Yao',
    phone: '+225 05 55 66 77 88',
    installedVersion: '1.0.5',
    lastDownloadAt: '2026-10-08T18:00:00.000Z',
  },
  {
    id: 'ado-6',
    driverName: 'Aminata Touré',
    phone: '+225 01 23 45 67 89',
    installedVersion: '1.2.0',
    lastDownloadAt: '2026-11-03T20:10:00.000Z',
  },
  {
    id: 'ado-7',
    driverName: 'Sébastien N’Guessan',
    phone: '+225 07 88 99 00 11',
    installedVersion: '1.0.0',
    lastDownloadAt: '2026-09-20T07:45:00.000Z',
  },
  {
    id: 'ado-8',
    driverName: 'Mariame Coulibaly',
    phone: '+225 05 44 33 22 11',
    installedVersion: '1.1.0',
    lastDownloadAt: '2026-10-28T13:30:00.000Z',
  },
];
