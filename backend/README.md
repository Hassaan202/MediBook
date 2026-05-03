# MediBook Backend

Node.js API for MediBook using Express, Mongoose, and JWT authentication.

## Prerequisites

- Node.js 18 or newer
- MongoDB reachable at the URI you configure. A typical local setup matches `mongodb://127.0.0.1:27017/medibook_db` when authentication is disabled on the server.

## Setup

1. From the `backend` directory, install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and edit values:

   ```bash
   cp .env.example .env
   ```

   Set `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` to strong, unique values. `JWT_SECRET` and `JWT_REFRESH_SECRET` must differ.

3. Optional: load demo accounts (see [Seed data](#seed-data)):

   ```bash
   npm run seed
   ```

## Run

Development (auto-restart):

```bash
npm run dev
```

Production:

```bash
npm start
```

The server listens on `PORT` from `.env` (default `5000`).

## API base URL

- Auth: `http://localhost:5000/api/auth`
- Users: `http://localhost:5000/api/users`
- Doctors: `http://localhost:5000/api/doctors`
- Patients: `http://localhost:5000/api/patients`
- Appointments: `http://localhost:5000/api/appointments`
- Notifications: `http://localhost:5000/api/notifications`
- Medical records: `http://localhost:5000/api/medical-records`
- Prescriptions: `http://localhost:5000/api/prescriptions`
- Reviews: `http://localhost:5000/api/reviews`

Protected routes expect header: `Authorization: Bearer <accessToken>` unless noted as public.

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (creates `User` and `Doctor` or `Patient` when applicable) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout (requires `Authorization: Bearer <accessToken>`) |
| POST | `/api/auth/refresh-token` | New access token using refresh token body |
| POST | `/api/auth/forgot-password` | Start password reset (non-production responses may include `resetTokenForDevelopment`) |
| POST | `/api/auth/reset-password` | Complete reset with `token` and new `password` |
| GET | `/api/auth/me` | Current user and role profile |

## Users endpoints

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/users/me` | Update profile (`name`, `avatar`, and for patients `phone`, `address`, `emergencyContact`) |

## Doctors (public list/detail/schedule; auth for mutations)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/doctors/search` | Public (same filters as list) |
| GET | `/api/doctors` | Public — query: `page`, `limit`, `specialty`, `available`, `minRating`, `minFees`, `maxFees`, `search` |
| GET | `/api/doctors/:id/schedule` | Public — next 7 days of generated slots minus booked |
| GET | `/api/doctors/:id` | Public |
| GET | `/api/doctors/:id/appointments` | Doctor (own) or admin |
| POST | `/api/doctors` | Admin |
| PUT | `/api/doctors/:id` | Doctor (own) or admin |
| PATCH | `/api/doctors/:id/availability` | Doctor (own) or admin — body `available`, `availableSlots` |
| DELETE | `/api/doctors/:id` | Admin — soft delete (`deletedAt`) |

## Patients

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/patients` | Doctor or admin |
| POST | `/api/patients` | Admin |
| GET | `/api/patients/:id/appointments` | Patient (own) or admin |
| GET | `/api/patients/:id/medical-history` | Patient, doctor, or admin — returns `summary` (aggregate) and `records` (recent non-confidential for patients) |
| GET | `/api/patients/:id` | Patient (own), doctor, or admin |
| PUT | `/api/patients/:id` | Patient (own) or admin |
| DELETE | `/api/patients/:id` | Admin — soft delete |

## Appointments

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/appointments/check-availability` | Public — query `doctorId`, `date` (ISO), `timeSlot` |
| GET | `/api/appointments/upcoming` | Patient, doctor, or admin |
| GET | `/api/appointments/past` | Patient, doctor, or admin |
| POST | `/api/appointments` | Patient — book (`doctorId`, `appointmentDate`, `timeSlot`, optional `duration`, `type`, `symptoms`) |
| GET | `/api/appointments` | Patient (own), doctor (own), or admin |
| GET | `/api/appointments/:id` | Participant or admin |
| PUT | `/api/appointments/:id` | Participant or admin — `symptoms`, `notes`, `type`, `duration` |
| DELETE | `/api/appointments/:id` | Participant or admin — cancel (24h rule; admin exempt) |
| PATCH | `/api/appointments/:id/status` | Doctor or admin |
| PATCH | `/api/appointments/:id/confirm` | Doctor (own appointment) |
| POST | `/api/appointments/:id/reschedule` | Participant or admin — body `appointmentDate`, `timeSlot`, optional `duration` |

## Notifications

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/notifications/unread` | User |
| PATCH | `/api/notifications/mark-all-read` | User |
| GET | `/api/notifications` | User — query `page`, `limit`, `type` |
| PATCH | `/api/notifications/:id/read` | User |
| DELETE | `/api/notifications/:id` | User |

## Medical records

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/medical-records` | Admin (all), patient (own), doctor (access per policy) |
| GET | `/api/medical-records/search` | Same as list — query diagnosis, dates, patient |
| GET | `/api/medical-records/patient/:patientId/summary` | Allowed roles with access |
| GET | `/api/medical-records/patient/:patientId` | Patient history |
| GET | `/api/medical-records/:id` | Allowed with ownership / access |
| POST | `/api/medical-records` | Doctor |
| PUT | `/api/medical-records/:id` | Authoring doctor |
| DELETE | `/api/medical-records/:id` | Admin |
| POST | `/api/medical-records/:id/attachments` | Doctor — multipart |
| DELETE | `/api/medical-records/:id/attachments/:attachmentId` | Doctor |
| POST | `/api/medical-records/:id/lab-results` | Doctor |

## Prescriptions

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/prescriptions` | Admin, patient (own), doctor (own issued) |
| GET | `/api/prescriptions/patient/:patientId/active` | Access per policy |
| GET | `/api/prescriptions/patient/:patientId` | Access per policy |
| GET | `/api/prescriptions/:id/pdf` | Access per policy — PDF download |
| GET | `/api/prescriptions/:id` | Access per policy |
| POST | `/api/prescriptions` | Doctor |
| PUT | `/api/prescriptions/:id` | Authoring doctor (within validity rules) |
| DELETE | `/api/prescriptions/:id` | Doctor or admin — cancel |
| POST | `/api/prescriptions/:id/medications` | Authoring doctor |
| DELETE | `/api/prescriptions/:id/medications/:medicationIndex` | Authoring doctor |
| PATCH | `/api/prescriptions/:id/status` | Authoring doctor |

## Reviews

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/reviews/doctor/:doctorId` | Public or authenticated (see route) |
| GET | `/api/reviews/patient/:patientId` | Patient (own) or admin |
| POST | `/api/reviews` | Patient — completed appointment |
| PUT | `/api/reviews/:id` | Authoring patient |
| DELETE | `/api/reviews/:id` | Patient or admin |
| POST | `/api/reviews/:id/response` | Doctor (reviewed provider) |

## Background jobs

On server start the API runs an appointment reminder pass and a prescription expiry pass, then hourly reminders and daily expiry checks (see `src/jobs`).

## Seed data

Running `npm run seed` deletes prior seed users (by email), their doctor/patient profiles, related reviews, medical records, prescriptions, appointments and notifications, then recreates:

- `admin@medibook.com` — admin (password `password`)
- `doctor1@medibook.com` … `doctor6@medibook.com` — six doctors with specialties and working hours (password `password`)
- `patient1@medibook.com` … `patient4@medibook.com` — four patients (password `password`)
- Thirty-two sample appointments (including completed history), twenty-eight medical records, eighteen prescriptions, fourteen reviews, and two notifications

Public registration enforces a stronger password rule (uppercase, lowercase, digit). Seed accounts use `password` for local development only.

## CORS

`CORS_ORIGIN` in `.env` should match your Vite dev server (default `http://localhost:5173`). Requests may send credentials when you enable cookies or auth headers from that origin.

## Lint

```bash
npm run lint
```
