# EnvGuardd

**A zero-knowledge secrets manager for environment variables.** Secrets are encrypted on your device, so a leaked database or a hacked server cannot read them.

*Group 6 · Department of Computer Science, National University of Computer and Emerging Sciences (FAST-NUCES), Lahore*

| Team member | Roll number |
|---|---|
| Walija Fatima | 23L-3055 |
| Mirfaq Javaid | 23L-3061 |
| Maryam Irshad | 23L-3093 |

> **Status:** project proposal. This README describes what we plan to build.

---

## The problem

API keys, database passwords and signing keys usually live in environment variables and `.env` files. In practice they get:

- copied between developers over chat or email,
- committed to repositories by mistake,
- kept for years without rotation.

Even secrets managers usually trust the server fully: if the server, its database or an admin account is hacked, every secret can leak at once. Their audit logs can often be edited or deleted by the server without anyone noticing. Other common risks are one long-lived encryption key, keys made from weak passwords, and stolen browser sessions.

## What EnvGuard is

A prototype with a **web app** and a **command-line tool (CLI)**. It uses passkey (WebAuthn) login, and all encryption and decryption happens on the client. The server stores only encrypted data.

Our aim: confidentiality that does not depend on the server, damage from a stolen key that stays contained, and a history of sensitive actions that anyone can verify.

## Features

| # | Feature | What it does |
|---|---|---|
| 1 | **Hardware-bound key** | The vault's key-encryption key is tied to your hardware authenticator through the WebAuthn **PRF extension**. |
| 2 | **Envelope encryption** | Each environment (dev, prod, ...) has its own data key. One leaked key does not expose everything, and keys can be rotated from the CLI. |
| 3 | **Tamper-evident audit log** | Every log entry is linked to the previous one by a hash. Any edit or deletion breaks the chain, and a verify command detects it. |
| 4 | **Step-up authentication** | Sensitive actions on protected environments need an extra authentication check. |
| 5 | **One-time secret sharing** | Share a secret through a self-destructing link, encrypted on the client. |
| 6 | **Anomaly detection** | A model learns each user's normal access pattern and flags unusual behavior, for example someone who normally reads dev secrets by day suddenly listing every production secret at night. A flag triggers step-up authentication. |

The anomaly model uses **metadata only** (event type, time, user, environment). It never sees decrypted secret values.

## Scope

**In scope:** web app and CLI, passkey login with WebAuthn PRF, client-side AES-GCM encryption, envelope encryption with key wrapping, hash-chained audit log, step-up authentication, one-time sharing, and a server-side anomaly model trained on audit metadata.

**Out of scope:** hardware security module (HSM) integration, single sign-on, formal certification, and authenticators without PRF support (except a clearly labeled password-based fallback).

EnvGuard is a prototype. It does not replace a production-grade secrets management service.

## Background and standards

- **WebAuthn and PRF:** the hardware authenticator produces a stable secret, and an encryption key is derived from it with **HKDF**.
- **AES-GCM** encrypts data, and **AES Key Wrap** protects the keys.
- **NIST SP 800-57** advises separate keys per purpose, regular rotation, and designs where losing one key does not expose all data.
- **Secure logging:** Schneier and Kelsey, and Crosby and Wallach, show how hash-linked entries make logs tamper-evident.
- **Isolation Forest** finds unusual events without labeled attack data.

## References

1. W3C, "Web Authentication: An API for Accessing Public Key Credentials, Level 3," W3C Recommendation, 2025.
2. H. Krawczyk and P. Eronen, "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)," RFC 5869, IETF, 2010.
3. M. Dworkin, "Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC," NIST SP 800-38D, 2007.
4. J. Schaad and R. Housley, "Advanced Encryption Standard (AES) Key Wrap Algorithm," RFC 3394, IETF, 2002.
5. E. Barker, "Recommendation for Key Management: Part 1 – General," NIST SP 800-57 Part 1 Rev. 5, 2020.
6. B. Schneier and J. Kelsey, "Secure Audit Logs to Support Computer Forensics," ACM TISSEC, vol. 2, no. 2, pp. 159–176, 1999.
7. S. A. Crosby and D. S. Wallach, "Efficient Data Structures for Tamper-Evident Logging," 18th USENIX Security Symposium, 2009.
8. F. T. Liu, K. M. Ting and Z.-H. Zhou, "Isolation Forest," IEEE ICDM, 2008, pp. 413–422.
