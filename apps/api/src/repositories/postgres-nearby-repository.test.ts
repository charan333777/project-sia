import { describe, expect, it } from "vitest";
import { PostgresNearbyRepository } from "./postgres-nearby-repository.js";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A minimal stand-in for `postgres`, recording each sweep and the statements it ran. */
function fakeSql() {
  const state = { sweeps: 0, statements: [] as string[], failNext: false };

  const transaction = async (strings: TemplateStringsArray) => {
    state.statements.push(strings.join("").trim());
    return [];
  };

  const sql = {
    begin: async (run: (t: typeof transaction) => Promise<unknown>) => {
      state.sweeps += 1;
      if (state.failNext) {
        state.failNext = false;
        throw new Error("connection lost");
      }
      await run(transaction);
    },
  };

  return { sql, state };
}

describe("nearby expiry sweep", () => {
  it("sweeps every expiring table on the first call", async () => {
    const { sql, state } = fakeSql();
    await new PostgresNearbyRepository(sql as never).pruneExpired();

    expect(state.sweeps).toBe(1);
    expect(state.statements).toHaveLength(4);
    for (const table of ["nearby_presence", "nearby_signals", "nearby_meet_plans", "nearby_connections"]) {
      expect(state.statements.some((statement) => statement.includes(table))).toBe(true);
    }
  });

  it("does not reach the database again inside the interval", async () => {
    const { sql, state } = fakeSql();
    const repository = new PostgresNearbyRepository(sql as never, 60_000);

    // A busy room: many polls arriving within the same minute.
    for (let index = 0; index < 50; index += 1) await repository.pruneExpired();

    expect(state.sweeps).toBe(1);
  });

  it("collapses a burst of concurrent polls into one sweep", async () => {
    const { sql, state } = fakeSql();
    const repository = new PostgresNearbyRepository(sql as never, 60_000);

    await Promise.all(Array.from({ length: 20 }, () => repository.pruneExpired()));

    expect(state.sweeps).toBe(1);
  });

  it("sweeps again once the interval has passed", async () => {
    const { sql, state } = fakeSql();
    const repository = new PostgresNearbyRepository(sql as never, 20);

    await repository.pruneExpired();
    await repository.pruneExpired();
    expect(state.sweeps).toBe(1);

    await wait(30);
    await repository.pruneExpired();
    expect(state.sweeps).toBe(2);
  });

  it("retries on the next call when a sweep fails", async () => {
    const { sql, state } = fakeSql();
    const repository = new PostgresNearbyRepository(sql as never, 60_000);

    state.failNext = true;
    await expect(repository.pruneExpired()).rejects.toThrow("connection lost");

    // The failure must not count as a completed sweep, or expired rows would survive a full
    // interval longer than intended.
    await repository.pruneExpired();
    expect(state.sweeps).toBe(2);
    expect(state.statements).toHaveLength(4);
  });
});
