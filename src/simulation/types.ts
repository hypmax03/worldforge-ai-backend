import type { EventCategory } from "../models/Event.js";

export interface KingdomState {
  id: string;
  name: string;
  population: number;
  food: number;
  stability: number;
  droughtYearsLeft: number;
}

export interface SimEvent {
  year: number;
  title: string;
  description: string;
  category: EventCategory;
  kingdomId: string;
}

export interface RuleResult {
  state: KingdomState;
  events: SimEvent[];
}

export interface YearSummary {
  year: number;
  totalPopulation: number;
  avgStability: number;
  eventCount: number;
}

export interface SimulationResult {
  kingdoms: KingdomState[];
  events: SimEvent[];
  summary: YearSummary[];
  truncated: boolean;
}
