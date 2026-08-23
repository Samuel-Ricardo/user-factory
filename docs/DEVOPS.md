# DevOps & Infrastructure Documentation - User Factory

## Executive Summary

This document provides a comprehensive analysis of the DevOps infrastructure for the user-factory project, a Node.js/TypeScript REST API with PostgreSQL backend. The project employs containerization with Docker Compose, Prisma ORM for database management, and modern JavaScript tooling for code quality enforcement.

---

## 1. Container Strategy

### Current Dockerfile Analysis

```dockerfile
FROM node:18.16.0-slim

WORKDIR /home/node/app

RUN apt update && apt install make

COPY . ./

RUN npm install

USER node

RUN chown $USER:$USER -R /home/node/app/prisma 
RUN chown $USER:$USER -R /home/node/app/node_modules/.prisma/client

CMD ["npm", "run", "docker:startup"]
```

#### Strengths
- Uses official Node.js base image (18.16.0-slim) - relatively lightweight
- Implements multi-user setup with non-root `node` user
- Working directory set to `/home/node/app`

#### Critical Issues & Optimization Opportunities

| Issue | Severity | Impact | Recommendation |
|-------|----------|--------|----------------|
| **Single-stage build** | High | Bloated image size, dev dependencies in production | Implement multi-stage build separating build and runtime |
| **apt update without cleanup** | Medium | Layer bloat, unnecessary packages | Add `&& rm -rf /var/lib/apt/lists/*` and combine with install |
| **Copy all files before install** | High | Cache invalidation on code change | Copy package.json first, install deps, then copy source |
| **No .dockerignore** | High | Potential secrets leakage, larger build context | Create .dockerignore to exclude .env, node_modules, git, etc. |
| **make installed at runtime** | Medium | Unnecessary in production | Install make only in build stage |
| **Missing health checks** | High | Container orchestration can't detect unhealthy state | Add HEALTHCHECK instruction |
| **Fixed Node version** | Medium | Security patches require rebuild | Pin to `node:18-slim` with version pin in CI or use `node:18.16.0-slim@sha256:...` |
| **No production optimizations** | Medium | Missing build optimizations | Add `NODE_ENV=production` and prune dev dependencies |

### Optimized Multi-Stage Dockerfile

```dockerfile
# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y make && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development && \
    npx prisma generate

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache make

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Expected Improvements
- Image size reduction: ~50-70% (from ~1GB to ~200-300MB)
- Faster CI/CD builds due to better layer caching
- Security: Minimal attack surface with Alpine base and non-root user
- Reproducibility: Explicit dependency management

---

## 2. Docker Compose Services Architecture

### Current Architecture

```yaml
version: "3"

services:
  app:
    build: .
    ports:
      - 3000:3000
    volumes:
      - .:/home/node/app
    depends_on:
      - postgres

  tests:
    container_name: application_tests
    build: .
    command: npm run coverage
    volumes:
      - .:/home/node/app
    depends_on:
      - app

  postgres:
    container_name: postgres_container
    image: postgres
    restart: always
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin}
      PGDATA: /data/postgres
    volumes:
      - .docker/postgres:/data/postgres
    ports:
      - 5432:5432

  pgadmin:
    container_name: pgadmin_container
    image: dpage/pgadmin4
    restart: always
    depends_on:
      - postgres
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL:-pgadmin4@pgadmin.org}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD:-admin}
      PGADMIN_CONFIG_SERVER_MODE: "False"
    volumes:
      - .docker/pgadmin:/database/admin/pgadmin
    ports:
      - "${PGADMIN_PORT:-5050}:80"
```

#### Architecture Analysis

**Services Overview:**
1. **app** - Main application service (Node.js/Express)
2. **tests** - Testing service (runs coverage separately)
3. **postgres** - PostgreSQL database (15.x default)
4. **pgadmin** - Database management UI

#### Strengths
- Clear service separation
- Volume persistence for database and pgadmin
- Environment variable configuration
- Database admin UI for development

#### Critical Issues

| Issue | Severity | Risk |
|-------|----------|------|
| **Volume mounts in app service** | High | Breaks container immutability, dev only |
| **No health checks** | High | No dependency readiness detection |
| **No resource limits** | Medium | Potential resource exhaustion |
| **PostgreSQL image tag unspecified** | High | Version drift, breaking changes |
| **Tests service depends on app** | Medium | Circular dependency risk |
| **pgadmin exposed with default credentials** | Critical | Security vulnerability |
| **No network isolation** | Medium | All services share default network |
| **No restart policies for app/tests** | Medium | Manual recovery required |
| **Environment file loaded for postgres** | High | Secrets in environment files |

### Recommended Docker Compose

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    networks:
      - backend

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-userfactory}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5432:5432"  # Only expose locally
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
    networks:
      - backend

  pgadmin:
    image: dpage/pgadmin4:7
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: "False"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    ports:
      - "127.0.0.1:5050:80"  # Restrict to localhost
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - dev  # Only start with --profile dev
    networks:
      - backend

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  backend:
    driver: bridge
```

