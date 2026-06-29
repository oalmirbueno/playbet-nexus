// PlayBet — Modelo oficial v3 (08/05/2026)
// Fonte: docs/PLAYBET_MODELO_OFICIAL.md

export type CareerKind = "creator" | "manager";

export interface CareerLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  min: number;
  max: number;
  bonus?: boolean;
  description: string;
}

export const CREATOR_LEVELS: CareerLevel[] = [
  { level: 1, label: "Teste", min: 10, max: 10, description: "Período de validação inicial." },
  { level: 2, label: "Validado", min: 10, max: 12.5, description: "Performance comprovada." },
  { level: 3, label: "Recorrente", min: 12.5, max: 12.5, description: "Receita consistente mês a mês." },
  { level: 4, label: "Premium", min: 15, max: 15, description: "Alto volume e retenção." },
  { level: 5, label: "Embaixador", min: 15, max: 100, bonus: true, description: "Premium + bônus de performance." },
];

export const MANAGER_LEVELS: CareerLevel[] = [
  { level: 1, label: "Indicador", min: 3, max: 3, description: "Indicação pontual." },
  { level: 2, label: "Júnior", min: 5, max: 5, description: "Gestão de carteira inicial." },
  { level: 3, label: "Pleno", min: 5, max: 7, description: "Carteira recorrente." },
  { level: 4, label: "Sênior", min: 8, max: 8, description: "Carteira premium." },
  { level: 5, label: "Líder", min: 8, max: 100, bonus: true, description: "Líder de carteira + bônus." },
];

export const getLevels = (kind: CareerKind) =>
  kind === "creator" ? CREATOR_LEVELS : MANAGER_LEVELS;

export const getLevel = (kind: CareerKind, level: number | null | undefined): CareerLevel | undefined =>
  getLevels(kind).find((l) => l.level === level);

export const suggestPercentForLevel = (kind: CareerKind, level: number): number => {
  const l = getLevel(kind, level);
  if (!l) return 0;
  return l.bonus ? l.min : l.min;
};

export const isPercentValidForLevel = (kind: CareerKind, level: number, percent: number): boolean => {
  const l = getLevel(kind, level);
  if (!l) return false;
  if (l.bonus) return percent >= l.min;
  return percent >= l.min && percent <= l.max;
};

export const formatLevelRange = (l: CareerLevel): string => {
  if (l.bonus) return `${l.min}% + bônus`;
  if (l.min === l.max) return `${l.min}%`;
  return `${l.min}–${l.max}%`;
};
