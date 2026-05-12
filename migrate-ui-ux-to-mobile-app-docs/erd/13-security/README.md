# 13-security — Security + secrets management

**System spec:** `docs/site/software/systems/13-security-secrets-management.md`
**Sequences:** `docs/sequences/13-security/*.sequence.mmd`
**Owning service(s):** `SecurityService`, `SecretsCache`, `BruteForceDetector`, `CertificateVerifier`
**Lane:** B (worker-1, Phase 2)
**Status:** pending entity extraction.

## Planned entities (from plan §3 manifest)

| Entity | Role |
|---|---|
| `kms_keys` | KMS key metadata (not the key material). |
| `secret_versions` | Secret-version history. |
| `key_rotations` | Key-rotation audit log. |
| `brute_force_lockouts` | Login-lockout records. |
| `mtls_certificates` | Device mTLS certificate registry. |