---

## 3. Database Management

### Prisma Configuration

**Schema:**
```prisma
model User {
  id       String @id @default(uuid())
  name     String
  username String @unique
  email    String @unique

  @@map("users")
}
```

### Current Makefile Database Commands

```makefile
startup:
	make setup_database && npm run start:dev

setup_database:
	npx prisma generate && npx prisma db push && make migration

migration:
	npx prisma migrate deploy
```

#### Database Workflow Analysis

**Current Flow:**
1. `prisma generate` - Generates Prisma Client
2. `prisma db push` - Pushes schema changes directly to database
3. `prisma migrate deploy` - Applies pending migrations

### Issues & Recommendations

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Using `db push` in development | Medium | Use migrations consistently for all environments |
| No seed data management | Medium | Add `prisma db seed` workflow |
| No migration rollback strategy | High | Document and test rollback procedures |
| No database backups | Critical | Implement automated backup strategy |
| Migrations run at startup | Medium | Separate migration step from application startup |
| No connection pooling config | Medium | Configure Prisma connection pool |
| No database health checks | High | Add database connectivity health check |

### Recommended Database Workflow

```makefile
# Development workflow
dev: setup_db
	npm run start:dev

# Production workflow
prod: migrate_deploy
	npm start

# Database setup with migrations
setup_db:
	npx prisma generate
	npx prisma migrate dev --name init
	npx prisma db seed

# Production migrations
migrate_deploy:
	npx prisma generate
	npx prisma migrate deploy

# Database reset (development only)
reset_db:
	npx prisma migrate reset --force
	npx prisma db seed

# Seed database
seed:
	npx prisma db seed

# Check database health
db_health:
	npx prisma db pull
	npx prisma validate
```

### Prisma Configuration Improvements

```javascript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["referentialIntegrity"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_DIRECT_URL") // For migrations
}

// Add indexes for common queries
model User {
  id        String   @id @default(uuid())
  name      String
  username  String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
  @@index([email])
  @@index([username])
}
```

### Database Best Practices

1. **Connection Management**
   - Use Prisma connection pooling: `connection_limit` in DATABASE_URL
   - Example: `postgresql://user:pass@host:5432/db?connection_limit=10`

2. **Migration Strategy**
   - Always create migrations for production
   - Test migrations on staging with production-like data
   - Keep migrations reversible when possible

3. **Backup Strategy**
   ```bash
   # PostgreSQL backup
   pg_dump -h localhost -U user userfactory > backup_$(date +%Y%m%d).sql
   
   # Automated backup script
   # Add to cron or Docker healthcheck
   ```

4. **Monitoring**
   - Track slow queries
   - Monitor connection pool usage
   - Set up alerts for database errors

---

## 4. Environment Configuration Strategy

### Current Environment Files

- `.env` - Active environment file (committed with defaults)
- `.env.example` - Template
- `.env.test` - Test environment
- `.env.test.example` - Test template

### Current Configuration

```bash
# Database
DATABASE_URL="postgresql://admin:admin@postgres:5432/userfactory?schema=public"
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
PORT=3000
```

### Critical Security Issues

| Issue | Severity | Risk |
|-------|----------|------|
| Default credentials in .env | Critical | Exposed in git history |
| .env file committed to repo | Critical | Secrets leaked |
| No environment separation | High | Dev config in production |
| No secrets management | High | Plain text secrets |
| pgadmin credentials default | Critical | Brute force target |

### Recommended Environment Strategy

#### File Structure
```
.env.local          # Local development (gitignored)
.env.development    # Development defaults (committed)
.env.staging        # Staging environment
.env.production     # Production template (committed, no secrets)
.env.example        # Template for new developers
```

#### Environment Template (.env.example)
```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/userfactory?schema=public
DATABASE_DIRECT_URL=postgresql://user:password@postgres:5432/userfactory?schema=public
POSTGRES_USER=user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=userfactory

# Security
JWT_SECRET=change_me_in_production
SESSION_SECRET=change_me_in_production

# Optional
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

#### Secrets Management

**Development:**
- Use `.env.local` (gitignored)
- Provide `.env.example` as template

**Production:**
- Use Docker secrets or Kubernetes secrets
- Integrate with Vault, AWS Secrets Manager, or similar
- Never commit secrets to version control

#### Environment Validation

```typescript
// src/config/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // ... other validations
});

