# Architecture Documentation

## 🏗️ System Overview & High-Level Architecture

### Project Vision
**user-factory** is a Node.js/TypeScript REST API that implements Clean Architecture principles for user management. The system provides CRUD operations with dual repository implementations (in-memory and Prisma/PostgreSQL) enabling development flexibility and testing capabilities.

### System Context

```mermaid
graph TB
    Client[Client Applications<br/>Web/Mobile/API Consumers]
    
    subgraph "user-factory System"
        API[Express.js REST API<br/>Port 3000]
        DB[(PostgreSQL<br/>Port 5432)]
    end
    
    Client --> API
    API --> DB
    
    subgraph "Development & Operations"
        PgAdmin[pgAdmin4<br/>Port 5050]
        Docker[Docker Compose<br/>Containers]
    end
    
    PgAdmin --> DB
    Docker --> API
    Docker --> DB
    Docker --> PgAdmin
```

### Core Capabilities
- **User Creation**: Create users with validation (unique username/email)
- **Repository Abstraction**: Pluggable storage implementations
- **Testability**: In-memory implementation for unit testing
- **Containerization**: Full Docker Compose stack

---

## 🎨 Architectural Style & Patterns

### Clean Architecture Layers

```mermaid
graph TD
    subgraph "Presentation Layer"
        Routes[Routes<br/>Express.js Routes]
        Controllers[Controllers<br/>HTTP Request/Response Handling]
    end
    
    subgraph "Application Layer"
        Services[Services<br/>Business Logic Orchestration]
    end
    
    subgraph "Domain Layer"
        Entities[Entities<br/>User Domain Model]
        ValueObjects[Value Objects<br/>IUserData, IResponse]
    end
    
    subgraph "Infrastructure Layer"
        Repositories[Repositories<br/>Data Access Abstraction]
        PrismaImpl[Prisma Repository<br/>PostgreSQL Implementation]
        InMemoryImpl[In-Memory Repository<br/>Testing Implementation]
        Database[(PostgreSQL Database)]
    end
    
    Routes --> Controllers
    Controllers --> Services
    Services --> Entities
    Services --> Repositories
    Repositories --> PrismaImpl
    Repositories --> InMemoryImpl
    PrismaImpl --> Database
    
    style Entities fill:#e1f5fe
    style Services fill:#fff3e0
    style Repositories fill:#f3e5f5
```

### Applied Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| **Clean Architecture** | Separation of concerns, testability | 4-layer architecture (Presentation, Application, Domain, Infrastructure) |
| **Repository Pattern** | Data access abstraction | `IUsersRepository` interface with multiple implementations |
| **Factory Pattern** | Dependency injection & object creation | `createUserFactory()` for dependency composition |
| **Dependency Injection** | Decoupling, testability | Constructor injection in Controllers/Services |
| **Entity Pattern** | Domain model representation | `User` class with static factory method |

---

## 📐 Component Diagram

### Layered Architecture

```mermaid
graph TB
    subgraph "Routes Layer"
        UserRoutes[user_routes.ts<br/>POST /user]
        AppRoutes[routes/index.ts<br/>App Router]
    end
    
    subgraph "Controller Layer"
        CreateUserCtrl[CreateUserController<br/>handle(req, res)]
    end
    
    subgraph "Service Layer"
        CreateUserSvc[CreateUserService<br/>execute(userData)]
    end
    
    subgraph "Entity Layer"
        UserEntity[User Entity<br/>User.create()]
    end
    
    subgraph "Repository Layer"
        UserRepoInt[IUsersRepository<br/>Interface]
        PrismaRepo[PrismaUserRepository<br/>PostgreSQL]
        MemoryRepo[UserRepositoryInMemory<br/>Testing]
    end
    
    subgraph "Configuration"
        Config[Config Module<br/>ENV, ROUTES, ERROR]
        Database[Database Client<br/>Prisma Client]
    end
    
    UserRoutes --> CreateUserCtrl
    CreateUserCtrl --> CreateUserSvc
    CreateUserSvc --> UserEntity
    CreateUserSvc --> UserRepoInt
    UserRepoInt -->|Implements| PrismaRepo
    UserRepoInt -->|Implements| MemoryRepo
    CreateUserSvc --> Config
    PrismaRepo --> Database
    
    style AppRoutes fill:#ffebee
    style CreateUserCtrl fill:#e3f2fd
    style CreateUserSvc fill:#fff3e0
    style UserEntity fill:#f3e5f5
```

