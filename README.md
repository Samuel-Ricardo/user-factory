# 🏭 User Factory

> **A Node.js/TypeScript REST API for User Management** — Built with Clean Architecture, Prisma ORM, and Comprehensive Testing

[![Node.js](https://img.shields.io/badge/Node.js-18.16.0-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-black?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-4.13.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Jest](https://img.shields.io/badge/Jest-29.5.0-C21325?logo=jest)](https://jestjs.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Testing Strategy](#-testing-strategy)
- [Development Workflow](#-development-workflow)
- [DevOps & Infrastructure](#-devops--infrastructure)
- [Code Quality](#-code-quality)
- [Project Structure](#-project-structure)
- [Documentation Hub](#-documentation-hub)
- [Contributing](#-contributing)

---

## 🎯 Overview

**User Factory** is a production-ready REST API demonstrating modern Node.js/TypeScript best practices:

| Aspect | Implementation |
|--------|----------------|
| **Architecture** | Clean Architecture (4 layers) |
| **Database** | PostgreSQL via Prisma ORM |
| **API Style** | RESTful JSON |
| **Testing** | Jest + Supertest (Unit + Integration) |
| **Containerization** | Docker + Docker Compose |
| **Code Quality** | ESLint + Prettier + Husky + TypeScript Strict |
| **Patterns** | Repository, Factory, Dependency Injection, Entity |

### ✨ Key Features

- ✅ **User Creation** — POST `/user` with validation
- ✅ **Unique Constraints** — Username & Email uniqueness enforced
- ✅ **Dual Repository** — In-memory (tests) + Prisma (production)
- ✅ **Error Handling** — Centralized middleware with typed errors
- ✅ **Type Safety** — Full TypeScript with path aliases
- ✅ **Test Coverage** — Configured with v8 provider
- ✅ **Developer Experience** — Hot reload, pre-commit hooks, make targets

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Make (optional, for shortcuts)

### Option 1: Docker (Recommended)

```bash
# Clone and navigate
cd user-factory

# Start all services (API + PostgreSQL + pgAdmin)
docker-compose up -d

# API available at http://localhost:3000
# pgAdmin available at http://localhost:5050
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Setup database (generates Prisma client, pushes schema, runs migrations)
make setup_database

# Start development server with hot reload
npm run start:dev

# API available at http://localhost:3000
```

### Verify Installation

```bash
# Create a user
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "username": "johndoe", "email": "john@example.com"}'

# Expected: 201 Created with user object including UUID
```

---

## 🏗️ Architecture

The project follows **Clean Architecture** with four distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                     │
│  Routes → Controllers → HTTP Request/Response Handling      │
├─────────────────────────────────────────────────────────────┤
│                       APPLICATION LAYER                     │
│  Services → Business Logic → Use Cases (CreateUserService)  │
├─────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER                         │
│  Entities (User) → Domain Models → Business Rules           │
├─────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER                    │
│  Repositories (Prisma/InMemory) → Database → External APIs  │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns

| Pattern | Implementation | Location |
|---------|---------------|----------|
| **Repository** | `IUsersRepository` + `PrismaUserRepository` + `UserRespositoryInMemory` | `src/repository/` |
| **Factory** | `createUserFactory()` — wires dependencies | `src/module/createUser/factory.ts` |
| **Entity** | `User` class with private constructor + static `create()` | `src/entity/User.ts` |
| **Dependency Injection** | Manual via Factory (no IoC container) | `src/module/createUser/` |

📖 **Deep Dive:** [Architecture Documentation](./docs/ARCHITECTURE.md) — Includes ADRs, component diagrams, data flows, and deployment architecture.

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user` | Create a new user |

### Create User

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Success Response (201):**
```json
{
  "user": {
    "error": false,
    "status": 201,
    "data": {
      "id": "uuid-v4",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

**Error Response (400 - Duplicate Username):**
```json
{
  "response": {
    "error": true,
    "status": 400,
    "data": {
      "message": "User alredy exists"
    }
  }
}
```

📖 **Complete API Docs:** [API.md](./docs/API.md) — Includes OpenAPI 3.0 spec, Postman collection, data models, and error handling strategy.

---

## 🧪 Testing Strategy

### Test Pyramid

```
         ▲
        / \      E2E / Integration (Controller)
       /___\     ─────────────────────────────
      /     \    Unit (Service + Repository)
     /_______\  ─────────────────────────────
```

### Test Suite

| Test Type | Files | Coverage |
|-----------|-------|----------|
| **Integration** | `test/module/createUser/controller.spec.ts` | Full HTTP stack |
| **Unit (Service)** | `test/module/createUser/service.spec.ts` | Business logic with in-memory repo |
| **Unit (Repository)** | `test/repository/in-memory/user.spec.ts` | In-memory repository |
| **Integration (DB)** | `test/repository/prisma/user.spec.ts` | Real Prisma/PostgreSQL |

### Commands

```bash
# Run all tests with coverage
npm run coverage

# Run tests in watch mode
npm run test:dev

# Run tests for staged files (pre-commit)
npm run test:staged
```

### Current Coverage
- **Target:** 80% (not yet enforced)
- **Provider:** v8 (native Node.js)

📖 **Full Testing Guide:** [TESTING.md](./docs/TESTING.md) — Includes quality gates, CI/CD integration, and improvement recommendations.

⚠️ **QA Review:** [QA_RESULTS.md](./docs/QA_RESULTS.md) — Adversarial review found 8 issues (3 Critical, 2 High, 3 Medium).

---

## 🛠️ Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development server with hot reload |
| `npm run build` | TypeScript compilation + alias resolution |
| `npm run lint` | ESLint with auto-fix |
| `npm run pretty` | Prettier format check |
| `npm run coverage` | Jest with coverage report |
| `npm run docker:startup` | Docker entrypoint (make startup) |

### Make Targets

```bash
make startup           # Full dev setup (db + server)
make setup_database    # Prisma generate + db push + migrate
make migration         # Run Prisma migrations
```

### Code Quality Gates (Pre-commit)

```bash
# Husky + lint-staged runs on every commit:
# 1. ESLint --fix on staged files
# 2. Prettier --check on staged files
# 3. Jest --findRelatedTests on staged files
```

### TypeScript Path Aliases

```typescript
// Instead of: import { User } from '../../../entity/User'
import { User } from '@entity/User'

// Available aliases:
@/           → ./src/
@Types       → ./src/@types/index.ts
@config      → ./src/config/index.ts
@middleware  → ./src/middleware/index.ts
@database    → ./src/database/client.ts
@entity      → ./src/entity/index.ts
@repository  → ./src/repository/
```

---

## 🐳 DevOps & Infrastructure

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **app** | Custom (Node 18) | 3000 | Main API |
| **tests** | Custom (Node 18) | — | Test runner |
| **postgres** | postgres:latest | 5432 | Database |
| **pgadmin** | dpage/pgadmin4 | 5050 | DB Admin UI |

### Environment Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env` | Local development secrets | ⚠️ **YES (should be .gitignored)** |
| `.env.example` | Template for .env | ✅ Yes |
| `.env.test` | Test environment | ⚠️ **YES** |
| `.env.test.example` | Template for test | ✅ Yes |

### Production Readiness Checklist

- [ ] Multi-stage Dockerfile
- [ ] Non-root user
- [ ] Health checks
- [ ] Resource limits
- [ ] Secrets management
- [ ] CI/CD pipeline
- [ ] Monitoring/Observability
- [ ] Automated backups

📖 **Complete DevOps Guide:** [DEVOPS.md](./docs/DEVOPS.md) — Includes Docker optimization, GitHub Actions workflow, security hardening, and monitoring stack.

---

## 💎 Code Quality

### Design Patterns Scorecard

| Pattern | Status | Notes |
|---------|--------|-------|
| Repository | ✅ Excellent | Clean interface + 2 implementations |
| Factory | ✅ Good | Simple but effective |
| Entity | ⚠️ Flawed | Constructor anti-pattern |
| Dependency Injection | ⚠️ Manual | No IoC container |
| Error Handling | ⚠️ Partial | Centralized but buggy |

### Critical Issues

1. **Entity Constructor Anti-Pattern** — Returns `Object.assign` instead of proper initialization
2. **No Input Validation** — Missing Zod/Joi schema validation
3. **Error Handler Bug** — Calls `next(err)` after response sent
4. **TypeScript Strict Mode Disabled** — Missing `"strict": true`
5. **Security Gaps** — No helmet, rate limiting, or input sanitization

### Bradesco Standards Compliance

| Standard | Compliance | Gap |
|----------|------------|-----|
| Architecture Patterns | 60% | Patterns present but implementation flawed |
| Security | 20% | Major gaps in validation/headers |
| Code Quality | 40% | Strict mode off, no validation |
| Testing | 70% | Good structure, isolation issues |

📖 **Full Analysis:** [CODE_QUALITY.md](./docs/CODE_QUALITY.md) — Includes refactoring opportunities, SOLID assessment, and Bradesco gap analysis.

---

## 📁 Project Structure

```
user-factory/
├── .docker/                 # Docker volumes (pgadmin, postgres)
├── .husky/                  # Git hooks
├── coverage/                # Jest coverage reports
├── docs/                    # 📚 Generated documentation
│   ├── API.md              # API reference + OpenAPI spec
│   ├── ARCHITECTURE.md     # System architecture + ADRs
│   ├── CODE_QUALITY.md     # Code analysis + patterns
│   ├── DEVOPS.md           # Infrastructure + CI/CD
│   ├── TESTING.md          # Testing strategy + QA
│   └── QA_RESULTS.md       # Adversarial QA review
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── @types/             # TypeScript type definitions
│   │   ├── errors/         # Error interfaces
│   │   ├── response.d.ts   # Response wrapper
│   │   └── user_data.d.ts  # User DTO
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Entry point
│   ├── config/             # Configuration
│   │   ├── consts.ts       # Test constants
│   │   ├── ENV.ts          # Env accessors
│   │   ├── errors.ts       # Error constants
│   │   └── routes.ts       # Route constants
│   ├── database/
│   │   └── client.ts       # Prisma client singleton
│   ├── entity/
│   │   ├── index.ts
│   │   └── User.ts         # Domain entity
│   ├── middleware/
│   │   ├── errors.ts       # Global error handler
│   │   └── index.ts
│   ├── module/
│   │   └── createUser/     # Create User feature module
│   │       ├── controller.ts
│   │       ├── createUserService.ts
│   │       └── factory.ts
│   ├── repository/
│   │   ├── IUserRepository.ts      # Repository interface
│   │   ├── in-memory/
│   │   │   └── UserRepositoryInMemory.ts
│   │   └── prisma/
│   │       └── PrismaUserRepository.ts
│   └── routes/
│       └── user.routes.ts  # User routes
├── test/
│   ├── module/createUser/
│   │   ├── controller.spec.ts
│   │   └── service.spec.ts
│   └── repository/
│       ├── in-memory/user.spec.ts
│       └── prisma/user.spec.ts
├── .env                    # ⚠️ Secrets (should be gitignored)
├── .env.example
├── .env.test
├── .env.test.example
├── .eslintrc.json
├── .gitignore
├── .lintstagedrc.json
├── .prettierrc.json
├── docker-compose.yaml
├── Dockerfile
├── jest.config.ts
├── jest.setup.ts
├── Makefile
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## 📚 Documentation Hub

| Document | Description | Size |
|----------|-------------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, ADRs, diagrams, deployment | ~22 KB |
| [API.md](./docs/API.md) | Complete API reference + OpenAPI 3.0 spec | ~16 KB |
| [CODE_QUALITY.md](./docs/CODE_QUALITY.md) | Code analysis, patterns, Bradesco compliance | ~18 KB |
| [DEVOPS.md](./docs/DEVOPS.md) | Docker, CI/CD, security, monitoring | ~25 KB |
| [TESTING.md](./docs/TESTING.md) | Testing strategy, quality gates, CI/CD | ~14 KB |
| [QA_RESULTS.md](./docs/QA_RESULTS.md) | Adversarial QA review (8 issues found) | ~12 KB |

---

## 🔧 Configuration Files

### TypeScript (`tsconfig.json`)
- **Target:** ES2016
- **Module:** CommonJS
- **Strict Mode:** ❌ Disabled (should be enabled)
- **Path Aliases:** Configured for clean imports

### ESLint (`.eslintrc.json`)
- **Parser:** @typescript-eslint/parser
- **Plugins:** @typescript-eslint, prettier
- **Rules:** Recommended + custom

### Prettier (`.prettierrc.json`)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Jest (`jest.config.ts`)
- **Preset:** ts-jest
- **Test Environment:** node
- **Coverage:** v8 provider
- **Module Mapping:** Path aliases configured

---

## 🤝 Contributing

### Branch Strategy
```
main ← develop ← feature/*, fix/*, docs/*
```

### Commit Convention
```
type(scope): description

feat(user): add email validation
fix(auth): handle token refresh
docs(api): update OpenAPI spec
test(service): add edge cases
refactor(entity): fix constructor pattern
```

### Pre-commit Checklist
- [ ] `npm run lint` passes
- [ ] `npm run pretty` passes
- [ ] `npm run test:staged` passes
- [ ] No secrets in commit
- [ ] Tests updated for new features

---

## 📋 Roadmap

### Short Term (Week 1)
- [ ] Enable TypeScript strict mode
- [ ] Add Zod validation schemas
- [ ] Fix error handler bug
- [ ] Add security headers (helmet)
- [ ] Implement rate limiting
- [ ] Fix Entity constructor pattern

### Medium Term (Month 1)
- [ ] Add authentication (JWT)
- [ ] Implement refresh tokens
- [ ] Add request logging (morgan/pino)
- [ ] Set up GitHub Actions CI/CD
- [ ] Enforce 80% coverage threshold
- [ ] Multi-stage Dockerfile

### Long Term (Quarter 1)
- [ ] API versioning (/v1/)
- [ ] Comprehensive integration tests
- [ ] Performance benchmarks
- [ ] Observability stack (Prometheus/Grafana/Loki)
- [ ] Database migration strategy
- [ ] Load testing

---

## 📄 License

ISC License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built following **Avanade Method** principles with specialist collaboration:

| Role | Specialist | Focus |
|------|------------|-------|
| 🏗️ Architect | **Wilson** | Architecture, ADRs, patterns |
| 📝 Tech Writer | **Paige** | API docs, OpenAPI, CommonMark |
| 🧪 QA Engineer | **Carla** | Testing strategy, adversarial review |
| 🐳 DevOps | **Atlas** | Docker, CI/CD, security, monitoring |
| 💻 Developer | **Tiago** | Code quality, patterns, Bradesco standards |

---

> **Generated with Avanade Method — Party Mode** 🎉
> 
> *This documentation was created through multi-agent specialist collaboration, ensuring comprehensive coverage across all SDLC dimensions.*