#!/usr/bin/env node
/**
 * Nearby load test — how many simultaneous clients can the API actually carry?
 *
 * Models the real client: N people each polling on a fixed cadence, which is what the web app
 * does (apps/web/components/nearby-experience.tsx). Offered load is clients ÷ interval, so
 * 200 clients on an 8s poll is 25 requests/second.
 *
 * Two modes:
 *   public  no auth needed. Hits GET /public/profiles/:username — a real database read, so it
 *           measures Fastify + Postgres + your hosting tier. Good for a first number.
 *   nearby  the real thing. Hits GET /nearby, which runs the PostGIS 200 m search and verifies
 *           a token on every request. Needs --tokens: a file of Supabase access tokens, one
 *           per line. This is the number that decides your capacity.
 *
 * Safety: refuses any non-localhost target unless --allow-remote is passed. Never point this at
 * production casually — it is indistinguishable from an outage while it runs.
 *
 *   node scripts/nearby-load-test.mjs --clients 200 --interval 8000 --duration 60
 *   node scripts/nearby-load-test.mjs --mode nearby --tokens tokens.txt --clients 100 \
 *        --url https://staging.example.com/api/v1 --allow-remote
 */

import { readFileSync } from "node:fs";

const DEFAULTS = {
  url: "http://localhost:4000/api/v1",
  mode: "public",
  username: "charan",
  tokens: "",
  clients: 50,
  interval: 8000,
  duration: 60,
  ramp: 10,
  timeout: 20000,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS, allowRemote: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--allow-remote") { options.allowRemote = true; continue; }
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    if (key in DEFAULTS) {
      options[key] = typeof DEFAULTS[key] === "number" ? Number(value) : value;
    } else {
      throw new Error(`Unknown option --${key}`);
    }
  }
  return options;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

const ms = (value) => `${value.toFixed(0)} ms`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const target = new URL(options.url);
  const isLocal = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(target.hostname);

  if (!isLocal && !options.allowRemote) {
    console.error(
      `\nRefusing to load-test ${target.origin} without --allow-remote.\n\n` +
      `This generates sustained traffic and looks like an outage to real users while it runs.\n` +
      `Point it at a local or staging API, or pass --allow-remote if you are certain.\n`,
    );
    process.exit(2);
  }

  let tokens = [];
  if (options.mode === "nearby") {
    if (!options.tokens) throw new Error("--mode nearby needs --tokens <file> (one access token per line)");
    tokens = readFileSync(options.tokens, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
    if (tokens.length === 0) throw new Error(`No tokens found in ${options.tokens}`);
  } else if (options.mode !== "public") {
    throw new Error(`Unknown --mode ${options.mode} (expected "public" or "nearby")`);
  }

  const path = options.mode === "nearby"
    ? "/nearby"
    : `/public/profiles/${encodeURIComponent(options.username)}`;

  const offeredRps = options.clients / (options.interval / 1000);

  console.log(`
  target      ${target.origin}${target.pathname}${path}
  mode        ${options.mode}${options.mode === "nearby" ? ` (${tokens.length} token${tokens.length === 1 ? "" : "s"}, cycled)` : ""}
  clients     ${options.clients}
  poll        every ${options.interval} ms
  offered     ${offeredRps.toFixed(1)} requests/second
  duration    ${options.duration}s (${options.ramp}s ramp, excluded from results)
`);

  const latencies = [];
  const statuses = new Map();
  const errors = new Map();
  let inFlight = 0;
  let peakInFlight = 0;
  let measuring = false;

  const record = (bucket, key) => bucket.set(key, (bucket.get(key) ?? 0) + 1);

  async function fireOnce(clientIndex) {
    const started = performance.now();
    inFlight += 1;
    peakInFlight = Math.max(peakInFlight, inFlight);
    try {
      const response = await fetch(`${options.url}${path}`, {
        headers: options.mode === "nearby"
          ? { authorization: `Bearer ${tokens[clientIndex % tokens.length]}` }
          : {},
        signal: AbortSignal.timeout(options.timeout),
      });
      await response.arrayBuffer();
      if (measuring) {
        latencies.push(performance.now() - started);
        record(statuses, response.status);
      }
    } catch (cause) {
      if (measuring) record(errors, cause?.name === "TimeoutError" ? "timeout" : (cause?.cause?.code ?? cause?.name ?? "error"));
    } finally {
      inFlight -= 1;
    }
  }

  // Stagger client starts across one poll window, so requests arrive evenly rather than in
  // a thundering herd — that is how real clients behave, and herds flatter the server.
  const timers = [];
  for (let clientIndex = 0; clientIndex < options.clients; clientIndex += 1) {
    const rampDelay = (options.ramp * 1000 * clientIndex) / options.clients;
    const jitter = (options.interval * clientIndex) / options.clients;
    timers.push(setTimeout(() => {
      void fireOnce(clientIndex);
      timers.push(setInterval(() => void fireOnce(clientIndex), options.interval));
    }, rampDelay + jitter));
  }

  setTimeout(() => { measuring = true; }, options.ramp * 1000);
  const startedAt = performance.now();
  await new Promise((resolve) => setTimeout(resolve, (options.ramp + options.duration) * 1000));
  timers.forEach((timer) => { clearTimeout(timer); clearInterval(timer); });
  const measuredSeconds = (performance.now() - startedAt) / 1000 - options.ramp;

  // Let anything still in flight settle before reporting.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const sorted = latencies.slice().sort((a, b) => a - b);
  const ok = (statuses.get(200) ?? 0);
  const totalRecorded = latencies.length + [...errors.values()].reduce((sum, n) => sum + n, 0);
  const achievedRps = totalRecorded / measuredSeconds;

  console.log(`  ── results ─────────────────────────────────────────`);
  console.log(`  completed   ${totalRecorded} requests in ${measuredSeconds.toFixed(0)}s`);
  console.log(`  achieved    ${achievedRps.toFixed(1)} req/s  (offered ${offeredRps.toFixed(1)})`);
  console.log(`  peak in-flight  ${peakInFlight}`);
  console.log(``);
  console.log(`  latency     p50 ${ms(percentile(sorted, 50))}   p90 ${ms(percentile(sorted, 90))}   p99 ${ms(percentile(sorted, 99))}   max ${ms(sorted.at(-1) ?? 0)}`);
  console.log(``);
  console.log(`  statuses    ${[...statuses.entries()].sort((a, b) => a[0] - b[0]).map(([code, count]) => `${code}×${count}`).join("  ") || "none"}`);
  if (errors.size > 0) {
    console.log(`  errors      ${[...errors.entries()].map(([name, count]) => `${name}×${count}`).join("  ")}`);
  }
  console.log(``);

  // A verdict, so the numbers mean something without staring at them.
  const p99 = percentile(sorted, 99);
  const errorCount = totalRecorded - ok;
  const errorRate = totalRecorded === 0 ? 1 : errorCount / totalRecorded;
  const keepingUp = achievedRps >= offeredRps * 0.95;

  if (errorRate > 0.01) {
    console.log(`  VERDICT  over capacity — ${(errorRate * 100).toFixed(1)}% of requests failed.`);
  } else if (!keepingUp) {
    console.log(`  VERDICT  over capacity — the server could not absorb the offered rate.`);
  } else if (p99 > 2000) {
    console.log(`  VERDICT  at the edge — no failures, but p99 of ${ms(p99)} is past what feels instant.`);
  } else {
    console.log(`  VERDICT  comfortable at ${options.clients} clients. Raise --clients until this changes.`);
  }
  console.log(``);
}

main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exit(1);
});