export const env = envSchema.parse(process.env);
```

---

## 5. CI/CD Pipeline Design

### Current State
- No GitHub Actions workflow detected
- No CI/CD pipeline configured
- Manual deployment process

### Recommended GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: userfactory_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/userfactory_test
          NODE_ENV: test
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/user-factory:latest
            ${{ secrets.DOCKER_USERNAME }}/user-factory:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        run: |
          # Deployment script for staging
          echo "Deploying to staging..."
```

### CI/CD Best Practices

1. **Pipeline Stages**
   - Lint → Type Check → Test → Security Scan → Build → Deploy
   - Parallelize independent jobs
   - Cache dependencies and build layers

2. **Quality Gates**
   - Code coverage minimum threshold (e.g., 80%)
   - No high-severity security vulnerabilities
   - All tests passing
   - TypeScript compilation successful

3. **Deployment Strategy**
   - Blue-green deployments for zero downtime
   - Canary releases for gradual rollout
   - Automated rollback on health check failures

---

## 6. Pre-commit Hooks

### Current Configuration

**Husky hooks:**
- `pre-commit`: Runs `lint-staged`
- `pre-push`: Runs coverage and build

**lint-staged:**
```json
{
  "*.ts": ["npm run lint", "npm run pretty", "npm run test:staged"]
}
```

### Analysis

**Strengths:**
- Automated code quality checks
- Prevents broken code from entering repo
- Fast feedback loop

**Issues:**
- No commit message validation
- Tests run on staged files only (may miss integration issues)
- No security scanning in hooks
- No dependency audit

### Improved Configuration

```json
// .lintstagedrc.json
{
  "*.{ts,js}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'npm run typecheck:file || exit 0'"
  ],
  "*.{md,json}": [
    "prettier --write"
  ]
}
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
npx --no-install commitlint --edit "$1"
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Run security audit on changed dependencies
npx npm audit --audit-level=moderate

# Optional: Run tests on changed code
npm run test:staged
```

### Commit Message Convention

```bash
# Conventional commits
feat: add user authentication
fix: resolve database connection leak
docs: update API documentation
style: format code with prettier
refactor: extract user service
test: add unit tests for auth module
chore: update dependencies
```

---

## 7. Code Quality Gates

### Current Setup

**ESLint:**
- TypeScript recommended rules
- Prettier integration
- Minimal custom rules

**Prettier:**
```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2
}
```

**TypeScript:**
- Target: ES2016
- Module: CommonJS
- Paths mapping configured

### Issues & Improvements

| Area | Current | Recommended |
|------|---------|-------------|
| TypeScript Strict Mode | Not enabled | Enable strict, noImplicitAny, strictNullChecks |
| ESLint Rules | Minimal | Add security, complexity, and import rules |
| Testing | Jest only | Add integration and E2E tests |
| Coverage | No minimum | Enforce 80%+ coverage |
| Prettier | Basic config | Add editorconfig for consistency |

### Enhanced TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

### Enhanced ESLint Config

```json
{
  "env": {
    "browser": false,
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:security/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "tsconfigRootDir": ".",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint",
    "import",
    "security"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "import/no-cycle": "error",
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal"],
      "newlines-between": "always"
    }],
    "complexity": ["warn", 10],
    "max-lines-per-function": ["warn", { "max": 80 }],
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn"
  }
}
```

### Quality Metrics Dashboard

Create a `QUALITY.md` file tracking:
- Test coverage trends
- Code complexity metrics
- Technical debt items
- Security scan results
- Performance benchmarks

---

## 8. Development Workflow

### Current Workflow

```bash
# Start development
make startup
# or
docker-compose up

# This runs:
# 1. prisma generate
# 2. prisma db push
# 3. prisma migrate deploy
# 4. npm run start:dev (nodemon + ts-node)
```

### Workflow Issues

| Issue | Impact |
|-------|--------|
| Database mutations at startup | Risky for production |
| No hot reload isolation | Tests may interfere with app |
| No development seeding | Manual data setup required |
| No environment validation | Runtime errors common |

### Recommended Development Workflow

#### Makefile

