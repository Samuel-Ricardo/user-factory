# Testing Strategy - User Factory

## 1. Testing Pyramid & Strategy

User Factory implements a testing pyramid strategy with clear separation between unit and integration tests:

**Testing Stack:**
- **Jest 29.5.0** as test runner with ts-jest preset
- **ts-jest** for TypeScript compilation
- **supertest** for HTTP integration testing
- **Prisma Environment Jest** for isolated database testing

**Pyramid Layers:**
1. **Unit Tests (Base - 70%)**: Fast, isolated tests for service layer and in-memory repository
2. **Integration Tests (Middle - 20%)**: Full HTTP stack tests with supertest
3. **Repository Tests (Top - 10%)**: Database integration with Prisma and in-memory variants

**Key Principles:**
- Shift-left testing with fast unit tests
- Isolated database tests using schematic schemas per test suite
- In-memory repositories for service layer testing (no DB dependencies)
- Real Prisma repository tests for data persistence validation

## 2. Test Organization

```
test/
├── module/
│   └── createUser/
│       ├── controller.spec.ts  # Integration - Full HTTP stack
│       └── service.spec.ts     # Unit - Service with in-memory repo
└── repository/
    ├── in-memory/
    │   └── user.spec.ts        # Unit - In-memory repository
    └── prisma/
        └── user.spec.ts        # Integration - Real DB repository
```

**Test Categories:**
- **Module tests**: Test business logic and HTTP endpoints
- **Repository tests**: Test data persistence layer (both in-memory and Prisma)

## 3. Test Files Analysis

### 3.1 test/module/createUser/controller.spec.ts (Integration)

**Purpose**: Validates full HTTP request/response cycle

**Coverage:**
- HTTP endpoint `POST /user` with valid payload
- Response status 201 on success
- User ID generation
- Duplicate username validation (400 error)

**Implementation:**
```typescript
describe("Create User Controller", () => {
  beforeEach(() => {
    // Dynamic test data generation to avoid conflicts
    VALID.USER = { ...VALID.USER, username: VALID.USER.username + Math.random() }
  })

  it("should be able to create a new user", async () => {
    const response = await request(app).post(ROUTES.USER).send(VALID.USER)
    expect(response.status).toBe(201)
    expect(response.body.user.data).toHaveProperty("id")
  })
})
```

**Strengths:**
- Uses supertest for realistic HTTP testing
- Dynamic data generation prevents test pollution
- Tests actual Express app routing

**Issues:**
- No cleanup between tests (DB state persists)
- Missing error response body validation
- No negative test cases (invalid payload, missing fields)
- Random value generation makes tests non-deterministic

### 3.2 test/module/createUser/service.spec.ts (Unit)

**Purpose**: Tests business logic in isolation

**Coverage:**
- User creation with valid data
- Duplicate username detection
- Service response formatting

**Implementation:**
```typescript
describe("Create User Service", () => {
  let repository: IUsersRepository
  let service: CreateUserService

  beforeEach(() => {
    repository = new UserRespositoryInMemory()
    service = new CreateUserService(repository)
  })

  it("should be able to create a new user", async () => {
    const user = await service.execute(VALID.USER)
    expect(user.data).toHaveProperty("id")
    expect(user.data.username).toEqual(VALID.USER.username)
  })
})
```

**Strengths:**
- In-memory repository provides fast, isolated tests
- Clean dependency injection
- Tests business rules directly

**Issues:**
- Shared VALID.USER object mutates across tests
- No test for edge cases (empty strings, null values)
- No validation of error response structure
- Missing tests for email format validation

### 3.3 test/repository/in-memory/user.spec.ts (Unit)

**Purpose**: Validates in-memory repository implementation

**Coverage:**
- User persistence in memory array
- User existence check
- Entity instance creation

**Implementation:**
```typescript
describe("In Memory User repository test", () => {
  beforeAll(() => {
    repository = new UserRespositoryInMemory()
  })

  it("Should save user sucessfuly", async () => {
    const user = await repository.create(VALID.USER)
    expect(user).toBeInstanceOf(User)
    expect(user).toHaveProperty("id")
  })
})
```

**Strengths:**
- Tests repository contract compliance
- Fast execution (no DB overhead)
- Validates entity creation

**Issues:**
- `beforeAll` causes state leakage between tests
- No cleanup/test isolation
- Only one happy path tested
- No error scenarios (concurrent creation, duplicate handling)

### 3.4 test/repository/prisma/user.spec.ts (Integration)

