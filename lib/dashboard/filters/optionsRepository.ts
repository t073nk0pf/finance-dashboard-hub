import type { DashboardFilterOption, DashboardFilterState } from "@/lib/dashboard/filters/types";
import { db } from "@/lib/db";

type FilterScope = Pick<DashboardFilterState, "country" | "region" | "unitId">;

function normalizeCountry(country: string | undefined): string | undefined {
  if (!country || country === "all") return undefined;
  return country;
}

function normalizeRegion(region: string | undefined): string | undefined {
  if (!region || region === "all") return undefined;
  return region.toLowerCase();
}

export async function getRegionOptions(filters: FilterScope): Promise<DashboardFilterOption[]> {
  try {
    const country = normalizeCountry(filters.country);
    const units = await db.unit.findMany({
      where: {
        isActive: true,
        country,
      },
      select: {
        region: true,
        country: true,
      },
    });

    const counts = new Map<string, { country: string; unitsCount: number }>();
    for (const row of units) {
      if (!row.region) continue;
      const key = row.region.toLowerCase();
      const current = counts.get(key);
      if (current) {
        current.unitsCount += 1;
      } else {
        counts.set(key, { country: row.country, unitsCount: 1 });
      }
    }

    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, meta]) => ({
        value,
        label: value,
        meta,
      }));
  } catch {
    return [];
  }
}

export async function getUnitOptions(filters: FilterScope): Promise<DashboardFilterOption[]> {
  try {
    const country = normalizeCountry(filters.country);
    const region = normalizeRegion(filters.region);

    const units = await db.unit.findMany({
      where: {
        isActive: true,
        country,
        region,
        id: filters.unitId ?? undefined,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        externalId: true,
      },
    });

    return units.map((unit) => ({
      value: unit.id,
      label: unit.name,
      meta: {
        country: unit.country,
        region: unit.region ?? undefined,
        externalId: unit.externalId ?? undefined,
      },
    }));
  } catch {
    return [];
  }
}

export async function getCountryScopedFilterOptions(filters: FilterScope): Promise<{
  regions: DashboardFilterOption[];
  units: DashboardFilterOption[];
}> {
  const [regions, units] = await Promise.all([getRegionOptions(filters), getUnitOptions(filters)]);
  return { regions, units };
}
