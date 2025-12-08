import { describe, it, expect } from 'vitest';
import { config } from '../src/lib/config';

describe('server config', () => {
  it('should disable analytics by default', () => {
    // By default, our code uses ANALYTICS_ENABLED=false unless explicitly set in env
    expect(config.analyticsEnabled).toBe(false);
  });
});
