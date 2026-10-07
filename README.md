# Job Portal — SQLite Microservices

An existing React + Vite job portal refactored into independently deployable Express services. The browser talks only to the API Gateway; every backend service owns its API and SQLite database.

## Architecture

| Component | Local port | Owns |
|---|---:|---|
| React + Vite frontend | 5173 | Browser UI |
| API Gateway | 4000 | CORS and REST request routing |
| Auth Service | 4001 | Registration, password hashes, login, JWT |
| Job Service | 4002 | Job CRUD, searching, recruiter association |
| User Service | 4003 | User profiles and account status |
| Application Service | 4004 | Applications and uploaded resumes |

The gateway maps `/api/auth/*`, `/api/users/*`, `/api/jobs/*`, and `/api/applications/*` to their respective services. Its combined OpenAPI 3 specification and Swagger UI are available at <http://localhost:4000/docs>; the JSON specification is at <http://localhost:4000/docs/openapi.json>. The Swagger UI sends Try it out requests through the gateway and supports JWT bearer authorization. Gateway health checks for individual services are available under `/api/{service}/health`.

Service-to-service requests use HTTP APIs and internal service authentication; no service imports another service's source or opens another service's SQLite file.

SQLite databases are kept separately under each service's `prisma/data` directory:

- `services/auth-service/prisma/data/auth.db`
- `services/user-service/prisma/data/user.db`
- `services/job-service/prisma/data/job.db`
- `services/application-service/prisma/data/application.db`

Each database has its own Prisma schema and generated client. Resume uploads are owned by Application Service. The previous combined `backend/` workspace is retained as legacy source, but it is not part of the current runtime, workspaces, Compose stack, or CI build.

## Run locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev
```

`npm run dev` creates ignored service `.env` files from their `.env.example` templates when missing, generates all four Prisma clients, ensures the SQLite schemas are in sync, and starts the frontend, gateway, and services.

Open <http://localhost:5173>. The frontend's API URL is <http://localhost:4000/api>; it does not call service ports directly.

Run a single component from the repository root:

```powershell
npm run dev:frontend
npm run dev:gateway
npm run dev:auth
npm run dev:user
npm run dev:job
npm run dev:application
```

If a port is already in use, stop the older process before starting another full stack. Ports are 5173 and 4000–4004.

## Databases and demo data

Each service uses its own SQLite datasource URL from its `.env` file. Generate each service's client and create/update all four local schemas with:

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run db:push
```

`npm run prisma:migrate` runs each service's Prisma migration command. Start the services first, then load demo users/profiles and jobs:

```powershell
npm run db:seed
```

Demo accounts:

- Admin: `admin@jobportal.local` / `Admin@123`
- Recruiter: `recruiter@jobportal.local` / `Recruiter@123`
- Applicant: `applicant@jobportal.local` / `Applicant@123`

Public registration permits Applicant and Recruiter roles; Admin accounts are provisioned by the seed process.

## Docker Compose

Run the whole system on the shared `job-portal-network`:

```powershell
docker compose up --build
```

Compose configures service-name URLs between containers and persists each SQLite database and uploaded resumes in separate named volumes. The browser uses the published gateway at `http://localhost:4000`.

Compose seeds demo accounts and jobs on first startup; service databases persist in named volumes.

Stop containers without deleting persisted databases:

```powershell
docker compose down
```

## Kubernetes manifests

`k8s/services.yaml` defines the four service Deployments/Services and separate persistent claims for each SQLite database and resume storage. The gateway and frontend manifests remain separate. Before deploying, replace the sample GHCR image owner and development values in `k8s/secret.yaml`; then apply the namespace, ConfigMap/Secret, services, gateway, frontend, and ingress manifests. Each SQLite-backed service is intentionally configured as a single replica.

## Health endpoints

All should return HTTP 200 with a JSON `{ "status": "ok", "service": "..." }` response:

- <http://localhost:4000/health> — Gateway
- <http://localhost:4001/health> — Auth Service
- <http://localhost:4002/health> — Job Service
- <http://localhost:4003/health> — User Service
- <http://localhost:4004/health> — Application Service
- <http://localhost:4000/api/auth/health> — Auth Service through Gateway
- <http://localhost:4000/api/users/health> — User Service through Gateway
- <http://localhost:4000/api/jobs/health> — Job Service through Gateway
- <http://localhost:4000/api/applications/health> — Application Service through Gateway

## Tests and builds

```powershell
npm test
npm run build
npm run lint
```

Each service has independent Prisma commands, for example:

```powershell
npm run prisma:generate --workspace services/auth-service
npm run prisma:migrate --workspace services/auth-service
```

Repeat with `services/user-service`, `services/job-service`, or `services/application-service` to operate on the other isolated database.
Jenkins CI pipeline configured successfully.