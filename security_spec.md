# Security Specification — ENGLISH PATH A1-B1

## 1. Data Invariants

1. **PII Isolation (`users/{userId}`)**: A user profile containing `email` and personal study stats can only be read (`get`) by its owner (`request.auth.uid == userId`) or a verified Admin (`isAdmin()`). Listing all users is strictly restricted to Admins.
2. **RBAC Privilege Integrity (`admins/{adminId}`)**: Regular users can never grant themselves admin rights or inject a `role`/`isAdmin` shadow field into `users/{userId}`. Admin status is determined exclusively by `admins/{uid}` existence or the verified bootstrapped admin email (`buocngoat2020@gmail.com` with `email_verified == true`).
3. **Curriculum Authority (`levels`, `lessons`)**: Only verified Admins can create, update, or delete levels and lessons. Authenticated learners can only read published (`isPublished == true`) levels and lessons.
4. **Learner Progress Ownership (`user_progress`, `user_vocabulary`)**: Every document's `uid` must strictly equal `request.auth.uid`, and composite IDs must follow `{uid}_{lessonId}` or `{uid}_{vocabularyId}`. Users can only list their own records (`resource.data.uid == request.auth.uid`).
5. **Immutable Quiz Integrity (`quiz_results`)**: Quiz results are append-only (`allow update: if false`). Users cannot modify their own or another user's scores. `correctAnswers + wrongAnswers == totalQuestions`, and `completedAt == request.time`.
6. **Temporal & Volumetric Integrity**: All timestamps must match `request.time`. All string fields enforce `.size()` bounds, all arrays enforce `.size() <= MAX`, and all document IDs enforce `isValidId()`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on User Create**: Authenticated user `uidA` creates `/users/uidB` with `uid: "uidB"`. -> **PERMISSION_DENIED**
2. **Privilege Escalation Shadow Field**: Authenticated user `uidA` creates or updates `/users/uidA` with ghost key `isAdmin: true` or `role: "admin"`. -> **PERMISSION_DENIED**
3. **PII Blanket Scrape**: Non-admin user `uidA` attempts `get` on `/users/uidB` or `list` on `/users`. -> **PERMISSION_DENIED**
4. **Email Spoofing Attack**: User with `email: "buocngoat2020@gmail.com"` and `email_verified: false` attempts to create a lesson in `/lessons/a1-1`. -> **PERMISSION_DENIED**
5. **Learner Curriculum Tampering**: Verified non-admin learner attempts to update `/lessons/a1-01` or create `/levels/C2`. -> **PERMISSION_DENIED**
6. **Quiz Score Forgery (Update)**: Learner `uidA` attempts to `update` their own `/quiz_results/res_1` to change `score` from `40` to `100`. -> **PERMISSION_DENIED**
7. **Cross-User Quiz Submission**: Learner `uidA` attempts to `create` `/quiz_results/res_2` with `uid: "uidB"`. -> **PERMISSION_DENIED**
8. **Invalid Quiz Math**: Learner `uidA` creates `/quiz_results/res_3` with `totalQuestions: 15`, `correctAnswers: 15`, `wrongAnswers: 5`. -> **PERMISSION_DENIED**
9. **Client Timestamp Manipulation**: Learner creates `/user_progress/uidA_a1-01` with a backdated `createdAt` instead of `request.time`. -> **PERMISSION_DENIED**
10. **ID Poisoning Attack**: User attempts to write to `/user_progress/../../../malicious$id` or a 200-character ID. -> **PERMISSION_DENIED**
11. **Array Exhaustion (Denial of Wallet)**: Learner updates `/user_progress/uidA_a1-01` with 100 items in `vocabularyLearned` (limit 40). -> **PERMISSION_DENIED**
12. **Unscoped List Query**: Non-admin user executes `list` on `/quiz_results` without filtering `where('uid', '==', request.auth.uid)`. -> **PERMISSION_DENIED**
13. **Admin Vault Read/Write by Learner**: Non-admin learner attempts `get`, `list`, `create`, or `update` on `/admin_security/vault`. -> **PERMISSION_DENIED**
14. **Admin Vault Plaintext or Weak Hash Injection**: Admin attempts to store a plaintext password (`hashHex: "myPassword!"` non-hex or `iterations: 10`) or shadow field `plainPassword` in `/admin_security/vault`. -> **PERMISSION_DENIED**
15. **Non-Root Admin Vault Wipe**: Secondary admin (not bootstrapped root admin) attempts `delete` on `/admin_security/vault` to bypass the management password. -> **PERMISSION_DENIED**