```makefile
.PHONY: help dev test lint setup clean

help:
	@echo "Available commands:"
	@echo "  make dev        - Start development environment"
	@echo "  make dev-db     - Start only database"
	@echo "  make test       - Run tests"
	@echo "  make lint       - Run linter"
	@echo "  make setup      - Initial setup"
	@echo "  make clean      - Clean build artifacts"

# Setup project
setup:
	npm install
	cp .env.example .env.local
	npx prisma generate
	npx prisma migrate dev
	npx prisma db seed
	pre-commit install

# Start development environment
dev: setup_db
	docker-compose up app --build

# Start only database services
dev-db:
	docker-compose up postgres pgadmin -d

# Database operations
setup_db:
	npx prisma generate
	npx prisma migrate dev
	npx prisma db seed

# Run tests
test:
	npm test

# Run tests with coverage
coverage:
	npm run coverage

# Lint code
lint:
	npm run lint

# Format code
format:
	npm run pretty

# Type check
typecheck:
	npx tsc --noEmit

# Clean artifacts
clean:
	rm -rf dist coverage node_modules/.cache
	docker system prune -f
```

#### Development Scripts (package.json)

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:db\" \"npm run dev:app\"",
    "dev:app": "nodemon --watch src --exec \"ts-node -r tsconfig-paths/register src/server.ts\"",
    "dev:db": "docker-compose up postgres -d",
    "dev:seed": "prisma db seed",
    "dev:reset": "prisma migrate reset --force && prisma db seed",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "lint:fix": "eslint . --ext .ts --fix",
    "format:check": "prettier --check .",
    "format:write": "prettier --write .",
    "db:studio": "prisma studio",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  }
}
```

### IDE Configuration

**.vscode/settings.json**
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.validate.enable": true,
  "eslint.validate": ["typescript"],
  "files.exclude": {
    "node_modules": true,
    "dist": true,
    "coverage": true
  }
}
```

---

## 9. Production Considerations

### Multi-Stage Build Implementation

See Section 1 for optimized Dockerfile with multi-stage build.

### Production Deployment Checklist

#### Pre-Deployment
- [ ] Run full test suite with >80% coverage
- [ ] Security audit: `npm audit --audit-level=high`
- [ ] Build passes without warnings
- [ ] TypeScript compiles without errors
- [ ] Database migrations tested on staging
- [ ] Environment variables validated
- [ ] Secrets in secure storage
- [ ] Docker image scanned for vulnerabilities
- [ ] Load testing completed
- [ ] Backup strategy verified

#### Deployment Best Practices

**Container Security:**
```dockerfile
# Non-root user (done)
USER nodejs

# Read-only filesystem
# docker run --read-only

# Drop capabilities
# docker run --cap-drop ALL

# No new privileges
# docker run --security-opt no-new-privileges

# Health checks
HEALTHCHECK CMD ...
```

**Production Docker Compose:**
```yaml
services:
  app:
    image: registry.example.com/user-factory:${VERSION}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Production Environment Variables

```bash
# Production .env
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL_SECRET}
JWT_SECRET=${JWT_SECRET_SECRET}
LOG_LEVEL=warn
ENABLE_PROFILING=false
```

### Scaling Considerations

**Horizontal Scaling:**
- Stateless application design (session externalization)
- Load balancer with health checks
- Database connection pooling
- Redis for caching/session store

**Vertical Scaling:**
- Increase container memory/CPU limits
- Monitor resource utilization
- Use VPA (Vertical Pod Autoscaler) in K8s

---

## 10. Monitoring & Observability Gaps

### Current State: No Monitoring

**Missing Capabilities:**
- No application metrics
- No logging aggregation
- No error tracking
- No performance monitoring
- No health check endpoints
- No distributed tracing
- No alerting

### Recommended Observability Stack

#### 1. Logging

```typescript
// src/config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-factory' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### 2. Metrics

```typescript
// src/config/metrics.ts
import promClient from 'prom-client';

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const activeUsers = new promClient.Gauge({
  name: 'app_active_users',
  help: 'Number of active users'
});
```

#### 3. Health Checks

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { db } from '@database/client';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

router.get('/ready', async (req, res) => {
  // Readiness probe - check dependencies
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    // Add other dependencies
  ]);
  
  const ready = checks.every(c => c.status === 'fulfilled');
  res.status(ready ? 200 : 503).json({ ready });
});

export { router as healthRouter };
```

#### 4. Error Tracking

```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export default Sentry;
```

### Docker Compose with Monitoring

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/var/log
      - ./monitoring/promtail.yml:/etc/promtail/config.yml
```

### Key Metrics to Track

**Application Metrics:**
- Request rate (requests/second)
- Request latency (p50, p95, p99)
- Error rate (5xx responses)
- Active connections
- CPU/Memory usage

**Business Metrics:**
- User registration rate
- User login success rate
- API usage by endpoint
- Data growth rate

