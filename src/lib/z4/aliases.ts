import { CATALOG, type PlatformId } from "./catalog";

export type HostedAlias = {
  id: string;
  alias: string;
  label: string;
  host: string;
  hostId: PlatformId;
  domain: string;
  domainLabel: string;
};

function words(value: string): string {
  return value.replace(/_/g, " ");
}

const hosted: HostedAlias[] = [];
for (const hostId of ["ipaws", "tracs", "post"] as const) {
  const platform = CATALOG[hostId];
  for (const domain of platform.domains) {
    for (const name of domain.names) {
      hosted.push({
        id: `${hostId}:${domain.id}:${name}`,
        alias: name,
        label: words(name),
        host: platform.label,
        hostId,
        domain: domain.id,
        domainLabel: words(domain.id),
      });
    }
  }
}

export const HOSTED: readonly HostedAlias[] = hosted;

const byId = new Map(hosted.map((alias) => [alias.id, alias]));

export function aliasById(id: string): HostedAlias | undefined {
  return byId.get(id);
}

export const HOST_COUNTS = {
  ipaws: CATALOG.ipaws.burns,
  tracs: CATALOG.tracs.burns,
  post: CATALOG.post.burns,
  total: hosted.length,
} as const;
