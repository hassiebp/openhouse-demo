import { generateText, isStepCount, tool } from "ai";
import { z } from "zod";
import type {
  BudgetInput,
  DayPlanInput,
  DestinationResearchInput,
  LogisticsInput,
} from "./types";
import { openai } from "@ai-sdk/openai";

const MODEL = openai("gpt-5.4-mini");

export async function researchDestination({
  destination,
  dates,
  travelerPreferences,
}: DestinationResearchInput) {
  const result = await generateText({
    model: MODEL,
    instructions:
      "You are a destination research subagent. Produce concise, practical travel intelligence for an itinerary planner.",
    prompt: [
      `Destination: ${destination}`,
      dates ? `Dates: ${dates}` : "Dates: flexible or unknown",
      travelerPreferences
        ? `Traveler preferences: ${travelerPreferences}`
        : "Traveler preferences: not specified",
      "Summarize the best neighborhoods/areas, seasonal considerations, must-do experiences, local constraints, and any tradeoffs.",
      "Use your available tools before giving the final research summary.",
    ].join("\n"),
    tools: {
      getSeasonalContext: tool({
        description:
          "Estimate seasonal context, weather expectations, crowd levels, and local event considerations.",
        inputSchema: z.object({
          destination: z.string(),
          dates: z.string().optional(),
        }),
        execute: async ({ destination, dates }) => ({
          destination,
          dates: dates || "flexible or unknown",
          guidance:
            "Check seasonality, holidays, opening days, daylight, transit schedules, and weather-sensitive activities before locking the itinerary.",
        }),
      }),
      assessTravelerFit: tool({
        description:
          "Map traveler preferences to pacing, neighborhoods, activity styles, and avoid-list risks.",
        inputSchema: z.object({
          preferences: z.string(),
        }),
        execute: async ({ preferences }) => ({
          preferences,
          guidance:
            "Prioritize a pace, route shape, food style, and activity mix that matches these preferences. Call out assumptions if preferences are incomplete.",
        }),
      }),
    },
    stopWhen: isStepCount(3),
    maxOutputTokens: 700,
  });

  return result.text;
}

export async function buildDayPlan({
  destination,
  dates,
  tripLengthDays,
  travelerPreferences,
  destinationResearch,
}: DayPlanInput) {
  const result = await generateText({
    model: MODEL,
    instructions:
      "You are a day-by-day itinerary subagent. Build realistic plans with sensible pacing and geographic grouping.",
    prompt: [
      `Destination: ${destination}`,
      dates ? `Dates: ${dates}` : "Dates: flexible or unknown",
      tripLengthDays
        ? `Trip length: ${tripLengthDays} days`
        : "Trip length: infer from request",
      travelerPreferences
        ? `Traveler preferences: ${travelerPreferences}`
        : "Traveler preferences: not specified",
      destinationResearch
        ? `Destination research:\n${destinationResearch}`
        : "",
      "Return a concise day-by-day plan with morning, afternoon, evening, food ideas, and optional swaps.",
    ].join("\n"),
    maxOutputTokens: 900,
  });

  return result.text;
}

export async function estimateBudget({
  destination,
  dates,
  partySize,
  budgetStyle,
  itineraryDraft,
}: BudgetInput) {
  const result = await generateText({
    model: MODEL,
    instructions:
      "You are a travel budget subagent. Estimate costs as ranges and explain what changes the estimate.",
    prompt: [
      `Destination: ${destination}`,
      dates ? `Dates: ${dates}` : "Dates: flexible or unknown",
      partySize ? `Party size: ${partySize}` : "Party size: not specified",
      `Budget style: ${budgetStyle || "unspecified"}`,
      itineraryDraft ? `Itinerary draft:\n${itineraryDraft}` : "",
      "Return estimated ranges for lodging, food, activities, local transport, and total daily spend.",
    ].join("\n"),
    maxOutputTokens: 600,
  });

  return result.text;
}

export async function checkLogistics({
  destination,
  dates,
  itineraryDraft,
  mobilityNeeds,
}: LogisticsInput) {
  const result = await generateText({
    model: MODEL,
    instructions:
      "You are a travel logistics subagent. Stress-test plans for feasibility, routing, reservations, timing, and accessibility.",
    prompt: [
      `Destination: ${destination}`,
      dates ? `Dates: ${dates}` : "Dates: flexible or unknown",
      mobilityNeeds ? `Mobility/accessibility needs: ${mobilityNeeds}` : "",
      itineraryDraft ? `Itinerary draft:\n${itineraryDraft}` : "",
      "Return practical routing notes, booking risks, timing cautions, and fixes for unrealistic parts.",
    ].join("\n"),
    maxOutputTokens: 650,
  });

  return result.text;
}
