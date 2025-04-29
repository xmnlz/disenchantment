import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Client } from "discord.js";
import type { GuardFn, NextFn } from "../src/guard";
import { composeGuards, guards } from "../src/guard";

const createMockClient = (): Client =>
  ({ user: { username: "MockBot" } }) as Client;

describe("composeGuards()", () => {
  let client: Client;
  let interaction: any;
  let next: NextFn & ((...args: any[]) => Promise<void>);
  let context: Record<string, any>;

  beforeEach(() => {
    client = createMockClient();
    interaction = { id: "test-interaction" };
    next = mock().mockResolvedValue(undefined) as any;
    context = {};
  });

  test("calls next() when no guards are provided", async () => {
    const composed = composeGuards([]);
    await composed(client, interaction, next, context);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("executes a single guard then calls next()", async () => {
    const guard: GuardFn = mock(async (_c, _i, nextFn) => {
      await nextFn();
    });
    const composed = composeGuards(guards(guard));
    await composed(client, interaction, next, context);

    expect(guard).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("executes multiple guards in sequence", async () => {
    const order: string[] = [];

    const guard1: GuardFn = mock(async (_c, _i, nextFn, ctx) => {
      order.push("1");
      ctx.a = true;
      await nextFn();
    });
    const guard2: GuardFn = mock(async (_c, _i, nextFn, ctx) => {
      order.push("2");
      ctx.b = true;
      await nextFn();
    });

    const composed = composeGuards(guards(guard1, guard2));
    await composed(client, interaction, next, context);

    expect(order).toEqual(["1", "2"]);
    expect(context).toEqual({ a: true, b: true });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("stops chain if a guard never calls next()", async () => {
    const guardA: GuardFn = mock(async () => {
      /* no next() */
    });
    const guardB: GuardFn = mock(async (_c, _i, nextFn) => {
      await nextFn();
    });

    const composed = composeGuards(guards(guardA, guardB));
    await composed(client, interaction, next, context);

    expect(guardA).toHaveBeenCalledTimes(1);
    expect(guardB).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("throws if next() is called more than once within a single guard", async () => {
    const guard: GuardFn = mock(async (_c, _i, nextFn) => {
      await nextFn();
      await nextFn();
    });

    const composed = composeGuards(guards(guard));

    expect(composed(client, interaction, next, context)).rejects.toThrow(
      /next\(\) called multiple times in guard at index 0/,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("preserves and mutates context across guards", async () => {
    type Ctx = { x?: boolean; y?: boolean };

    const guardX: GuardFn<any, Ctx> = mock(async (_c, _i, nextFn, ctx) => {
      ctx.x = true;
      await nextFn();
    });
    const guardY: GuardFn<any, Ctx> = mock(async (_c, _i, nextFn, ctx) => {
      ctx.y = true;
      await nextFn();
    });

    const composed = composeGuards(guards(guardX, guardY));
    const customCtx: Ctx = {};
    await composed(client, interaction, next, customCtx);

    expect(customCtx).toEqual({ x: true, y: true });
  });

  test("works correctly with an initially empty context object", async () => {
    const guard: GuardFn = mock(async (_c, _i, nextFn, ctx) => {
      expect(ctx).toEqual({});
      await nextFn();
    });

    const composed = composeGuards(guards(guard));
    await composed(client, interaction, next, {});
    expect(guard).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
