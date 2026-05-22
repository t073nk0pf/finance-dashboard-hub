export type ShareLike = {
  planShare: number;
  factShare: number;
};

export function actualShareDeviationPp(item: ShareLike): number {
  return (item.factShare - item.planShare) * 100;
}

export function shareDeviationRub(item: ShareLike, factRevenue: number): number {
  return (actualShareDeviationPp(item) / 100) * factRevenue;
}
