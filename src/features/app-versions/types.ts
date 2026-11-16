export type AppVersion = {
  id: string;
  version: string;
  changelog: string;
  apkFileName: string;
  apkSizeBytes: number;
  publishedAt: string;
  downloadCount: number;
  isCurrent: boolean;
};

export type VersionAdoption = {
  id: string;
  driverName: string;
  phone: string;
  installedVersion: string;
  lastDownloadAt: string;
};

export type PublishVersionPayload = {
  version: string;
  changelog: string;
  apkFileName: string;
  apkSizeBytes: number;
};
