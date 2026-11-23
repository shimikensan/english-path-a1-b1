# Security Specification — ENGLISH PATH A1-B1

## 1. Data Invariants

1. **PII Isolation (`users/{userId}`)**: A user profile containing `email` and personal study stats can only be read (`get`) by its owner (`request.auth.uid == userId`) or a verified Admin (`isAdmin()`). Listing all users is strictly restricted to Admins.
2. **RBAC Privilege Integrity (`admins/{adminId}`)**: Regular users can never grant themselves admin rights or inject a `role`/`isAdmin` shadow field into `users/{userId}`. Admin status is determined exclusively by `admins/{uid}` existence or the verified bootstrapped admin email (`buocngoat2020@gmail.com` with `email_verified == true`).
3. **Curriculum Authority (`levels`, `lessons`)**: Only verified Admins can create, update, or delete levels and lessons. Authenticated learners can only read published (`isPublished == true`) levels and lessons.
4. **Learner Progress Ownership (`user_progress`, `user_vocabulary`)**: Every document's `uid` must strictly equal `request.auth.uid`, and composite IDs must follow `{uid}_{lessonId}` or `{uid}_{vocabularyId}`. Users can only list their own records (`resource.data.uid == request.auth.uid`).
5. **Immutable Quiz Integrity (`quiz_results`)**: Quiz results are append-only (`allow update: if false`). Users cannot modify their own or another user's scores. `correctAnswers + wrongAnswers == totalQuestions`, and `completedAt == request.time`.
6. **Temporal & Volumetric Integrity**: All timestamps must match `request.time`. All string fields enforce `.size()` bounds, all arrays enforce `.size() <= MAX`, and all document IDs enforce `isValidId()`.
7. **Feedback PII Isolation & Admin Triage (`user_feedback/{feedbackId}`)**: Learner feedback contains `userEmail` (PII) and can only be read (`get`/`list`) by its author (`existing().uid == request.auth.uid`) or a verified Admin (`isAdmin()`). On creation, verified users must own `uid`, set `status == 'new'` and `adminNote == ''`, and exist in `/users/{uid}`. Only Admins can update `status`, `adminNote`, and `updatedAt` while all original learner-submitted fields remain strictly immutable. Only Admins can delete feedback records.
8. **Reading Comprehension Authority (`reading_passages/{passageId}`)**: Only verified Admins can create, update, or delete reading passages. Authenticated learners can only read published (`isPublished == true`) passages. All string lengths, `keyPhrases` array size (`<= 12`), immutable `passageId`/`createdAt`, and server `request.time` timestamps are strictly enforced.
9. **Account Revocation & Safe Deletion (`revoked_users/{userId}`, `users/{userId}`, `admins/{adminId}`)**: Only verified Admins can create or delete revocation records in `/revoked_users/{userId}`, and no Admin can revoke or delete themselves (`userId != request.auth.uid`) or the bootstrapped root administrator (`buocngoat2020@gmail.com`). Revoked users are blocked at the database rules layer from creating or updating `/users/{uid}`, preventing profile recreation after deletion. Revocation records contain PII (`email`, `fullName`) and are readable (`get`) only by the affected user (to detect their own revocation) or verified Admins; `list` is restricted strictly to Admins.
10. **3D English Club Presence & Direct Messaging (`club_members/{userId}`, `club_messages/{messageId}`)**: Club presence documents contain zero PII (`displayName`, `currentLevel`, `avatarGender`, `posX`, `posZ`, `rotationY`, `isOnline`) and can only be written by their verified non-revoked owner (`request.auth.uid == userId`). Direct 1-on-1 club messages (`club_messages`) are immutable, strictly scoped to the 2 `participants` (sender and receiver) on both `get` and `list`, require `senderUid == request.auth.uid`, forbid self-messaging (`senderUid != receiverUid`), and enforce message size (`<= 1000`) and server `request.time`.

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
16. **Leaderboard PII Injection / Spoofing**: Authenticated user `uidA` attempts to write an `email` field or write to `/leaderboard/uidB` or set `completionPercent: 500`. -> **PERMISSION_DENIED**
17. **Unauthenticated Leaderboard Write**: Unauthenticated visitor attempts `create`, `update`, or `delete` on `/leaderboard/uidA`. -> **PERMISSION_DENIED**
18. **Feedback Cross-User PII Read**: Non-admin user `uidA` attempts `get` on `/user_feedback/fb_other` owned by `uidB`, or executes an unscoped `list` on `/user_feedback`. -> **PERMISSION_DENIED**
19. **Feedback Self-Resolution / Status Spoofing**: Learner `uidA` attempts to `create` a feedback document with `status: "resolved"` or pre-filled `adminNote`, or attempts to `update` their own feedback ticket. -> **PERMISSION_DENIED**
20. **Feedback Admin Tampering of Original Submission**: Admin attempts to `update` a feedback ticket's `content`, `rating`, `uid`, or `createdAt` instead of only `status`, `adminNote`, and `updatedAt`. -> **PERMISSION_DENIED**
21. **Learner Reading Passage Write**: Verified non-admin learner attempts to `create`, `update`, or `delete` `/reading_passages/read_01`. -> **PERMISSION_DENIED**
22. **Unpublished Reading Passage Read**: Non-admin learner attempts `get` or `list` on `/reading_passages/draft_01` where `isPublished == false`. -> **PERMISSION_DENIED**
23. **Reading Passage Shadow Field / Array Overflow**: Admin attempts to `create` or `update` `/reading_passages/read_01` with 25 items in `keyPhrases` (limit 12) or a ghost field `authorSecret: "x"`. -> **PERMISSION_DENIED**
24. **Revoked User Profile Recreation**: Deleted user `uidA` (present in `/revoked_users/uidA`) attempts to `create` `/users/uidA` to regain app access. -> **PERMISSION_DENIED**
25. **Revocation Registry Self-Delete / PII Scrape**: Learner `uidA` attempts to `delete` `/revoked_users/uidA` or `list` `/revoked_users`. -> **PERMISSION_DENIED**
26. **Bootstrapped Admin Deletion Attempt**: Secondary admin attempts to `delete` `/users/{rootAdminUid}` or create `/revoked_users/{rootAdminUid}` targeting `buocngoat2020@gmail.com`. -> **PERMISSION_DENIED**
27. **Club Avatar Impersonation**: Verified user `uidA` attempts to `create` or `update` `/club_members/uidB` or inject `email` into `/club_members/uidA`. -> **PERMISSION_DENIED**
28. **Private Club DM Eavesdropping**: User `uidC` attempts `get` or unscoped `list` on `/club_messages` belonging to `[uidA, uidB]`. -> **PERMISSION_DENIED**
29. **Club DM Sender Spoofing / Mutation**: User `uidA` attempts to `create` a message with `senderUid: "uidB"`, or `update` an existing message's `text`. -> **PERMISSION_DENIED**
