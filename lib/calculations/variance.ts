import { money, pp } from "@/lib/formatters";
import { actualShareDeviationPp, shareDeviationRub } from "@/lib/calculations/shares";
import type { DashboardMetric, MainArticle } from "@/types/dashboard";

type MetricLike = DashboardMetric | MainArticle;

export function isExpenseMetric(item: Pick<DashboardMetric, "kind">): boolean {
  return item.kind === "expense_share";
}

export function getActualShareDeviationPp(item: Pick<DashboardMetric, "planShare" | "factShare">): number {
  return actualShareDeviationPp(item);
}

export function getShareDeviationPp(item: Pick<DashboardMetric, "planShare" | "factShare">): number {
  return getActualShareDeviationPp(item);
}

export function getMoneyDeviation(item: Pick<DashboardMetric, "fact" | "plan">): number {
  return item.fact - item.plan;
}

export function isExpenseGood(item: Pick<DashboardMetric, "planShare" | "factShare">): boolean {
  return item.factShare <= item.planShare;
}

export function isPositiveMetricGood(item: Pick<DashboardMetric, "fact" | "plan">): boolean {
  return item.fact >= item.plan;
}

export function isMetricGood(item: MetricLike): boolean {
  return isExpenseMetric(item) ? isExpenseGood(item) : isPositiveMetricGood(item);
}

export function getDeviationDisplay(item: MetricLike): string {
  return isExpenseMetric(item) ? pp(getActualShareDeviationPp(item)) : money(getMoneyDeviation(item));
}

export function getRubEffect(item: MetricLike, factRevenue: number): number {
  return isExpenseMetric(item) ? shareDeviationRub(item, factRevenue) : getMoneyDeviation(item);
}

export function isGoodDeviation(item: MetricLike): boolean {
  return isMetricGood(item);
}

export function formatDeviation(item: MetricLike): string {
  return getDeviationDisplay(item);
}

export function deviationIcon(item: MetricLike): "▲" | "▼" {
  if (isExpenseMetric(item)) return getActualShareDeviationPp(item) <= 0 ? "▼" : "▲";
  return isMetricGood(item) ? "▲" : "▼";
}

export const getRubleEffect = getRubEffect;