**Purpose**: Validates Prisma repository with real database

**Coverage:**
- Database persistence
- Unique constraint validation
- Schema isolation via custom Jest environment

**Implementation:**
```typescript
/*
 *@jest-environment ./prisma/prisma-environment-jest
 */

describe("Prisma User repository test", () => {
  beforeAll(() => {
    repository = new PrismaUserRepository()
  })

  afterEach(() => {
    VALID.USER = {
      name: VALID.USER.name + Math.random(),
      username: VALID.USER.username + Math.random(),
      email: VALID.USER.email + Math.random(),
    }
  })
})
```

**Strengths:**
- Custom Jest environment creates isolated schemas per test run
- Real database interactions tested
- Schema cleanup in teardown
- Dynamic data prevents conflicts

**Issues:**
- Mutates global VALID.USER constant
- `beforeAll` without proper reset
- No test for transaction rollback
- Missing tests for concurrent operations
- Random values reduce test reproducibility

## 4. Coverage Configuration & Thresholds

**Jest Configuration (jest.config.ts):**
```typescript
collectCoverage: true
collectCoverageFrom: ["<rootDir>/src/**/*.ts", "<rootDir>/test/**/*.ts"]
coverageDirectory: "coverage"
coverageProvider: "v8"
roots: ["<rootDir>/src", "<rootDir>/test"]
```

**Current State:**
- Coverage collection enabled but no thresholds configured
- v8 provider for accurate coverage
- Coverage from both src and test directories

**Recommendations:**
```typescript
coverageThreshold: {
  global: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  './src/module/**': {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90
  }
}
```

**Missing Coverage:**
- Error middleware not tested
- Entity validation logic not covered
- Configuration modules untested
- Server startup path untested

## 5. Test Data Management

**Current Approach:**
```typescript
// src/config/consts.ts
export const VALID = {
  USER: {
    name: "John",
    username: "Johny",
    email: "john@email.com",
  } as IUserData,
}
```

**ERROR Constants:**
```typescript
// src/config/errors.ts
export const UserAlredyExists: IResponse<IError> = {
  error: true,
  status: 400,
  data: { message: "User alredy exists" },
}
```

**Problems:**
1. **Mutable Global State**: VALID.USER is mutated across tests, causing flakiness
2. **No Test Factories**: Hardcoded data makes test variations difficult
3. **No Edge Case Data**: Missing invalid data examples
4. **Shared State**: afterEach modifications don't restore original values

**Recommended Pattern:**
```typescript
// test/factories/user.factory.ts
export const createValidUser = (overrides = {}) => ({
  name: "John",
  username: "johny123",
  email: "john@example.com",
  ...overrides
})

export const createInvalidUser = () => ({
  name: "",
  username: "",
  email: "invalid-email"
})
```

## 6. Mocking Strategy

**Current Strategy:**
- **Service Layer**: Real in-memory repository (no mocking)
- **Repository Tests**: Real implementation
- **Integration Tests**: Real Express app with real repository

**Mocking Approaches Used:**

### In-Memory Repository (Preferred)
```typescript
repository = new UserRespositoryInMemory()
service = new CreateUserService(repository)
```
- Pros: Fast, no external dependencies, tests real logic
- Cons: Doesn't catch DB-specific issues

### Prisma Custom Environment
```typescript
// prisma/prisma-environment-jest.js
this.schema = `code_schema_${uuid()}`
this.connectionString = `${process.env.DOCKER_DATABASE_URL}${this.schema}`
```
- Pros: Complete isolation, tests real queries
- Cons: Slower, requires Docker

**Missing Mocking:**
- No HTTP client mocking
- No external service mocking
- No time-based logic mocking
- No Prisma client mocking for unit tests

## 7. CI/CD Integration

**Current Scripts (package.json):**
```json
{
  "test": "jest --passWithNoTests --color",
  "test:dev": "jest --watchAll --color",
  "test:staged": "jest --findRelatedTests --passWithNoTests --color .",
  "coverage": "jest --coverage --passWithNoTests --color"
}
```

**GitHub Actions Readiness:**

**Required Additions:**
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: admin
          POSTGRES_PASSWORD: admin
          POSTGRES_DB: userfactory
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm run test
      - run: npm run coverage
      - uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
```

**Missing CI Features:**
- No automated coverage reporting
- No test result artifacts
- No parallel test execution
- No flaky test detection
- No performance regression checks

## 8. Test Commands & Scripts

**Available Commands:**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:dev

# Run tests for staged files only
npm run test:staged

# Generate coverage report
npm run coverage

# Run tests with coverage
npm run coverage -- --coverageReporters=text-lcov
```

