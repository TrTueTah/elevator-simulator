import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './test-app.js';
import type { FakeClock } from '../src/elevator/application/ports/fake-clock.js';

/** Read Server-Sent Events off a live stream until `wanted` have arrived. */
async function readEvents(
  url: string,
  wanted: number,
  trigger: () => void | Promise<void>,
): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const response = await fetch(url, {
    headers: { accept: 'text/event-stream' },
    signal: controller.signal,
  });
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: Record<string, unknown>[] = [];
  let buffer = '';

  const deadline = Date.now() + 5000;
  await trigger();

  while (events.length < wanted && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let split = buffer.indexOf('\n\n');
    while (split !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (line) events.push(JSON.parse(line.slice(6)) as Record<string, unknown>);
      split = buffer.indexOf('\n\n');
    }
  }

  controller.abort();
  return events;
}

describe('State stream', () => {
  let app: INestApplication;
  let clock: FakeClock;
  let baseUrl: string;

  beforeEach(async () => {
    ({ app, clock } = await createTestApp());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it('delivers a complete snapshot immediately on connect', async () => {
    const [first] = await readEvents(`${baseUrl}/api/simulation/stream`, 1, () => {});

    expect(first).toBeDefined();
    expect(first).toMatchObject({
      stepCount: expect.any(Number),
      status: 'running',
      speed: 1,
    });
    expect((first!.elevators as unknown[]).length).toBe(3); // guarantee S1
  });

  it('emits a fresh snapshot after every accepted command (SC-011)', async () => {
    const events = await readEvents(`${baseUrl}/api/simulation/stream`, 2, async () => {
      await fetch(`${baseUrl}/api/simulation/requests`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ floor: 5, direction: 'up' }),
      });
    });

    expect(events.length).toBeGreaterThanOrEqual(2);
    const latest = events[events.length - 1]!;
    expect(latest.pendingRequests).toHaveLength(1);
  });

  it('emits after every tick, with a non-decreasing step count (guarantee S2)', async () => {
    const events = await readEvents(`${baseUrl}/api/simulation/stream`, 4, () => {
      clock.advance(5);
    });

    const steps = events.map((event) => event.stepCount as number);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    }
  });
});
