# Encryption Scheme Audit Checklist

## Nonce generation and reuse

- [ ] Nonce generation guarantees uniqueness per key and mode
- [ ] Nonce reuse is prevented across retries, restarts, and multi-process deployments
- [ ] Nonce storage/transport preserves full entropy and ordering requirements

## AEAD verification discipline

- [ ] AEAD tag verification occurs before plaintext is returned or acted upon
- [ ] Decrypt failure paths avoid exposing partially decrypted plaintext
- [ ] Ciphertext length and framing checks occur before downstream parsing

## Associated-data binding

- [ ] All security-relevant metadata is included as associated-data
- [ ] Associated-data inputs are canonicalized consistently between encrypt and decrypt
- [ ] Context/domain tags are included for role and message-type separation

## Oracle and error behavior

- [ ] Padding and MAC failures return indistinguishable decrypt errors
- [ ] Retry and logging paths do not create timing or detail oracles
- [ ] Backoff and lockout controls are applied to repeated decrypt failures

## KDF and key lifecycle

- [ ] KDF contexts are separated for encryption, authentication, and key wrapping roles
- [ ] Key rotation and algorithm agility are documented and enforced
- [ ] Legacy mode compatibility does not silently weaken verification requirements
