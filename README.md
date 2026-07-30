# FORGE AI Engineering Operating System

FORGE is a public monorepo for an AI-assisted software engineering workspace developed by **Sajja** (Software Architecture, Jobs, Journeys & Automation). The repo combines three core components:

1. A polished unified IDE shell in [`apps/unified-ide`](apps/unified-ide) - Public-facing mission cockpit and editor shell
2. TypeScript package prototypes that model the platform architecture (`packages/*`)
3. Ten console-driven integration scenarios that exercise product story end-to-end against the live service layer

As of July 2026, FORGE represents a strong product shell plus architectural scaffolding, designed to enable continuous software work through planning, execution, review, verification, and provenance.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/sajja/forge-monorepo.git
cd forge-monorepo

# Install dependencies
npm install

# Launch the unified IDE shell (development mode)
npm run dev:studio

# Run all integration test scenarios
npm test
```

---

## 📋 Prerequisites

Before installing and running FORAGE, ensure you have the following installed:

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| **Node.js** | 18.19.x - 20.x LTS | Required for monorepo support via npm workspaces |
| **npm** | 9.x or higher | Bundled with Node.js |
| **PostgreSQL** | 15.x | Database for persistent storage |
| **Redis** | 7.x | Session caching and rate limiting |
| **Qdrant** | Latest | Vector database for memory/search services |
| **Docker Compose** | Optional | For local service deployment |

---

## 🔧 Installation Steps

### Step 1: Clone the Repository

```bash
git clone --depth 1 https://github.com/sajja/forge-monorepo.git
cd forge-monorepo
```

The `--depth 1` flag creates a shallow clone to reduce download size. Remove it if you need full git history.

### Step 2: Install Dependencies

```bash
npm ci           # Clean install from package-lock.json (recommended)
# OR
npm install      # Fresh installation
```

This installs all workspaces (`apps/*`, `packages/*`, `services/*`) and their dependencies.

### Step 3: Configure Environment

Copy the environment template and customize it:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration values
nano .env.local
```

**Important**: Never commit `.env.local` to version control - it's already in `.gitignore`.

### Step 4: Start Local Services (Optional)

For full functionality, start required backend services. You can use Docker Compose or manual startup:

**Using Docker Compose:**

```bash
# Ensure docker-compose.yaml is in place (see Docs/governance/)
docker-compose up -d postgres redis qdrant
```

**Manual Service Startup:**

```bash
# Start PostgreSQL (adjust credentials as needed)
brew services start postgresql

# Start Redis
redis-server &

# Start Qdrant
docker run -d -p 6334:6334 --name qdrant qdrant/qdrant:latest
```

### Step 5: Verify Setup

Run type checking and linting to verify your installation:

```bash
npm run type-check     # TypeScript compilation checks
npm run lint           # ESLint with auto-fix
npm run format:check   # Prettier formatting validation
```

---

## 🏗️ Project Structure

```
forge-monorepo/
├── apps/                  # Application entry points
│   └── unified-ide/       # Next.js-based IDE shell (React + TypeScript)
├── packages/              # Shared TypeScript packages
│   ├── contracts/         # Interface definitions and schemas
│   ├── core-agent/        Planner/coder/reviewer state primitives
│   ├── mission-runtime/   Mission DAG helpers
│   ├── sdks/              Developer SDK suite
│   ├── platform-runtime   Platform runtime services
│   └── security/          Security utilities and scanners
├── services/              Microservice implementations
│   ├── orchestrator/      Temporal workflow coordination
│   ├── execution-engine/  Sandbox execution
│   ├── memory-service/    Memory abstractions
│   └── observability/     Metrics, logging, tracing
├── tests/                 Integration and E2E test suites
├── Docs/                  Comprehensive documentation
│   └── governance/        Release policies, hardening gates, etc.
├── .github/workflows/     CI/CD pipeline configurations
├── .husky/                Git hooks (commit-msg, pre-commit)
├── scripts/               Utility scripts (changelog generation, version bumping)
├── release/               Release candidate artifacts
├── package.json           Monorepo root configuration
├── tsconfig.base.json     Shared TypeScript config
└── CHANGELOG.md           Release changelog
```

---

## 🎯 Development Targets

### Unified IDE Shell

The primary user interface is the Next.js application at `apps/unified-ide`:

```bash
# Start development server
npm run dev:studio

# Build for production
npm run build:studio

# Start production build
npm start:studio
```

The IDE serves on `http://localhost:3000` by default.

### Integration Test Scenarios

All ten reference implementations can be executed via the test runner:

```bash
# Run all integration scenarios
npm test

# Run specific scenario
npm run test:jwt    # JWT Authentication
npm run test:crud   # CRUD REST API
npm run test:k8s    # Kubernetes deployment
npm run test-oauth  # OAuth login
```

Each test script validates a different aspect of the FORGE platform architecture against live services.

---

## 🔐 Security Configuration

### CSRF Protection

FORGE implements robust CSRF protection in `apps/unified-ide/src/lib/csrf-protection.ts`:

- **Token Generation**: UUID v4 + random string
- **Storage**: HTTP-only, SameSite=Strict cookies with 24-hour TTL
- **Validation**: Fingerprint-based binding (IP, User-Agent, Accept-Language)
- **Rate Limiting**: 5 attempts per minute per IP address

Configure via environment variables:

```env
ENABLE_CSRF=true       # Enable/disable CSRF protection
COOKIE_DOMAIN=.example.com  # Domain for cookie scope (optional)
```

### JWT Authentication

Secret management for JWT tokens:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
# Generate with: openssl rand -hex 32
```

---

## 📝 Documentation Contribution

### Writing New Documentation

Place new documentation under `Docs/` following this structure:

```text
Docs/
├── getting-started/      # Beginner guides
├── architecture/         # Architectural patterns
├── governance/           # Policies, release processes
├── capability-fabric/    # Capability system docs
└── quality/              # Quality assurance guidelines
```

Each document should follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format when documenting changes.

### Generating Changelog

Automatically generate changelog entries based on conventional commits:

```bash
# Update changelog with unreleased commits
npm run generate-changelog

# Generate a versioned section for release
npm run generate-changelog version 1.0.0
```

The script respects Conventional Commits format: `type(scope): description`

---

## 🚀 Releasing a Version

Follow these steps for a formal release:

1. **Bump version number** (auto-increment patch/minor/major):
   ```bash
   ./scripts/bump-version.sh patch    # v0.9.0-rc1 → v0.9.0-rc2
   ./scripts/bump-version.sh minor    # v0.9.x → v1.0.0
   ./scripts/bump-version.sh major    # v1.x → v2.0.0
   ```

2. **Update changelog**:
   ```bash
   npm run generate-changelog version 1.0.0
   ```

3. **Create git tag**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump to v1.0.0"
   git tag -a v1.0.0 -m "FORGE AI Engineering OS v1.0.0 Stable"
   git push origin main --tag
   ```

4. **Build and test**:
   ```bash
   npm run test:ci        # Full CI pipeline check
   npm run build:studio   # Build the IDE application
   ```

5. **Archive release artifacts** to `release/rcX/` directory.

---

## 🤝 Contributing

Welcome to FORGE! To contribute:

1. Fork the repository and create a feature branch
2. Make your changes following Conventional Commits format
3. Add appropriate unit/integration tests
4. Update documentation if needed
5. Submit a pull request

Your PR will go through automated testing including:
- ESLint and Prettier formatting
- TypeScript type checking
- Unit and integration test coverage
- Security scanning for secrets and vulnerabilities

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## 🛡️ Governance & Policies

FORGE follows rigorous governance practices documented in `Docs/governance/`:

- **Hardening Gates**: 5 gate criteria for release candidates
- **Release Policy**: Versioning strategy and milestone roadmap
- **Incident Response**: Security incident handling procedures
- **Project Governance**: Decision-making frameworks and roles

---

## 📊 Quality Metrics

CI Pipeline performs the following checks on every PR:

1. **Lint Check**: ESLint with auto-fix applied
2. **Formatting**: Prettier compliance validation
3. **Type Checking**: TypeScript compilation with strict flags
4. **Unit Tests**: Vitest test suite execution
5. **Security Scan**: Dependency vulnerability audit (`npm audit`)
6. **Secret Detection**: Hardcoded credential scanning

All checks must pass before merge approval.

---

## 📄 License

FORGE is licensed under [Apache License 2.0](LICENSE). See the license file for terms governing use, modification, and distribution.

---

**Version**: 0.9.0-rc1  
**Last Updated**: July 2026  
**Maintained by**: Sajja (Software Architecture, Jobs, Journeys & Automation)
