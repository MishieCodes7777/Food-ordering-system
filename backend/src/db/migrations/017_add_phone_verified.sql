-- Registration is now OTP-gated (see authController.sendRegistrationOtp /
-- verifyRegistrationOtp) — a user row is only ever created after the phone
-- number has been confirmed via OTP, so this defaults new accounts to
-- verified at creation time (set explicitly in the INSERT). Existing
-- accounts created before this feature predate any verification and default
-- to FALSE, which is accurate, not a bug.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- NOTE: phone is NOT unique at the DB level yet — the live database has
-- pre-existing duplicate phone numbers from test data. Uniqueness is
-- enforced at the application layer (authController.sendRegistrationOtp)
-- instead. Once test data is cleaned up, add:
--   ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
