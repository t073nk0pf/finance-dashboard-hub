"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardFilterState } from "@/lib/dashboard/filters/types";
import { mergeFiltersWithSearchParams, searchParamsToFilters, filtersToSearchParams } from "@/lib/dashboard/filters/urlState";
import { getPresetById } from "@/lib/dashboard/filters/presets";

export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => searchParamsToFilters(new URLSearchParams(searchParams?.toString() ?? "")),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch: Partial<DashboardFilterState>) => {
      const merged = mergeFiltersWithSearchParams(patch, new URLSearchParams(searchParams?.toString() ?? ""));
      const params = filtersToSearchParams(merged);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = getPresetById(presetId);
      if (!preset) return;
      setFilters(preset.filters);
    },
    [setFilters],
  );

  return {
    filters,
    setFilters,
    resetFilters,
    applyPreset,
  };
}
