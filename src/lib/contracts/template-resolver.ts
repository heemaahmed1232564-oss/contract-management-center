export type TemplateCandidate = {
  id: string;
  agencyId: string;
  packageId: string;
  contractType: string;
  duration: number | null;
  price: number | null;
  currency: string;
  offerCode: string | null;
  version: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
};

export type TemplateCriteria = {
  agencyId: string;
  packageId: string;
  contractType: string;
  duration?: number | null;
  price?: number | null;
  currency: string;
  offerCode?: string | null;
  at: Date;
};

export type TemplateResolution =
  | { kind: "match"; template: TemplateCandidate }
  | { kind: "none" }
  | { kind: "ambiguous"; templates: TemplateCandidate[] };

function sameOptional<T>(a: T | null | undefined, b: T | null | undefined) {
  return (a ?? null) === (b ?? null);
}

function versionParts(version: string) {
  return version.split(/[^0-9]+/).filter(Boolean).map(Number);
}

export function compareVersions(a: string, b: string) {
  const aParts = versionParts(a);
  const bParts = versionParts(b);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (aParts[index] ?? 0) - (bParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return a.localeCompare(b);
}

export function resolveTemplate(
  templates: TemplateCandidate[],
  criteria: TemplateCriteria,
): TemplateResolution {
  const matches = templates.filter((template) => {
    const isEffective =
      template.effectiveFrom <= criteria.at &&
      (!template.effectiveTo || template.effectiveTo >= criteria.at);
    return (
      template.isActive &&
      isEffective &&
      template.agencyId === criteria.agencyId &&
      template.packageId === criteria.packageId &&
      template.contractType === criteria.contractType &&
      sameOptional(template.duration, criteria.duration) &&
      sameOptional(template.price, criteria.price) &&
      template.currency.toUpperCase() === criteria.currency.toUpperCase() &&
      sameOptional(template.offerCode, criteria.offerCode)
    );
  });

  if (matches.length === 0) return { kind: "none" };
  if (matches.length === 1) return { kind: "match", template: matches[0] };

  const sorted = [...matches].sort((a, b) => {
    const versionDifference = compareVersions(b.version, a.version);
    if (versionDifference !== 0) return versionDifference;
    return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
  });

  const first = sorted[0];
  const second = sorted[1];
  if (
    !second ||
    compareVersions(first.version, second.version) !== 0 ||
    first.effectiveFrom.getTime() !== second.effectiveFrom.getTime()
  ) {
    return { kind: "match", template: first };
  }
  return { kind: "ambiguous", templates: sorted };
}
