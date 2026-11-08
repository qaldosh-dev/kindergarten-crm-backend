-- Store the original serialized response so JSONB/JSON-tree round trips cannot
-- change decimal representation or precision in a replayed financial response.
ALTER TABLE idempotency_request
    ALTER COLUMN response TYPE text USING response::text;
