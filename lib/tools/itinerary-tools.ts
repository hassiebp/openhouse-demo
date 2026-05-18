import { tool } from "ai";
import { z } from "zod";
import {
  buildDayPlan,
  checkLogistics,
  estimateBudget,
  researchDestination,
} from "./subagents";

export const itineraryTools = {
  researchDestination: tool({
    description:
      "Call a destination research subagent. This subagent has its own tools for seasonal context and traveler fit.",
    inputSchema: z.object({
      destination: z.string(),
      dates: z.string().optional(),
      travelerPreferences: z.string().optional(),
    }),
    execute: researchDestination,
  }),
  buildDayPlan: tool({
    description:
      "Call a day-by-day itinerary subagent to draft the trip schedule.",
    inputSchema: z.object({
      destination: z.string(),
      dates: z.string().optional(),
      tripLengthDays: z.number().optional(),
      travelerPreferences: z.string().optional(),
      destinationResearch: z.string().optional(),
    }),
    execute: buildDayPlan,
  }),
  estimateBudget: tool({
    description:
      "Call a budget subagent to estimate realistic trip costs and tradeoffs.",
    inputSchema: z.object({
      destination: z.string(),
      dates: z.string().optional(),
      partySize: z.number().optional(),
      budgetStyle: z
        .enum(["budget", "mid-range", "luxury", "unspecified"])
        .optional(),
      itineraryDraft: z.string().optional(),
    }),
    execute: estimateBudget,
  }),
  checkLogistics: tool({
    description:
      "Call a logistics subagent to stress-test route feasibility, timing, booking risks, and accessibility.",
    inputSchema: z.object({
      destination: z.string(),
      dates: z.string().optional(),
      itineraryDraft: z.string().optional(),
      mobilityNeeds: z.string().optional(),
    }),
    execute: checkLogistics,
  }),
};
