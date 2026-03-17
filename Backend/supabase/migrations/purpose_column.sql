
ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'registration';


UPDATE email_verifications SET purpose = 'registration' WHERE purpose IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_verifications_purpose ON email_verifications(purpose);