**Missing Commands:**
```json
{
  "test:unit": "jest test/module test/repository/in-memory --passWithNoTests",
  "test:integration": "jest test/module controller.spec.ts test/repository/prisma --passWithNoTests",
  "test:watch:unit": "jest test/module test/repository/in-memory --watch",
  "test:ci": "jest --ci --coverage --maxWorkers=2"
}
```

## 9. Quality Gates

**Current Gates:**
- Tests must pass (`npm test` exits with 0)
- No coverage thresholds enforced
- No linting gate in test pipeline

**Recommended Quality Gates:**

### Coverage Thresholds
- **Global**: 80% statements, 75% branches
- **Services**: 90% statements, 85% branches
- **Repositories**: 85% statements, 80% branches
- **Controllers**: 80% statements, 75% branches

### Test Quality Criteria
1. **All tests must pass** before merge
2. **No skipped tests** without justification
3. **Coverage must not decrease** by >5%
4. **Integration tests** must run against real DB
5. **Unit tests** must run in <100ms each
6. **No flaky tests** (consistent results across 10 runs)

### Pre-push Hooks (Husky)
```json
{
  "husky": {
    "hooks": {
      "pre-push": "npm run test:staged && npm run lint"
    }
  }
}
```

## 10. Recommendations for Improvement

### Critical Issues

1. **Test Isolation Failure**
   - **Problem**: Tests mutate shared VALID.USER object
   - **Impact**: Flaky tests, order-dependent failures
   - **Fix**: Use test factories with fresh data per test

2. **Missing Test Cleanup**
   - **Problem**: `beforeAll` without cleanup causes state leakage
   - **Impact**: Tests pollute each other
   - **Fix**: Use `beforeEach` and `afterEach` with cleanup

3. **No Negative Test Cases**
   - **Problem**: Only happy paths tested
   - **Impact**: Untested error handling
   - **Fix**: Add validation, error, and edge case tests

### High Priority

4. **Coverage Thresholds Missing**
   - **Action**: Configure jest coverage thresholds
   - **Target**: 80% global, 90% for critical paths

5. **Test Data Management**
   - **Action**: Create factory functions for test data
   - **Benefit**: Reusable, maintainable test data

6. **Error Response Validation**
   - **Action**: Test error response structure and messages
   - **Current**: Only status codes checked

7. **Performance Testing**
   - **Action**: Add tests for repository query performance
   - **Target**: Repository operations <100ms

### Medium Priority

8. **Test Documentation**
   - **Action**: Add test descriptions with Given/When/Then
   - **Benefit**: Clearer test intent

9. **Parallel Test Execution**
   - **Action**: Configure Jest maxWorkers
   - **Benefit**: Faster CI runs

10. **Mutation Testing**
    - **Action**: Add Stryker for mutation testing
    - **Benefit**: Validate test quality

### Low Priority

11. **Visual Test Reports**
    - **Action**: Add jest-html-reporters
    - **Benefit**: Better test visibility

12. **Test Impact Analysis**
    - **Action**: Use jest --findRelatedTests in CI
    - **Benefit**: Faster feedback

### Recommended Refactorings

**Before:**
```typescript
beforeEach(() => {
  VALID.USER.username += Math.random()
})
```

**After:**
```typescript
beforeEach(() => {
  user = createValidUser({
    username: `user_${Date.now()}_${Math.random()}`
  })
})
```

**Before:**
```typescript
beforeAll(() => {
  repository = new UserRespositoryInMemory()
})
```

**After:**
```typescript
beforeEach(() => {
  repository = new UserRespositoryInMemory()
  service = new CreateUserService(repository)
})
```

## Summary

**Current Strengths:**
- Clear separation of unit and integration tests
- In-memory repository for fast unit tests
- Custom Jest environment for isolated DB tests
- Supertest for realistic HTTP testing

**Critical Gaps:**
- No test isolation (shared mutable state)
- Missing coverage thresholds
- Limited negative test cases
- No CI/CD integration configured

**Next Steps:**
1. Implement test factories to eliminate shared state
2. Configure Jest coverage thresholds
3. Add negative test cases for validation
4. Set up GitHub Actions pipeline
5. Fix test isolation issues

**Estimated Effort:** 2-3 days for critical fixes, 1 week for full improvements
