# EnvGuard

**Stop pasting `.env` files into Slack.**

EnvGuard is a full-stack tool for teams to store, organize, and share environment variables without emailing plaintext secrets. It replaces manual `.env` sharing with authenticated, role-based access control, organized by **company → projects → environments → variables**.

The **EnvGuard CLI** gives developers the same power directly from their terminal ideal for automation, CI/CD, and daily workflows.

---

# Table of Contents

- [What this is](#what-this-is)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Admin Audit Logs](#admin-audit-logs)
- [Compare Environments](#compare-environments)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone and Install](#2-clone-and-install)
  - [3. Set Up Supabase](#3-set-up-supabase)
  - [4. Set Up Mailjet](#4-set-up-mailjet)
  - [5. Set Up Google Cloud](#5-set-up-google-cloud)
  - [6. Set Up Passkeys (WebAuthn)](#6-set-up-passkeys-webauthn)
  - [7. Configure Environment Variables](#7-configure-environment-variables)
  - [8. Run Locally](#8-run-locally)
- [CLI – Command Line Interface](#cli--command-line-interface)
  - [Installation](#installation)
  - [Setup (API URL)](#setup-api-url)
  - [Command Reference](#command-reference)

---

# What this is

Most development teams still share `.env` files through Slack, WhatsApp, Discord, or email, leaving sensitive secrets stored in plaintext with no way to revoke access or track who has viewed them.

EnvGuard replaces that workflow with a secure centralized solution.

- **Company Workspaces** – Every user receives a default company on signup and can create additional workspaces.
- **Role-Based Access Control** – Invite team members as **Admin** or **Member** with server-side permission enforcement.
- **Projects & Environments** – Organize secrets into projects with Development, Staging, Production, and custom environments.
- **Encrypted Variables** – Environment variables are encrypted using **AES-256-GCM** before being stored.
- **One-Time Share Links** – Securely share variables through single-use, expiring links.
- **Admin Audit Logs** – Every security-relevant action is recorded in an immutable audit log that is only accessible to project administrators.
- **Environment Comparison & Sync** – Compare variables between two environments, identify differences, and securely synchronize selected variables.
- **Command Line Interface** – Manage everything directly from the terminal without opening the web dashboard.

---

# Features

- Email & Password Authentication
- JWT Authentication
- Google OAuth Login
- Passkey Authentication (WebAuthn)
- Optional Two-Factor Authentication (2FA)
- Company Management
- Team Invitations via Email
- Role-Based Authorization
- Project Management
- Environment Management
- AES-256-GCM Encryption
- Protected & Plain Variables
- Bulk `.env` Import
- `.env` Export
- Copy Individual Variables
- Copy Entire Environment
- One-Time Secret Sharing
- Expiring Share Links
- Admin Audit Logs
- Environment Comparison & Sync
- Structured Logging with Pino
- Complete CLI Support

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js, React, Tailwind CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Authentication | JWT, bcrypt, Google OAuth, otplib |
| Encryption | AES-256-GCM (Node Crypto) |
| Email | Mailjet |
| Logging | Pino |
| CLI | Commander.js, Inquirer.js, Axios, Chalk, Ora, Clipboardy |

---

# Architecture

```text
User
 └── Company (Workspace)
      ├── Members
      ├── Invitations
      └── Projects
            └── Environments
                  ├── Variables
                  └── One-Time Share Links
```

---

# Admin Audit Logs

Every security-sensitive action performed within EnvGuard is automatically recorded in an immutable audit log.

### Recorded Events

- Secret creation
- Secret updates
- Secret deletion
- Secret reveal
- Share link creation
- Environment exports
- User logins
- Other security-relevant actions

Each audit entry records:

- User (actor)
- Action performed
- Affected resource
- Timestamp
- IP address
- User agent

### Access Control

Audit Logs are available **only to administrators**.

- Every team displays an **Audit Logs** button for admins.
- Team members cannot view or access audit logs.
- Audit entries are immutable and cannot be modified through the application.

---

# Compare Environments

EnvGuard allows users to compare variables between two environments (for example, Development and Production) before synchronizing changes.

### Comparison Results

Variables are automatically classified as:

- Same
- Missing from target
- Missing from source
- Different value
- Different protection setting

Users can select any variables and securely copy them from the source environment to the target environment after confirming the changes.

### Security

- Protected variables remain hidden by default.
- Comparisons use encrypted-value fingerprints, allowing values to be compared without exposing secret contents to the browser.
- Revealing a protected value remains an explicit, audited action.
- Audit logs record the source environment, target environment, affected variable keys, and the acting user can never see the secret values themselves.

---

# Getting Started

## 1. Prerequisites

- Node.js 18+
- npm
- Supabase Account
- Mailjet Account
- Google Cloud Project

---

## 2. Clone and Install

```bash
git clone https://github.com/maryamirshad04/EnvGuard.git

cd envguard

cd server
npm install

cd ../client
npm install

cd ../cli
npm install
```

---

## 3. Set Up Supabase

Create a Supabase project.

Run the provided SQL schema inside the SQL Editor.

Copy:

- Project URL
- Service Role Key

These become:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 4. Set Up Mailjet

Create a Mailjet account.

Create a sender email.

Copy:

```env
MAILJET_API_KEY=
MAILJET_API_SECRET=
MAILJET_SENDER_EMAIL=
```

---

## 5. Set Up Google Cloud

Create an OAuth Client.

Copy:

```env
GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Add your local and production domains under:

- Authorized JavaScript Origins
- Authorized Redirect URIs

---

## 6. Set Up Passkeys (WebAuthn)

### Install Packages

Server

```bash
cd server

npm install @simplewebauthn/server
```

Client

```bash
cd client

npm install @simplewebauthn/browser
```

### Configure Environment Variables

Add the following to your server `.env`:

```env
# Local Development
PASSKEY_RP_ID=localhost
PASSKEY_RP_NAME=EnvGuard
```

For production, use your frontend domain as the RP ID:

```env
PASSKEY_RP_ID=env-guardd.vercel.app
PASSKEY_RP_NAME=EnvGuard
```

---

## 7. Configure Environment Variables

Server

```bash
cd server

cp .env.example .env
```

Frontend

```bash
cd client

cp .env.local.example .env.local
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 8. Run Locally

Backend

```bash
cd server

npm run dev
```

Frontend

```bash
cd client

npm run dev
```

Open

```
http://localhost:3000
```

---

# CLI – Command Line Interface

The EnvGuard CLI provides direct terminal access to companies, projects, environments, and encrypted variables.

Instead of opening the dashboard, developers can authenticate once and manage secrets directly from the command line.

---

## Installation

Install globally:

```bash
npm install -g envguard-secrets
npm install -g envguard-secrets@latest
```

Verify installation:

```bash
envguard --version (103)
```

---

## Setup (API URL) (optional)

By default the CLI connects to the hosted backend.

To use your own deployment:

Linux / macOS

```bash
export ENVGUARD_API_URL=https://your-backend/api
```

Windows PowerShell

```powershell
$env:ENVGUARD_API_URL="https://your-backend/api"
```

---

# Command Reference

## Authentication

| Command | Description |
|----------|-------------|
| `envguard login` | Authenticate with your EnvGuard account |
| `envguard logout` | Logout and remove the stored session |
| `envguard whoami` | Show the currently authenticated user |

---

## Company

| Command | Description |
|----------|-------------|
| `envguard company list` | List all companies |
| `envguard company select <name>` | Select a company |
| `envguard company current` | Display the selected company |

---

## Project

| Command | Description |
|----------|-------------|
| `envguard project list` | List projects |
| `envguard project select <name>` | Select a project |
| `envguard project current` | Show selected project |

---

## Environment

| Command | Description |
|----------|-------------|
| `envguard environment list` | List environments |
| `envguard environment select <name>` | Select an environment |
| `envguard environment current` | Display current environment |

---

## Variables

| Command | Description |
|----------|-------------|
| `envguard variable list` | List variables |
| `envguard variable get <key>` | Display a variable |
| `envguard variable set <key> <value>` | Create or update a variable |
| `envguard variable set <key> <value> --secret` | Create or update a variable (protected) |
| `envguard variable set <key> <value> --env <name>` | Create or update a variable If you haven't selected an environment, or want to override the selected one|
| `envguard variable delete <key>` | Delete a variable |
| `envguard variable delete <key> --env <name>` | Create or update a variable If you haven't selected an environment, or want to override the selected one|
| `envguard variable reveal <key>` | Reveal an encrypted variable |
| `envguard variable copy <key>` | Copy a variable to clipboard |
| `envguard variable copy-all` | Copy all variables |
| `envguard variable copy-all --env <name>` | Copy all variables of a specific env |
| `envguard variable export` | Print .env content to terminal |
| `envguard variable export --file .env` | Export variables to a file |
| `envguard variable export --env <name> --file .env.<name>` | Export variables of specific env to a specific file |
| `envguard variable import <file>` | Import variables from a `.env` file |
| `envguard variable import .env --env <name> --create` | Import into a specific environment, creating it if missing
| `envguard variable import .env --env <name> --create --secret-keys "<key>"` | create the environment (if missing) and import the variables, marking as secret
| `envguard variable import .env --env <name>> --secret` | Mark all variables as secret
| `envguard variable import .env --secret-keys "<key1>,<key2>,<key3>" ` | Mark specific keys as secret
| `envguard variable import .env --env production --skip-existing` | Skip existing variables
---

## Global Options

| Option | Description |
|--------|-------------|
| `--help` | Show command help |
| `--version` | Show CLI version |

---

# Example CLI Workflow

```bash
envguard login

envguard company list

envguard company select personal

envguard project list

envguard project select backend

envguard environment list

envguard environment select production

envguard variable list

envguard variable reveal DATABASE_URL

envguard variable copy DATABASE_URL

envguard variable export
```

---

Visit `https://env-guardd.vercel.app/`. Sign up and you'll land in a default "My Workspace" company as its admin, ready to create projects and invite teammates.