### Dependency Flow

```mermaid
graph LR
    Factory[Factory<br/>createUserFactory]
    
    subgraph "Object Composition"
        Repo[Repository]
        Service[Service]
        Controller[Controller]
    end
    
    Factory --> Repo
    Factory --> Service
    Factory --> Controller
    
    Controller --> Service
    Service --> Repo
    
    style Factory fill:#fff9c4
    style Controller fill:#e3f2fd
    style Service fill:#fff3e0
    style Repo fill:#f3e5f5
```

---

## 🔄 Data Flow

### Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant Routes as Express Routes
    participant Factory as createUserFactory
    participant Controller as CreateUserController
    participant Service as CreateUserService
    participant Repository as IUsersRepository
    participant DB as PostgreSQL
    
    Client->>Routes: POST /user {name, username, email}
    Routes->>Factory: createUserFactory()
    Factory->>Repository: new PrismaUserRepository()
    Factory->>Service: new CreateUserService(repository)
    Factory->>Controller: new CreateUserController(service)
    Factory-->>Routes: controller instance
    
    Routes->>Controller: handle(req, res)
    Controller->>Service: execute({name, username, email})
    
    Service->>Repository: exist(username)
    Repository->>DB: SELECT * FROM users WHERE username = ?
    DB-->>Repository: user or null
    Repository-->>Service: boolean
    
    alt User exists
        Service-->>Controller: ERROR {status: 400}
        Controller-->>Client: 400 Bad Request
    else User doesn't exist
        Service->>Repository: create(user)
        Repository->>DB: INSERT INTO users (...)
        DB-->>Repository: created user
        Repository-->>Service: User
        Service-->>Controller: {error: false, status: 201, data: user}
        Controller-->>Client: 201 Created {user}
    end
```

### Detailed Flow Steps

1. **HTTP Request Reception** (Routes Layer)
   - Express route receives POST request at `/user`
   - Request body parsed by `express.json()` middleware

2. **Factory Initialization** (Factory Pattern)
   - `createUserFactory()` composes dependencies
   - Creates repository instance → service instance → controller instance
   - Returns controller ready to handle request

3. **Controller Processing** (Presentation Layer)
   - Extracts `name`, `username`, `email` from request body
   - Delegates to service layer for business logic

4. **Service Execution** (Application Layer)
   - Validates business rules (username uniqueness)
   - Creates domain entity via static factory method
   - Coordinates with repository for data persistence

5. **Repository Operation** (Infrastructure Layer)
   - Repository checks existence via database query
   - Repository creates record via Prisma ORM
   - Returns domain entity

6. **Response Generation** (Presentation Layer)
   - Controller formats response with appropriate HTTP status
   - Returns JSON payload to client

---

## 🗄️ Database Schema & ERD

### Prisma Schema

```prisma
model User {
  id       String @id @default(uuid())
  name     String
  username String @unique
  email    String @unique

  @@map("users")
}
```

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        string id PK "UUID, Auto-generated"
        string name "User's full name"
        string username UK "Unique username"
        string email UK "Unique email address"
    }
```

### Table Structure

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, DEFAULT uuid() | Unique identifier |
| `name` | String | NOT NULL | User's full name |
| `username` | String | UNIQUE, NOT NULL | Unique username for login |
| `email` | String | UNIQUE, NOT NULL | User's email address |

### Database Configuration

```env
DATABASE_URL="postgresql://admin:admin@postgres:5432/userfactory?schema=public"
```

**Database**: PostgreSQL 15+  
**Connection Pool**: Prisma-managed  
**Schema**: `public`  
**Mapping**: Prisma model `User` → Table `users`

---

## 💻 Technology Stack & Versions

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Runtime** | Node.js | 18.x+ | JavaScript runtime |
| **Language** | TypeScript | 5.0.4 | Type-safe JavaScript |
| **Framework** | Express.js | 4.18.2 | Web framework |
| **ORM** | Prisma | 4.13.0 | Database ORM |
| **Database** | PostgreSQL | 15+ | Relational database |
| **Containerization** | Docker | 20.x+ | Container platform |

### Development Tools

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Testing** | Jest | 29.5.0 | Unit testing framework |
| **Testing** | Supertest | 6.3.3 | HTTP assertion library |
| **Build** | TypeScript Compiler | 5.0.4 | Type checking & compilation |
| **Linting** | ESLint | 8.39.0 | Code linting |
| **Formatting** | Prettier | 2.8.8 | Code formatting |
| **Dev Server** | Nodemon | 2.0.22 | Hot reload |
| **Version Control** | Husky | 8.0.3 | Git hooks |

