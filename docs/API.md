# User Factory API Documentation

## 📝 Overview

The User Factory API is a RESTful service built with Express.js for managing user creation. This document provides comprehensive technical specifications for integrating with the API.

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000` (configurable via `PORT` environment variable)  
**Content Type:** `application/json`

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling-strategy)
6. [Rate Limiting](#rate-limiting)
7. [Versioning Strategy](#versioning-strategy)
8. [OpenAPI Specification](#openapiswagger-specification)
9. [Testing](#testing-the-api)

---

## 1. API Overview

### Base Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Base URL** | `http://localhost:3000` | Default server host and port |
| **API Version** | `v1` | Current API version |
| **Content Type** | `application/json` | Request and response format |
| **Protocol** | `HTTP/HTTPS` | Communication protocol |

### Environment Configuration

The API reads configuration from environment variables:

```bash
PORT=3000                    # Server port (default: 3000)
DATABASE_URL=...             # PostgreSQL connection string
```

**Example Base URLs:**
- Development: `http://localhost:3000`
- Production: `https://api.example.com`

---

## 2. Authentication & Authorization

### Current State

**Authentication:** None  
**Authorization:** None

The User Factory API currently operates without authentication. All endpoints are publicly accessible.

### Future Considerations

The API is designed to support authentication via:
- JWT Bearer tokens
- API Keys
- OAuth 2.0 / OpenID Connect

When authentication is implemented, it will be documented in this section.

---

## 3. Endpoints

### POST /user - Create User

Creates a new user in the system with unique username and email constraints.

#### Request

**URL:** `POST /user`  
**Headers:**
```
Content-Type: application/json
```

**Request Body Schema:**

```json
{
  "name": "string",
  "username": "string",
  "email": "string"
}
```

**Fields:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| name | string | Yes | User's full name | - |
| username | string | Yes | Unique username | Must be unique across system |
| email | string | Yes | User email address | Must be valid email format, unique across system |

**Example Request:**

```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com"
}
```

#### Responses

##### Success (201 Created)

**Status Code:** `201`

**Response Body:**

```json
{
  "user": {
    "error": false,
    "status": 201,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| user.error | boolean | Always `false` on success |
| user.status | integer | HTTP status code (201) |
| user.data.id | string | UUID v4 generated identifier |
| user.data.name | string | User's full name |
| user.data.username | string | Unique username |
| user.data.email | string | User email address |

##### Error (400 Bad Request)

**Status Code:** `400`

**Response Body:**

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

**Error Conditions:**
- Username already exists in database
- Email already exists in database
- Validation errors (missing required fields)

**Note:** The error message contains a typo in the original implementation ("alredy" instead of "already").

#### cURL Examples

**Successful Request:**

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Error Request (Duplicate User):**

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Response:**

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

#### Status Codes

| Code | Description | Condition |
|------|-------------|-----------|
| 201 | Created | User successfully created |
| 400 | Bad Request | User already exists or validation error |
| 500 | Internal Server Error | Unexpected server error |

---

## 4. Data Models

### User Model

Represents a user entity in the system.

```typescript
interface User {
  id?: string      // UUID v4 (auto-generated)
  name: string     // User's full name
  username: string // Unique username
  email: string    // Unique email address
}
```

**Database Schema:**
```prisma
model User {
  id       String @id @default(uuid())
  name     String
  username String @unique
  email    String @unique
  
  @@map("users")
}
```

### Error Response Model

Standardized error response format.

```typescript
interface ErrorResponse {
  error: boolean   // Always true for errors
  status: number   // HTTP status code
  data: {
    message: string
  }
}
```

### Success Response Model

Standardized success response format.

```typescript
interface SuccessResponse<T> {
  error: boolean   // Always false for success
  status: number   // HTTP status code
  data: T          // Response data
}
```

---

## 5. Error Handling Strategy

### Error Response Format

All errors follow a consistent structure:

```json
{
  "response": {
    "error": true,
    "status": 400,
    "data": {
      "message": "Error description"
    }
  }
}
```

### Error Types

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Validation Error | Invalid input, missing fields, duplicate user |
| 400 | Conflict Error | User already exists (username or email) |
| 500 | Server Error | Unexpected server exception |

### Error Handling Flow

```
Request → Validation → Business Logic → Database
    ↓           ↓              ↓            ↓
  400       400/500         400          500
```

### Current Limitations

The API currently handles only duplicate user validation at the service layer. Database-level unique constraints provide additional protection.

**Known Issues:**
1. Error message typo: "User alredy exists" (should be "already")
2. No validation for email format
3. No sanitization of input data
4. No specific error codes for different validation failures

---

## 6. Rate Limiting

### Current State

**Rate Limiting:** None

The API currently has no rate limiting implementation.

### Recommendations

For production deployment, implement rate limiting:
- **Per IP:** 100 requests/minute
- **Per User:** 1000 requests/hour (when auth is added)
- **Burst Limit:** 10 requests/second

**Suggested Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

---

## 7. Versioning Strategy

### Current Version

**API Version:** 1.0.0  
**Versioning Method:** Path-based (planned)

### Planned Versioning Approach

```
Current:   /user
Planned:   /v1/user
Future:    /v2/user
```

### Backward Compatibility

The API will maintain backward compatibility for at least two major versions. Breaking changes will be documented in migration guides.

### Version Header Alternative

Consider supporting version headers:

```
Accept: application/vnd.userfactory.v1+json
```

---

## 8. OpenAPI/Swagger Specification

OpenAPI 3.0 specification for the User Factory API.

```yaml
openapi: 3.0.0
info:
  title: User Factory API
  description: REST API for user creation and management
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: http://localhost:3000
    description: Development server
  - url: https://api.example.com
    description: Production server

