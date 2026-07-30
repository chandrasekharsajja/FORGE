# FORGE Performance Benchmarking Specification

## Overview

This document specifies the performance benchmarking requirements, metrics, and procedures for validating FORGE against v1.0 claims. All benchmarks follow the methodology of establishing baseline measurements, setting thresholds, and verifying compliance before release candidates are approved.

## Benchmark Goals

The following performance targets must be validated before v1.0 final release:

| Metric | Target | Threshold | Measurement Method |
|--------|--------|-----------|-------------------|
| **API Response Time** (95th percentile) | < 200ms for simple queries, < 500ms for complex DAG planning | P95 ≤ 300ms / 750ms | Locust/Gatling load tests |
| **Concurrent Users Supported** | Minimum 1,000 concurrent active sessions | ≥ 1,000 users | Load test with auto-scaling |
| **Mission Planning Latency** (5-6 node DAG) | < 1.5 seconds end-to-end | ≤ 2.0 seconds | MissionTestHarness timing |
| **Message Throughput** (event bus) | ≥ 5,000 messages/sec | ≥ 4,000 msg/s | Stress test with high-volume events |
| **Memory Footprint** (per worker service) | < 150MB RSS memory | < 200MB RSS | Monitoring during sustained load |
| **Cold Start Time** (platform functions) | < 300ms warm, < 1.5s cold | Cold ≤ 2s | Timing after inactivity |
| **Database Query Latency** (PostgreSQL) | < 100ms for indexed reads, < 500ms for joins | P95 ≤ 150ms | pgbench + custom queries |

## Test Environment Configuration

### Hardware Specifications

```
Load Generator Machine:
  - CPU: 8 vCPUs (AWS c5.2xlarge equivalent)
  - Memory: 16 GB RAM
  - Network: 1 Gbps minimum
  
Target Infrastructure (Docker Compose / Kubernetes):
  - PostgreSQL: 4 vCPU, 8GB RAM, SSD storage
  - Redis: 2 vCPU, 4GB RAM (for session/cache)
  - Qdrant Vector DB: 4 vCPU, 8GB RAM
  - FORGE Platform Services: 2 vCPU each × 6 services = 12 vCPU total
  - Unified IDE Node: 2 vCPU, 4GB RAM (Next.js server)
```

### Environment Variables for Benchmarking

```env
# Enable benchmark mode (disables some non-critical features)
BENCHMARK_MODE=true

# Increase connection pools for load testing
PG_MAX_CONNECTIONS=200
REDIS_POOL_SIZE=100
EVENT_BUS_CONSUMERS=4

# Disable rate limiting during tests (controlled by test itself)
RATE_LIMIT_BYPASS=true

# Ensure deterministic behavior
NODE_ENV=production
TZ=UTC
LOG_LEVEL=info
```

## Benchmark Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Locust** | User scenario-based load testing (`locustfile.py`) | Python-based, easy to script realistic workflows |
| **Gatling** | HTTP request load testing (`perf-test.scala`) | Scala-based, detailed HTML reports |
| **pgbenchmark** | Database stress testing (`pgbench -c 50 -T 300`) | Built-in PostgreSQL tool |
| **k6** | Modern JavaScript/TypeScript scripting (`test.js`) | Can use TypeScript via transpiler |
| **Vitest + @vitest/cli** | Component-level performance benchmarks | Fast, within existing test suite |

## Benchmark Scenarios

### Scenario 1: API Endpoint Throughput

**Objective:** Verify that all REST/GraphQL APIs can handle expected concurrent loads without degradation.

**Test Script (Locust):**

```python
# tests/performance/api_throughput.py
from locust import HttpUser, task, between
import json

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def get_missions(self):
        self.client.get("/api/missions", headers={"Authorization": "Bearer test-token"})
    
    @task(3)
    def create_task(self):
        self.client.post("/api/tasks", json={
            "title": "Test Task",
            "description": "Automated benchmark"
        })
    
    @task(2)
    def update_status(self):
        self.client.put("/api/tasks/123", json={"status": "in_progress"})
```

**Expected Results:**
- At 500 concurrent users: All requests succeed with < 5% error rate
- At 1,000 concurrent users: P95 response time ≤ 300ms for GET, ≤ 500ms for POST