### Dependencies

```json
{
  "@prisma/client": "^4.13.0",
  "express": "^4.18.2",
  "express-async-errors": "^3.1.1",
  "@types/express": "^4.17.17",
  "uuid": "^9.0.0",
  "dotenv": "^16.0.3",
  "pg": "^8.10.0",
  "prisma": "^4.13.0"
}
```

---

## 📋 Architectural Decision Records (ADRs)

### ADR-001: Clean Architecture Implementation

**Status**: Accepted  
**Date**: 2024  
**Decision**: Implement Clean Architecture with 4 distinct layers

**Context**:
- Need for maintainable, testable codebase
- Separation of business logic from infrastructure concerns
- Requirement for pluggable dependencies

**Decision**:
Implement Clean Architecture with layers:
1. Presentation (Routes, Controllers)
2. Application (Services)
3. Domain (Entities, Value Objects)
4. Infrastructure (Repositories, Database)

**Consequences**:
- ✅ Positive: Clear separation of concerns, high testability
- ✅ Positive: Easy to swap implementations (in-memory ↔ Prisma)
- ⚠️ Negative: More boilerplate code
- ⚠️ Negative: Initial learning curve for team

**Trade-offs**:
- Increased file count vs. long-term maintainability
- More upfront design vs. faster initial development

---

### ADR-002: Repository Pattern with Dual Implementations

**Status**: Accepted  
**Date**: 2024  
**Decision**: Implement Repository Pattern with interface + multiple implementations

**Context**:
- Need for testability without database dependency
- Want ability to test business logic in isolation
- Requirement for production database support

**Decision**:
- Define `IUsersRepository` interface with `create()` and `exist()` methods
- Implement `PrismaUserRepository` for production PostgreSQL
- Implement `UserRepositoryInMemory` for testing

**Consequences**:
- ✅ Positive: Unit tests run fast without database
- ✅ Positive: Business logic decoupled from storage
- ✅ Positive: Easy testing with mock data
- ⚠️ Negative: Need to maintain multiple implementations
- ⚠️ Negative: Interface must accommodate both implementations

**Trade-offs**:
- Duplicate code for CRUD operations vs. test speed
- Interface complexity vs. implementation flexibility

---

### ADR-003: Prisma ORM Selection

**Status**: Accepted  
**Date**: 2024  
**Decision**: Use Prisma ORM instead of raw SQL or other ORMs

**Context**:
- Need type-safe database access
- TypeScript-first development
- Rapid development with schema management
- Migration requirements

**Decision**:
Adopt Prisma Client with PostgreSQL

**Rationale**:
1. **Type Safety**: Automatic TypeScript types from schema
2. **Developer Experience**: Intuitive API, excellent DX
3. **Migration System**: Built-in migration management
4. **Ecosystem**: Large community, active development
5. **Performance**: Optimized query generation

**Consequences**:
- ✅ Positive: Type-safe queries prevent runtime errors
- ✅ Positive: Automatic migrations from schema changes
- ✅ Positive: Excellent IDE support and autocomplete
- ⚠️ Negative: Learning curve for Prisma-specific patterns
- ⚠️ Negative: Vendor lock-in to Prisma

**Trade-offs**:
- Prisma magic vs. SQL transparency
- Convenience vs. fine-grained SQL control
- ORM abstraction vs. performance optimization needs

**Alternatives Considered**:
- **TypeORM**: More complex configuration, less type-safe
- **Sequelize**: JavaScript-first, less TypeScript integration
- **Knex.js**: Query builder, requires manual type definitions
- **Raw SQL**: Maximum control, but verbose and error-prone

---

### ADR-004: Factory Pattern for Dependency Injection

**Status**: Accepted  
**Date**: 2024  
**Decision**: Use Factory Pattern for object composition and dependency injection

**Context**:
- Need to compose objects with dependencies
- Avoid manual dependency management in routes
- Enable easy dependency swapping for testing
- Follow Clean Architecture principles

**Decision**:
Implement `createUserFactory()` function that:
1. Creates repository instance
2. Injects repository into service constructor
3. Injects service into controller constructor
4. Returns composed controller

