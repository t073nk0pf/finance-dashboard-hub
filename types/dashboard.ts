export type MetricKind = "expense_share" | "positive_money";

export type DashboardSeriesPoint = {
  month: string;
  plan: number;
  fact: number;
};

export type DashboardMetric = {
  key: string;
  label: string;
  row?: number;
  kind: MetricKind;
  plan: number;
  fact: number;
  delta?: number;
  deltaRatio?: number | null;
  planShare: number;
  factShare: number;
  deltaPp?: number;
  shareDeltaRub?: number;
  score?: number;
  isGood?: boolean;
  series: DashboardSeriesPoint[];
};

export type MainArticle = DashboardMetric & {
  title: string;
  caption: string;
};

export type ExpenseVarianceItem = {
  row?: number;
  label: string;
  path: string;
  level?: number;
  plan: number;
  fact: number;
  delta: number;
  planShare: number;
  factShare: number;
  improvementPp?: number;
};

export type EntityPerformance = {
  name: string;
  sheet: string;
  revenuePlan: number;
  revenueFact: number;
  revenueDelta: number;
  revenueRatio: number | null;
  opexPlan: number;
  opexFact: number;
  opexPlanShare: number;
  opexFactShare: number;
  opexDeltaPp: number;
  ebitdaPlan: number;
  ebitdaFact: number;
  ebitdaDelta: number;
  netProfitPlan: number;
  netProfitFact: number;
  netProfitDelta: number;
  betterExpenses: ExpenseVarianceItem[];
  worseExpenses: ExpenseVarianceItem[];
};

export type DashboardSource = {
  fileName: string;
  sheet: string;
  period: string;
  legalEntities: string[];
};

export type DashboardData = {
  source: DashboardSource;
  months: string[];
  metrics: Record<string, DashboardMetric> & {
    revenue: DashboardMetric;
    opex: DashboardMetric;
    ebitda: DashboardMetric;
    netProfit: DashboardMetric;
    foodCost: DashboardMetric;
    otherOpex: DashboardMetric;
  };
  mainArticles: MainArticle[];
  expenseVariance: {
    better: ExpenseVarianceItem[];
    worse: ExpenseVarianceItem[];
    all?: ExpenseVarianceItem[];
  };
  entities: EntityPerformance[];
};

export type DashboardDataParams = {
  source?: "static-json" | "database" | "excel";
  periodKey?: string;
  legalEntityIds?: string[];
};

export type EntityDashboard = EntityPerformance;
export type PlanFactDashboardData = DashboardData;