### Scenario 2: Mission Planning Performance

**Objective:** Validate MissionDAGPlanner meets the < 1.5 second target for 5-6 node parallel DAG generation.

**Test Implementation (Node.js):**

```javascript
// tests/benchmarks/mission-planning.test.ts
import { describe, it, expect } from 'vitest';
import { MissionDAGPlanner } from '@sajja/forge-mission-runtime';

describe('MissionDAGPlanner Performance', () => {
  it('should generate 5-6 node DAG within target time', async () => {
    const planner = new MissionDAGPlanner();
    const startTime = performance.now();
    
    // Generate parallel plan across architect, backend, frontend, database, docs roles
    const result = await planner.plan({
      nodes: 6,
      roles: ['architect', 'backend', 'frontend', 'database', 'docs', 'qa'],
      constraints: { maxParallelism: 4 }
    });
    
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(1500); // Target: < 1.5 seconds
    expect(result.success).toBe(true);
    expect(result.nodes.length).toBeGreaterThanOrEqual(5);
  });

  it('should maintain performance under concurrency', async () => {
    const planner = new MissionDAGPlanner();
    const promises = Array.from({ length: 10 }, () => 
      planner.plan({ nodes: 5, roles: ['frontend', 'backend'] })
    );
    
    const start = performance.now();
    await Promise.all(promises);
    const duration = performance.now() - start;
    
    // Average per mission should still be reasonable even under concurrency
    expect(duration / 10).toBeLessThan(200); 
  });
});
```

**Expected Results:**
- Single request: < 1,500ms for 6-node DAG
- Concurrent (10 requests): Average < 200ms per request

### Scenario 3: Event Bus Capacity

**Objective:** Verify event bus can sustain required throughput for real-time collaboration.

**Test Setup:**

```bash
# Run event bus stress test with 5,000 events/sec
node --experimental-test-runner tests/integration/event-bus-load.test.ts \
  --max-events=50000 \
  --rate=5000 \
  --duration=60
```

### Scenario 4: Database Performance

**Objective:** Validate PostgreSQL query latency targets.

```bash
# Run pgbench with appropriate scale
cd /var/lib/postgresql
pgbench -U forge_user -d forge_db -c 50 -T 300 -M prepared \
  --function-time \
  --log-min-statistics=100
```

**Expected Metrics:**
- tpmC (transactions per minute C): ≥ 5000
- Avg. txns including fetching: ≤ 150ms

## Reporting & Compliance

### Benchmark Report Template

All benchmarks produce standardized reports in `results/benchmarks/<date>/`:

```
results/
├── 2026-07-30-api-throughput/
│   ├── report.html         # Gatling/Locust HTML report
│   ├── metrics.json        # Raw metrics data
│   └── threshold_check.txt # Pass/fail status
├── 2026-07-30-mission-planning/
│   ├── results.log
│   └── compliance.json
└── 2026-07-30-database/
    └── pgbench_output.log
```

### Compliance Checklist for Release Approval

Before any release candidate is approved, the following MUST pass:

- [ ] All individual metric targets met (see table above)
- [ ] Error rate < 1% at target load levels
- [ ] No memory leaks detected during sustained run (> 30 min)
- [ ] Recovery from load spikes graceful (no cascading failures)
- [ ] Database connections remain healthy under peak load
- [ ] All benchmark results documented and archived

### Fallback Procedures

If benchmarks fail to meet targets:

1. **Immediate Action:** Roll back to previous stable release candidate
2. **Diagnosis:** Identify bottleneck using profiling tools (pprof, Chrome DevTools, etc.)
3. **Optimization:** Implement fixes targeting the specific bottleneck
4. **Re-run:** Re-validate with same benchmark configuration
5. **Documentation:** Record findings in `Docs/quality/performance-debt.md` if not resolved

## Maintenance & Ongoing Monitoring

Once deployed, continuous monitoring should track these production metrics:

- Real-time dashboard: Grafana/Prometheus for API latency, error rates, resource utilization
- Automated alerts on P95 breaches exceeding configured thresholds
- Weekly load testing sweep on staging environment
- Quarterly full benchmark recertification before major releases