**Consequences**:
- ✅ Positive: Centralized dependency composition
- ✅ Positive: Easy to swap implementations (test vs. production)
- ✅ Positive: Routes remain clean and simple
- ⚠️ Negative: Factory functions proliferate with features
- ⚠️ Negative: Manual dependency management

**Trade-offs**:
- Explicit factory functions vs. DI framework complexity
- Manual composition vs. automated DI container
- More code vs. clearer dependencies

**Alternatives Considered**:
- **DI Container** (InversifyJS): Overkill for small application
- **Manual instantiation**: Too much boilerplate in routes
- **Service Locator**: Anti-pattern, hides dependencies

---

## 🎯 Non-Functional Requirements

### Scalability

**Current Design**:
- Single instance architecture
- Stateless design enables horizontal scaling
- PostgreSQL supports read replicas

**Scaling Strategies**:
1. **Vertical Scaling**: Increase resources for container
2. **Horizontal Scaling**: Multiple API instances behind load balancer
3. **Database Scaling**: PostgreSQL read replicas for queries
4. **Caching**: Redis layer for frequently accessed data

**Bottlenecks**:
- Single database instance
- No caching layer
- Synchronous request processing

**Scalability Score**: 6/10 (Good foundation, needs optimization)

---

### Maintainability

**Strengths**:
- ✅ Clear layer separation
- ✅ Type safety throughout
- ✅ Consistent naming conventions
- ✅ Dependency injection enables testing
- ✅ Clean Architecture reduces coupling

**Metrics**:
- **Cyclomatic Complexity**: Low (services contain simple logic)
- **Coupling**: Low (interfaces decouple layers)
- **Cohesion**: High (layers have clear responsibilities)

**Maintainability Score**: 8/10 (Excellent architecture)

**Recommendations**:
- Add comprehensive API documentation (OpenAPI/Swagger)
- Implement logging strategy (Winston/Pino)
- Add monitoring and observability
- Create architectural decision records for future changes

---

### Testability

**Test Strategy**:

```mermaid
graph TD
    subgraph "Unit Tests"
        ServiceTests[Service Tests<br/>with In-Memory Repo]
        ControllerTests[Controller Tests<br/>with Mock Service]
        RepoTests[Repository Tests<br/>Integration Tests]
    end
    
    subgraph "Implementation"
        InMemoryRepo[In-Memory<br/>Repository]
        MockService[Mock<br/>Service]
    end
    
    ServiceTests --> InMemoryRepo
    ControllerTests --> MockService
```

**Current Coverage**:
- Unit tests for services with in-memory repository
- Controller tests with mocked dependencies
- Repository integration tests with PostgreSQL

**Testability Strengths**:
- ✅ Repository abstraction enables test doubles
- ✅ Dependency injection supports mocking
- ✅ Clean Architecture layers are independently testable
- ✅ In-memory implementation provides fast tests

**Testability Score**: 9/10 (Excellent)

**Recommendations**:
- Add E2E tests with real database
- Implement contract tests between layers
- Add test data factories/builders
- Increase coverage to >80%

---

## 🚀 Deployment Architecture

### Docker Compose Services

```mermaid
graph TB
    subgraph "Docker Compose Stack"
        App[app<br/>user-factory API<br/>Port 3000]
        Tests[tests<br/>Jest Test Runner]
        Postgres[postgres<br/>PostgreSQL 15<br/>Port 5432]
        PgAdmin[pgadmin<br/>pgAdmin4<br/>Port 5050]
    end
    
    subgraph "Host Network"
        Client[Client<br/>Browser/API Consumer]
    end
    
    Client --> App
    App --> Postgres
    Tests --> App
    PgAdmin --> Postgres
    
    style App fill:#e3f2fd
    style Postgres fill:#e8f5e9
    style PgAdmin fill:#fff3e0
```

### Services Configuration

#### 1. Application Service (`app`)
```yaml
image: user-factory:latest
ports: 3000:3000
volumes: .:/home/node/app
depends_on: postgres
```

**Purpose**: Main API application  
**Health Check**: HTTP `/` endpoint  
**Scaling**: Replicable via load balancer

#### 2. Tests Service (`tests`)
```yaml
container_name: application_tests
command: npm run coverage
depends_on: app
```

**Purpose**: Run test suite in container  
**Usage**: CI/CD pipeline or local testing  
**Isolation**: Separate from app container

