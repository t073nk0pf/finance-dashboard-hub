export type ArmeniaMonthlySnapshot = {
  month: string;
  monthKey: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  foodCostShare: number;
  opexShare: number;
  restaurants: number;
};

export type ArmeniaKpis = {
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  foodCostShare: number;
  foodCostPlanShare: number;
  ucShare: number;
  ucPlanShare: number;
  opexShare: number;
  restaurants: number;
  averageRevenuePerRestaurant: number;
};

export type ArmeniaRestaurant = {
  name: string;
  city: string;
  revenue: number;
  ebitdaMargin: number;
  foodCostShare: number;
  ucShare: number;
  status: "leader" | "stable" | "watch";
};

export type ArmeniaProfitabilityDriver = {
  title: string;
  value: string;
  description: string;
  tone: "positive" | "warning" | "negative";
};

export type ArmeniaUnitEconomics = {
  foodCostPlanShare: number;
  foodCostFactShare: number;
  ucPlanShare: number;
  ucFactShare: number;
  writeOffShare: number;
  writeOffPlanShare: number;
};

export type ArmeniaGrowthReadinessConfig = {
  threshold: number;
  acceleratedThreshold: number;
  excludedMonthKeys: string[];
};

export type ArmeniaDashboardData = {
  source: {
    type: "static-json" | "database" | "excel" | "google-sheets";
    fileName: string;
    updatedAt: string;
  };
  period: {
    label: string;
    latestMonthKey: string;
    latestMonth: string;
  };
  kpis: ArmeniaKpis;
  monthlySeries: ArmeniaMonthlySnapshot[];
  restaurants: ArmeniaRestaurant[];
  profitabilityDrivers: ArmeniaProfitabilityDriver[];
  growthReadiness: ArmeniaGrowthReadinessConfig;
  unitEconomics: ArmeniaUnitEconomics;
};
