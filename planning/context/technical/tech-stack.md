# Tech Stack Overview

Based on `planning/context/business/task.md`, this project is a small full-stack authentication module: signup, signin, a protected application page, NestJS backend, MongoDB database, README, and required `AI.md`.

## Selected Stack

| Area                 | Technology                                     |
| -------------------- | ---------------------------------------------- |
| Frontend             | React, Vite, TypeScript                        |
| Routing              | React Router                                   |
| Forms                | React Hook Form                                |
| Frontend validation  | Zod                                            |
| Backend              | NestJS, TypeScript                             |
| Database             | MongoDB                                        |
| Database integration | Mongoose / `@nestjs/mongoose`                  |
| Backend validation   | `class-validator`, `class-transformer`         |
| Authentication       | JWT-based auth                                 |
| Password hashing     | Argon2id                                       |
| Testing              | Jest, Supertest, Vitest, React Testing Library |
| Optional E2E         | Playwright                                     |
| Package manager      | pnpm                                           |
| Node version         | Node.js 22 LTS                                 |
| Local infrastructure | Docker Compose for MongoDB                     |

## Frontend

React with Vite is the simplest fit for a fast TypeScript authentication task. The frontend only needs three routes: signup, signin, and the protected application page.

React Hook Form and Zod cover the required form validation cleanly:

- signup email format,
- signup name minimum length,
- signup password complexity,
- signin email and password fields.

## Backend

NestJS matches the required backend framework and gives a clean module structure for auth, users, validation, guards, and configuration.

MongoDB is required by the task. Mongoose is the most direct NestJS-compatible choice for modeling the user collection.

## Authentication

JWT auth is the default fit for this scope. The backend handles signup, signin, and one protected endpoint such as `/auth/me`.

Passwords should be stored as hashes only, using Argon2id.

## Testing

Backend testing should use Jest and Supertest for the auth API and protected endpoint.

Frontend testing should use Vitest and React Testing Library for form validation and route protection.

Playwright is optional for a single browser smoke test covering signup, signin, logout, and the protected welcome page.
