# Open House Demo

A demo chat app for the ClickHouse Open House Conference.

The app uses the Vercel AI SDK to connect to models and Langfuse for AI observability.

## Run the itinerary experiment

```bash
pnpm experiment:itinerary
```

The script loads `.env`, runs the current itinerary agent on three local demo
items, and records one `feasibility_and_pacing` evaluator score per item in
Langfuse.

Useful overrides:

```bash
LANGFUSE_EXPERIMENT_RUN_NAME=demo-baseline pnpm experiment:itinerary
```