paths:
  /user:
    post:
      summary: Create a new user
      description: Creates a new user with unique username and email
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            example:
              name: John Doe
              username: johndoe
              email: john@example.com
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/SuccessResponse'
              example:
                user:
                  error: false
                  status: 201
                  data:
                    id: 550e8400-e29b-41d4-a716-446655440000
                    name: John Doe
                    username: johndoe
                    email: john@example.com
        '400':
          description: Bad request - user already exists
          content:
            application/json:
              schema:
                type: object
                properties:
                  response:
                    $ref: '#/components/schemas/ErrorResponse'
              example:
                response:
                  error: true
                  status: 400
                  data:
                    message: User alredy exists
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    CreateUserRequest:
      type: object
      required:
        - name
        - username
        - email
      properties:
        name:
          type: string
          description: User's full name
          example: John Doe
        username:
          type: string
          description: Unique username
          example: johndoe
        email:
          type: string
          format: email
          description: User email address
          example: john@example.com

    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: Unique identifier
          example: 550e8400-e29b-41d4-a716-446655440000
        name:
          type: string
          example: John Doe
        username:
          type: string
          example: johndoe
        email:
          type: string
          format: email
          example: john@example.com

    SuccessResponse:
      type: object
      properties:
        error:
          type: boolean
          example: false
        status:
          type: integer
          example: 201
        data:
          $ref: '#/components/schemas/User'

    ErrorResponse:
      type: object
      properties:
        error:
          type: boolean
          example: true
        status:
          type: integer
          example: 400
        data:
          type: object
          properties:
            message:
              type: string
              example: User alredy exists

    Error:
      type: object
      properties:
        message:
          type: string
```

**Visualization:** The OpenAPI spec can be visualized using tools like Swagger UI or Redoc.

---

## 9. Testing the API

### Postman Collection Structure

Import this collection into Postman to test the API.

```json
{
  "info": {
    "name": "User Factory API",
    "description": "API for user creation and management",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "Create User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"{{name}}\",\n  \"username\": \"{{username}}\",\n  \"email\": \"{{email}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/user",
              "host": ["{{baseUrl}}"],
              "path": ["user"]
            }
          },
          "response": []
        },
        {
          "name": "Create User - Duplicate",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"{{name}}\",\n  \"username\": \"{{username}}\",\n  \"email\": \"{{email}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/user",
              "host": ["{{baseUrl}}"],
              "path": ["user"]
            }
          },
          "response": []
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "name",
      "value": "John Doe"
    },
    {
      "key": "username",
      "value": "johndoe"
    },
    {
      "key": "email",
      "value": "john@example.com"
    }
  ]
}
```

### Test Scenarios

#### Test Case 1: Successful User Creation

**Objective:** Verify user creation works with valid data

**Steps:**
1. Send POST request to `/user` with valid data
2. Verify status code is 201
3. Verify response contains user with generated ID

**Expected Result:** User created successfully

#### Test Case 2: Duplicate Username

**Objective:** Verify duplicate username validation

**Steps:**
1. Create user with username "johndoe"
2. Attempt to create another user with same username
3. Verify status code is 400
4. Verify error message is returned

**Expected Result:** Error returned with message "User alredy exists"

#### Test Case 3: Duplicate Email

**Objective:** Verify duplicate email validation

**Steps:**
1. Create user with email "john@example.com"
2. Attempt to create another user with same email but different username
3. Verify status code is 400

**Expected Result:** Error returned

#### Test Case 4: Missing Required Fields

**Objective:** Verify validation for missing fields

**Steps:**
1. Send POST request without `name` field
2. Send POST request without `username` field
3. Send POST request without `email` field

**Expected Result:** Validation error returned

### Using cURL for Testing

**Quick Test Script:**

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)

echo "Testing User Factory API"
echo "========================"

# Test 1: Create user
echo -e "\n1. Creating new user..."
curl -s -X POST $BASE_URL/user \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User $TIMESTAMP\", \"username\": \"testuser$TIMESTAMP\", \"email\": \"test$TIMESTAMP@example.com\"}" \
  | jq .

# Test 2: Try duplicate
echo -e "\n2. Testing duplicate user..."
curl -s -X POST $BASE_URL/user \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test User $TIMESTAMP\", \"username\": \"testuser$TIMESTAMP\", \"email\": \"test$TIMESTAMP@example.com\"}" \
  | jq .

echo -e "\nTests completed!"
```

### Automated Testing

The API includes Jest test suites:

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Watch mode
npm run test:dev
```

**Test Locations:**
- `test/module/createUser/controller.spec.ts`
- `test/module/createUser/service.spec.ts`

---

## 📚 Additional Resources

### Related Documentation

- [README.md](../README.md) - Project overview and setup
- [Architecture Documentation](./architecture.md) - System architecture details
- [Database Schema](./database.md) - Database design

### API Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release - POST /user endpoint |

### Support

For API support and questions:
- GitHub Issues: [Project Issues]
- Documentation: [Project Docs]

---

**Last Updated:** August 23, 2024  
**Document Version:** 1.0.0  
**Maintainer:** Technical Writing Team
