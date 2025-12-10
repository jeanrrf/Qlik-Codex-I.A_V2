import { describe, expect, test, vi, afterEach } from 'vitest';
import { sseEmitter } from '../../src/lib/sseEmitter';

// Fake Response object minimal for testing

function createFakeResponse() {
  const write = vi.fn();
  const end = vi.fn();
  const setHeader = vi.fn();
  const flushHeaders = vi.fn();
  const on = vi.fn((event: string, cb: Function) => {
    // store but do nothing
  });
  return { write, end, setHeader, flushHeaders, on, writableEnded: false, destroyed: false } as any;
}

describe('SSEEmitter', () => {
  afterEach(() => {
    // Reset internal state
    sseEmitter.destroy();
  });

  test('sendSubStepProgress should only send to current client (not all)', () => {
    const clientA = createFakeResponse();
    const clientB = createFakeResponse();

    sseEmitter.addClient(clientA);
    sseEmitter.addClient(clientB);

    sseEmitter.setCurrentClient(clientA);

    sseEmitter.sendSubStepProgress('opt', 'sub_1', 'test', 'running');

    expect(clientA.write).toHaveBeenCalled();
    expect(clientB.write).not.toHaveBeenCalled();
  });

  test('sendStepProgress should only send to current client (not all)', () => {
    const clientA = createFakeResponse();
    const clientB = createFakeResponse();

    sseEmitter.addClient(clientA);
    sseEmitter.addClient(clientB);

    sseEmitter.setCurrentClient(clientB);

    sseEmitter.sendStepProgress('opt', 'Main Step', 'running');

    expect(clientB.write).toHaveBeenCalled();
    expect(clientA.write).not.toHaveBeenCalled();
  });
});