**Infrastructure Metrics:**
- Container health status
- Database connection pool usage
- Database query latency
- Disk I/O

### Alerting Rules

```yaml
# prometheus alerts
groups:
  - name: user-factory
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
```

---

## 11. Security Hardening Recommendations

### Critical Security Issues

| Issue | Severity | Remediation |
|-------|----------|-------------|
| Default credentials | Critical | Generate strong secrets, use secrets manager |
| .env committed | Critical | Remove from git, add to .gitignore |
| No input validation | High | Add validation middleware |
| No rate limiting | High | Implement rate limiting |
| No security headers | Medium | Add Helmet.js |
| CORS not configured | Medium | Configure CORS properly |
| No SQL injection protection | Medium | Prisma provides protection, validate inputs |
| Missing security scanning | High | Add SAST/DAST in CI/CD |
| No dependency scanning | High | Audit dependencies regularly |

### Security Checklist

#### 1. Container Security

```dockerfile
# Use specific version tags
FROM node:18.16.0-slim@sha256:...

# Run as non-root
USER nodejs

# Read-only root filesystem
# docker run --read-only

# Drop privileges
# docker run --cap-drop ALL

# No new privileges
# docker run --security-opt no-new-privileges:true
```

#### 2. Application Security

```typescript
// src/config/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

export const securityMiddleware = (app) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  });
  app.use('/api/', limiter);

  // CORS
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }));

  // Input validation
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
};
```

#### 3. Database Security

```sql
-- Create dedicated database user with minimal privileges
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE userfactory TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Enable SSL connections
ALTER SYSTEM SET ssl = on;
```

#### 4. Secrets Management

**Development:**
```bash
# Use .env.local (gitignored)
cp .env.example .env.local
# Edit .env.local with actual secrets
```

**Production:**
- Docker Secrets
- Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault

```yaml
# docker-compose with secrets
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  app:
    secrets:
      - db_password
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
```

#### 5. CI/CD Security

```yaml
# GitHub Actions security
permissions:
  contents: read
  id-token: write

# Use OIDC for cloud authentication, not long-lived secrets

# Scan for secrets
- name: TruffleHog OSS
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
```

#### 6. Dependency Security

```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "security:check": "npm audit --audit-level=moderate && snyk test"
  }
}
```

Weekly security tasks:
- [ ] Run `npm audit`
- [ ] Update dependencies
- [ ] Review security advisories
- [ ] Rotate secrets quarterly
- [ ] Review access logs

#### 7. Network Security

```yaml
# Docker networks
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No internet access

services:
  app:
    networks:
      - frontend
      - backend
  
  postgres:
    networks:
      - backend  # Not exposed to frontend
```

#### 8. Logging & Monitoring

- Log security events (failed logins, suspicious activity)
- Monitor for unusual patterns
- Alert on multiple failed authentication attempts
- Log all administrative actions

---

## Summary & Next Steps

### Immediate Actions (Week 1)
1. **Security** - Remove .env from git, rotate credentials
2. **Docker** - Create .dockerignore, implement multi-stage build
3. **Health Checks** - Add health endpoints and container health checks
4. **CI/CD** - Set up GitHub Actions pipeline

### Short Term (Month 1)
1. Implement proper secrets management
2. Add monitoring and logging stack
3. Set up automated testing in CI
4. Implement rate limiting and security headers
5. Create staging environment

### Long Term (Quarter 1)
1. Kubernetes deployment
2. Advanced monitoring with dashboards
3. Automated security scanning
4. Disaster recovery procedures
5. Performance optimization

### Documentation Maintenance

This document should be:
- Reviewed quarterly
- Updated after infrastructure changes
- Referenced in onboarding
- Included in runbooks

---

## Appendix

### A. Useful Commands

```bash
# Database operations
npx prisma migrate dev --name feature_name
npx prisma db seed
npx prisma studio

# Docker operations
docker-compose up -d
docker-compose logs -f app
docker-compose down -v

# Testing
npm run test:coverage
npm run test:watch

# Code quality
npm run lint:fix
npm run format
```

### B. File Structure

```
user-factory/
├── docs/
│   └── DEVOPS.md          # This document
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .husky/
├── docker/
├── scripts/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── package.json
└── tsconfig.json
```

### C. Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| NODE_ENV | Environment mode | development | No |
| PORT | Application port | 3000 | No |
| DATABASE_URL | Prisma database connection | - | Yes |
| JWT_SECRET | JWT signing secret | - | Yes |
| LOG_LEVEL | Logging level | info | No |

---

*Last Updated: 2024*
*Document Owner: DevOps Team*
*Review Schedule: Quarterly*
