import { beforeEach, describe, expect, it } from 'vitest';
import { Doors, DWELL_TICKS } from './doors.js';

describe('Doors', () => {
  let doors: Doors;

  beforeEach(() => {
    doors = new Doors();
  });

  const openFully = () => {
    doors.beginOpening();
    doors.tick(); // opening -> open
  };

  it('starts closed', () => {
    expect(doors.phase).toBe('closed');
    expect(doors.areClosed()).toBe(true);
  });

  it('walks closed -> opening -> open -> closing -> closed (FR-032)', () => {
    doors.beginOpening();
    expect(doors.phase).toBe('opening');

    doors.tick();
    expect(doors.phase).toBe('open');
    expect(doors.dwellRemaining).toBe(DWELL_TICKS);

    for (let i = 0; i < DWELL_TICKS; i += 1) doors.tick();
    expect(doors.phase).toBe('closing');

    doors.tick();
    expect(doors.phase).toBe('closed');
  });

  it('closes automatically once the dwell elapses (FR-036)', () => {
    openFully();
    for (let i = 0; i < DWELL_TICKS + 1; i += 1) doors.tick();
    expect(doors.areClosed()).toBe(true);
  });

  it('stays open indefinitely while held (FR-037)', () => {
    openFully();
    doors.hold();

    for (let i = 0; i < 50; i += 1) doors.tick();

    expect(doors.phase).toBe('open');
    expect(doors.isHeld).toBe(true);
  });

  it('restarts the dwell when the hold is released (FR-038)', () => {
    openFully();
    doors.hold();
    for (let i = 0; i < 20; i += 1) doors.tick();

    doors.releaseHold();
    expect(doors.dwellRemaining).toBe(DWELL_TICKS);

    for (let i = 0; i < DWELL_TICKS - 1; i += 1) doors.tick();
    expect(doors.phase).toBe('open'); // not yet
    doors.tick();
    expect(doors.phase).toBe('closing');
  });

  it('closes immediately, overriding hold and remaining dwell (FR-039)', () => {
    openFully();
    doors.hold();
    expect(doors.dwellRemaining).toBe(DWELL_TICKS);

    doors.closeNow();

    expect(doors.phase).toBe('closing');
    expect(doors.isHeld).toBe(false);
    doors.tick();
    expect(doors.areClosed()).toBe(true);
  });

  it('leaves one well-defined state however hold and close interleave (FR-040)', () => {
    openFully();

    doors.hold();
    doors.closeNow();
    doors.hold(); // ignored: closing has already begun
    doors.hold();

    expect(doors.phase).toBe('closing');
    expect(doors.isHeld).toBe(false);

    doors.tick();
    expect(doors.phase).toBe('closed');
  });

  it('re-opens already-open doors by restarting the dwell (FR-029)', () => {
    openFully();
    doors.tick();
    doors.tick();
    expect(doors.dwellRemaining).toBeLessThan(DWELL_TICKS);

    doors.beginOpening();

    expect(doors.phase).toBe('open');
    expect(doors.dwellRemaining).toBe(DWELL_TICKS);
  });
});
