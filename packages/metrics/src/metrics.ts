/**
 * @sajja/forge-metrics - Application Observability Metrics Collection
 * 
 Provides a simple metrics collection system for FORGE services, supporting
 Prometheus-style counters, histograms, and gauges with optional OpenTelemetry export.
 */

import { createMemoryService } from '@platform/memory-service';

// ==================== METRIC TYPES ====================

interface Counter {
  name: string;
  description: string;
  labels: Record<string, string>;
  value: number;
}

interface Histogram {
  name: string;
  description: string;
  labels: Record<string, string>;
  values: number[];
  buckets: [number, number][]; // [min, max] => count
}

interface Gauge {
  name: string;
  description: string;
  labels: Record<string, string>;
  value: number;
}

// ==================== METRICS SERVICE ====================

class MetricsService {
  private counters = new Map<string, Counter>;
  private histograms = new Map<string, Histogram>;
  private gauges = new Map<string, Gauge>;
  private memoryService: any;

  constructor() {
    this.memoryService = createMemoryService();
  }

  /** Generate unique metric key from name and labels */
  private makeKey(name: string, labels?: Record<string, string>): string {
    const labelStr = labels ? Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`).join('|') : '';
    return `${name}${labelStr ? '(' + labelStr + ')' : ''}`;
  }

  // Counter operations

  counter(name: string, description: string = ''): Counter {
    const key = this.makeKey(name);
    if (!this.counters.has(key)) {
      this.counters.set(key, { name, description, labels: {}, value: 0 });
    }
    return this.counters.get(key)!;
  }

  increment(name: string, labels?: Record<string, string>, amount: number = 1): void {
    const counter = this.counter(name);
    counter.value += amount;
    counter.labels = labels || {};
  }

  // Histogram operations

  histogram(name: string, description: string = '', buckets: [number, number][] = [
    [0, 10], [10, 50], [50, 100], [100, 500], [500, 1000], [1000, 5000], [5000, Infinity]
  ]): Histogram {
    const key = this.makeKey(name);
    if (!this.histograms.has(key)) {
      const histogram: Histogram = {
        name,
        description,
        labels: {},
        values: [],
        buckets: buckets.map(b => [...b]) // Copy
      };
      this.histograms.set(key, histogram);
    }
    return this.histograms.get(key)!;
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histogram(name);
    histogram.values.push(value);
    histogram.labels = labels || {};
    
    // Update bucket counts
    const bucketIndex = histogram.buckets.findIndex(([min, max]) => value >= min && value < max);
    if (bucketIndex === -1) {
      // Last bucket catches infinity
      histogram.buckets[histogram.buckets.length - 1][1]++;
    } else {
      histogram.buckets[bucketIndex][1]++;
    }
  }

  // Gauge operations

  gauge(name: string, description: string = '', value: number = 0): Gauge {
    const key = this.makeKey(name);
    if (!this.gaues.has(key)) {
      this.gaues.set(key, { name, description, labels: {}, value });
    }
    return this.gaues.get(key)!;
  }

  set(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauge(name);
    gauge.value = value;
    gauge.labels = labels || {};
  }
}

// ==================== INSTANCES ====================

let _metricsService: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!_metricsService) {
    _metricsService = new MetricsService();
  }
  return _metricsService;
}

// Convenience functions for common metrics

export function incrementCounter(name: string, labels?: Record<string, string>, amount: number = 1): void {
  getMetricsService().increment(name, labels, amount);
}

export function observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
  getMetricsService().observe(name, value, labels);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  getMetricsService().set(name, value, labels);
}

// Export types
export type { Counter, Histogram, Gauge };
