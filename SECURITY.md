# Security Policy

## 1. Supported Versions

| Version | Supported          | Status                                 |
| ------- | ------------------ | -------------------------------------- |
| 1.0.x   | :white_check_mark: | Current Active Release                 |
| < 1.0.0 | :x:                | Developmental Checkpoints (Deprecated) |

---

## 2. Platform Architecture & Data Classification

* **Synthetic Demonstration Data:** The default organizational profiles (e.g., "ABC Financial Services", "Acme Aerospace Corp"), user credentials, asset monetary evaluations, threat frequencies, and security control unit costs are **entirely synthetic demonstration parameters**. They do not represent real-world enterprise infrastructure or proprietary financial records.
* **Public Vulnerability Telemetry:** All vulnerability records (CVE identifiers, CVSS metrics, Common Platform Enumerations, and CISA Known Exploited Vulnerability tags) are sourced from **publicly accessible government and standard registries** (NIST NVD, CISA KEV) and are cached locally.
* **Zero Active Network Scanning:** PS105 performs **no active port scanning, packet capture, host agent installation, or dynamic network penetration**. All applicability determinations operate via deterministic string and version matching against user-declared asset inventories.

---

## 3. Reporting a Vulnerability

If you identify a security defect, privilege boundary bypass, authentication flaw, or injection vulnerability in PS105, please report it responsibly:

* **Primary Contact:** Harsh Tayal (`harshtayal710@gmail.com`)
* **GitHub Advisory:** You may also submit a confidential report via GitHub Security Advisories on the repository page.
* **Response Timeline:** We acknowledge vulnerability reports within **48 hours** and provide an assessment or patch plan within **7 calendar days**.

Please **do not** report suspected vulnerabilities via public GitHub issues.

---

## 4. Production Deployment Hardening Checklist

When deploying PS105 beyond local academic or demonstration environments:

1. **Rotate Cryptographic Keys:** Immediately generate a cryptographically random, 256-bit secret key for `SECRET_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. **Set Mandatory Passwords:** Provide a complex secret via `DEMO_USER_PASSWORD` in the environment before seeding.
3. **Database Migration:** Transition from local SQLite to managed PostgreSQL (`DATABASE_URL=postgresql://user:pass@host:5432/dbname`) with connection pooling and SSL mode enabled.
4. **Enforce HTTPS / TLS:** Ensure reverse proxies (Nginx, Traefik, Caddy, Cloudflare) terminate TLS 1.3 and forward strict HTTP headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`).
5. **CORS Restrictions:** Restrict `CORS_ORIGINS` to trusted enterprise domain names.
