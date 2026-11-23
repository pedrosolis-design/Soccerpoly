# Security Specification — Monopolio Futbolero 412 Firestore Rules

## 1. Data Invariants
1. **Owner-Isolated Profiles (`/users/{userId}`)**: A profile document may only be read, created, or updated by the signed-in Firebase Auth user whose `request.auth.uid == userId` (with aggregate listing/reading restricted exclusively to the email-verified creator admin `nsoliscordova@gmail.com`), and `uid == request.auth.uid` immutable after creation. No PII (`email`, `phone`, `address`) is stored in the profile document.
2. **Temporal & Schema Integrity**: Every `create` enforces exact required/allowed keys via `hasAll` + `hasOnly`, bounded string sizes matching `firebase-blueprint.json`, integer range checks, and `request.time` server timestamps (`createdAt`, `updatedAt`, `wonAt`).
3. **Action-Scoped Profile Updates**: Updates are split into explicit actions (`isIdentityUpdateAction` or `isStatsUpdateAction`) guarded by `affectedKeys().hasOnly(...)` and `isValidUserProfile(incoming())`.
4. **Immutable Hall of Fame (`/hallOfFame/{recordId}`)**: Signed-in users (including username+password accounts) can create a `ChampionRecord` with `recordedByUid == request.auth.uid`, `points >= 60`, valid hex jersey colors, and `isPublic == true`. Once written, records cannot be updated or deleted.

## 2. "Dirty Dozen" Adversarial Test Payloads
1. **Identity Spoofing on Profile**: Creating `/users/victimUid` as `attackerUid` -> `PERMISSION_DENIED`.
2. **UID Field Hijack**: Creating `/users/attackerUid` with `{ uid: "victimUid", ... }` -> `PERMISSION_DENIED`.
3. **Ghost Field / Shadow Write on Profile**: Creating or updating `/users/attackerUid` with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
4. **Immutable Field Tampering**: Updating `/users/attackerUid` changing `createdAt` or `uid` -> `PERMISSION_DENIED`.
5. **Admin Email Spoofing**: Attempting admin `list` on `/users` with `email == "nsoliscordova@gmail.com"` and `email_verified == false` -> `PERMISSION_DENIED`.
6. **Client-Forged Timestamp**: Creating profile or Hall of Fame entry with past/future `createdAt` / `wonAt != request.time` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Reading/creating a document with `recordId` > 128 chars or invalid chars (`../`) -> `PERMISSION_DENIED`.
8. **Resource Exhaustion (1MB String)**: Submitting `clubName` or `displayName` exceeding 24 chars -> `PERMISSION_DENIED`.
9. **Out-of-Range Game Stats**: Creating `hallOfFame` record with `points: 10` (< 60 required for Triplete) or `playersCount: 99` -> `PERMISSION_DENIED`.
10. **Invalid Hex Color Injection**: Submitting `color: "red"` instead of `^#[0-9a-fA-F]{6}$` -> `PERMISSION_DENIED`.
11. **Hall of Fame Tampering**: Updating or deleting an existing `/hallOfFame/{recordId}` document -> `PERMISSION_DENIED`.
12. **Blanket User Listing**: Attempting `list` on `/users` as a normal user -> `PERMISSION_DENIED`.
