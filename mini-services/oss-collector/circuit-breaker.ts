// ============================================================================
// oss-collector — Circuit Breaker Pattern
// Prevents cascading failures when a vendor OSS becomes unresponsive
// ============================================================================

import type { CircuitBreakerConfig, CircuitBreakerState, CircuitState } from './types';
import { CIRCUIT_BREAKER_DEFAULTS } from './types';

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private openedAt: string | null = null;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private halfOpenAttempts = 0;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...CIRCUIT_BREAKER_DEFAULTS, ...config };
  }

  /**
   * Execute an operation through the circuit breaker.
   * Returns the result or throws if the circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half_open');
      } else {
        throw new Error(
          `Circuit breaker OPEN for ${this.openedAt ? `since ${this.openedAt}` : 'unknown duration'}. ` +
          `Reset in ${this.getRemainingResetMs()}ms.`
        );
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /** Whether the circuit allows execution */
  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half_open') return true;
    if (this.state === 'open' && this.shouldAttemptReset()) return true;
    return false;
  }

  private recordSuccess(): void {
    this.consecutiveSuccesses++;
    this.totalSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessAt = new Date().toISOString();

    if (this.state === 'half_open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.transitionTo('closed');
      }
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    this.totalFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureAt = new Date().toISOString();

    if (this.state === 'half_open') {
      this.transitionTo('open');
    } else if (this.state === 'closed' && this.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return true;
    const elapsed = Date.now() - new Date(this.openedAt).getTime();
    return elapsed >= this.config.resetTimeoutMs;
  }

  private getRemainingResetMs(): number {
    if (!this.openedAt) return 0;
    const elapsed = Date.now() - new Date(this.openedAt).getTime();
    return Math.max(0, this.config.resetTimeoutMs - elapsed);
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.openedAt = new Date().toISOString();
      this.halfOpenAttempts = 0;
      console.warn(`[circuit-breaker] OPENED after ${this.consecutiveFailures} consecutive failures`);
    } else if (newState === 'half_open') {
      this.halfOpenAttempts = 0;
      console.log(`[circuit-breaker] HALF-OPEN — allowing ${this.config.halfOpenMaxAttempts} test requests`);
    } else if (newState === 'closed') {
      this.consecutiveFailures = 0;
      this.halfOpenAttempts = 0;
      console.log(`[circuit-breaker] CLOSED — normal operation resumed`);
    }
  }

  getState(): CircuitBreakerState {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenAttempts = 0;
    console.log(`[circuit-breaker] Manually RESET to closed`);
  }
}

/** Map of vendor → circuit breaker instances */
export type CircuitBreakerMap = Map<string, CircuitBreaker>;

export function createCircuitBreakerMap(): CircuitBreakerMap {
  return new Map();
}

export function getOrCreateBreaker(map: CircuitBreakerMap, key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!map.has(key)) {
    map.set(key, new CircuitBreaker(config));
  }
  return map.get(key)!;
}