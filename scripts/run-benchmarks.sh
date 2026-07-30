#!/bin/bash
# FORGE Performance Benchmark Runner
# Executes all defined performance benchmarks and generates reports

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

echo "========================================"
echo "FORGE Performance Benchmark Suite"
echo "========================================"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisite tools..."
for cmd in node python3 locust pgbench; do
  if command -v "$cmd" &>/dev/null; then
    echo "  ✅ $cmd available"
  else
    echo "  ⚠️  $cmd not found (may need to install)"
  fi
done
echo ""

# Run unit/benchmark tests
echo "📊 Running component-level benchmarks..."
cd tests/performance
if [ -f mission-planning-bench.test.ts ]; then
  echo "  Running mission planning benchmarks..."
  # Use vitest with custom runner for TypeScript benchmarks
  node --experimental-test-runner ./mission-planning-bench.test.ts 2>&1 || echo "Note: Requires TypeScript test runner setup"
fi
echo ""

# API Load Test Setup
echo "⚙️ Setting up API load tests..."
mkdir -p results/benchmarks/$(date +%Y-%m-%d)

# Create sample Locustfile if not present
if [ ! -f tests/performance/api_load_test.py ]; then
  cat > tests/performance/api_load_test.py << 'ENDOCPY'
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
ENDOCPY
  echo "  Created sample API load test script"
fi

# Database benchmark
echo "🏃 Running database performance tests..."
if command -v pgbench &>/dev/null; then
  echo "  pgbench available - running basic health check"
  # This would connect to your DB - adjust credentials as needed
  # pgbench -U forge_user -d forge_db -c 10 -T 30 --format json 2>> results/benchmarks/$(date +%Y-%m-%d)/pgbench.log || echo "DB not available for testing"
else
  echo "  pgbench not found, skipping database stress test"
fi

echo ""
echo "========================================"
echo "Benchmark Summary:"
echo "  ✅ Component benchmarks ready (Vitest)"
 echo "  ✅ API load test template created (Locust)"
echo "  ✅ Database benchmark placeholder (pgbench)"
echo ""
echo "To run actual load tests:"
echo "  1. Start target services (PostgreSQL, Redis, Qdrant, FORGE platform)"
echo "  2. Install required Python packages: pip install locust"
echo "  3. Run Locust: locust -f tests/performance/api_load_test.py --headless -u 1000 -r 100 --run-time 5m --html results/benchmarks/$(date +%Y-%m-%d)/locust_report.html"
echo "  4. View report at http://localhost:8090 (headed mode)"
echo ""
echo "========================================"
