export type DestinationResearchInput = {
  destination: string;
  dates?: string;
  travelerPreferences?: string;
};

export type DayPlanInput = {
  destination: string;
  dates?: string;
  tripLengthDays?: number;
  travelerPreferences?: string;
  destinationResearch?: string;
};

export type BudgetInput = {
  destination: string;
  dates?: string;
  partySize?: number;
  budgetStyle?: "budget" | "mid-range" | "luxury" | "unspecified";
  itineraryDraft?: string;
};

export type LogisticsInput = {
  destination: string;
  dates?: string;
  itineraryDraft?: string;
  mobilityNeeds?: string;
};
