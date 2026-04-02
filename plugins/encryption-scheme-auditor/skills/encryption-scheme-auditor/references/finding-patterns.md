# Encryption Scheme Finding Patterns

Common vulnerability patterns in AEAD and decrypt-error handling.

- **reused nonce under same key** — repeated nonce/key tuple reveals keystream structure and breaks confidentiality.
- **plaintext released before tag check** — decrypt pipeline exposes unauthenticated bytes before integrity verification.
- **distinct decrypt errors expose oracle** — attacker can distinguish padding/MAC/format failures and iterate chosen-ciphertext attacks.
- **KDF context strings reused across roles** — identical derivation context is used for independent protocol roles.
- **IV generated from predictable counter without uniqueness enforcement** — nonce source is guessable and can collide under restart or fork.