#### 3. PostgreSQL Service (`postgres`)
```yaml
image: postgres:latest
ports: 5432:5432
volumes: .docker/postgres:/data/postgres
environment:
  POSTGRES_USER: admin
  POSTGRES_PASSWORD: admin
```

**Purpose**: Primary database  
**Persistence**: Docker volume mount  
**Backup**: Volume snapshots

#### 4. pgAdmin Service (`pgadmin`)
```yaml
image: dpage/pgadmin4
ports: 5050:80
environment:
  PGADMIN_DEFAULT_EMAIL: pgadmin4@pgadmin.org
  PGADMIN_DEFAULT_PASSWORD: admin
```

**Purpose**: Database administration UI  
**Access**: Web interface for database management  
**Security**: Should be restricted in production

### Network Architecture

```
Host Network
    │
    ├── user_factory_default_network (Docker Bridge)
    │       │
    │       ├── app (3000)
    │       ├── postgres (5432)
    │       └── pgadmin (5050)
    │
    └── Host Ports Exposed
            3000 → API
            5432 → PostgreSQL
            5050 → pgAdmin
```

### Environment Variables

```env
# Application
PORT=3000
NODE_ENV=development|production

# Database
DATABASE_URL=postgresql://admin:admin@postgres:5432/userfactory?schema=public
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin

# Monitoring
PGADMIN_DEFAULT_EMAIL=pgadmin4@pgadmin.org
PGADMIN_DEFAULT_PASSWORD=admin
PGADMIN_PORT=5050
```

### Deployment Considerations

**Production Readiness**:
- ⚠️ Remove pgAdmin from production
- ⚠️ Use managed PostgreSQL (RDS/Cloud SQL)
- ⚠️ Implement proper secrets management
- ⚠️ Add SSL/TLS termination
- ⚠️ Configure proper logging and monitoring
- ⚠️ Implement health checks and readiness probes
- ⚠️ Use non-root container users
- ⚠️ Implement rate limiting and security headers

**Current Environment**:
- ✅ Docker Compose for development
- ✅ Environment-based configuration
- ✅ Volume persistence for database
- ⚠️ No production hardening
- ⚠️ No CI/CD pipeline
- ⚠️ No monitoring/observability

---

## 📊 Architecture Quality Metrics

### Layer Separation

| Layer | Files | Responsibilities | Coupling |
|-------|-------|------------------|----------|
| Routes | 2 | HTTP routing | Low |
| Controllers | 1 | Request/response handling | Medium |
| Services | 1 | Business logic | Low |
| Entities | 1 | Domain model | None |
| Repositories | 3 | Data access | Low |

**Score**: 9/10 (Excellent separation)

### SOLID Principles Compliance

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| **S**ingle Responsibility | ✅ | Each class has one responsibility |
| **O**pen/Closed | ✅ | Repository interface allows new implementations |
| **L**iskov Substitution | ✅ | Both repos implement same interface |
| **I**nterface Segregation | ✅ | Small, focused repository interface |
| **D**ependency Inversion | ✅ | High-level modules depend on abstractions |

**Score**: 9/10 (Excellent SOLID compliance)

---

## 🎓 Recommendations

### Short Term (1-3 months)
1. ✅ Add OpenAPI/Swagger documentation
2. ✅ Implement structured logging (Winston)
3. ✅ Add request validation (Zod/Joi)
4. ✅ Implement error handling middleware improvements
5. ✅ Add API versioning strategy

### Medium Term (3-6 months)
1. Add caching layer (Redis)
2. Implement monitoring (Prometheus/Grafana)
3. Add comprehensive E2E tests
4. Implement CI/CD pipeline
5. Add rate limiting and security middleware

### Long Term (6+ months)
1. Consider event-driven architecture for scalability
2. Implement API gateway for microservices
3. Add message queue for async operations
4. Implement CQRS for read/write separation
5. Consider multi-region deployment

---

## 📚 References

### Documentation Files
- `README.md` - Project overview
- `docker-compose.yaml` - Container orchestration
- `prisma/schema.prisma` - Database schema
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Architecture Patterns
- Clean Architecture by Robert C. Martin
- Repository Pattern by Martin Fowler
- Factory Pattern by Gamma et al.
- Dependency Injection principles

### Technology Documentation
- [Express.js](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [PostgreSQL](https://www.postgresql.org/)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Architect**: Wilson  
**Status**: Active

---

> *"The best architects design for change, not for permanence."*  
> Understanding trade-offs is more important than perfect solutions.
