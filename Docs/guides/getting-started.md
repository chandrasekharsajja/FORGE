# Getting Started with the AI Engineering Operating System

## Prerequisites
- Node.js 20+
- Docker & Docker Compose

## Quick Start Guide

1. **Clone Monorepo**:
   ```bash
   git clone https://github.com/aurexon/ai-engineering-os.git
   cd ai-engineering-os
   ```

2. **Start Infrastructure Stack**:
   ```bash
   docker-compose -f deploy/docker-compose.yml up -d
   ```

3. **Run Reference Implementation #1**:
   ```bash
   node test-jwt.js
   ```

> **Note on Test Output**: All benchmark scores and knowledge node metrics during pre-release harness tests are explicitly labeled as `simulatedOutput: true` until live model evaluation runs.
