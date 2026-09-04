# <Topic Name>

> **Service / Module:** the target repo / `<Module Name>`
> **Topic Folder:** `docs/ref/<module-folder>/<topic-folder>`
> **Classification:** <!-- case name from topic-classification.md — e.g. "New feature (heavy)", "Bug fix (non-trivial)", "Investigation & code check", etc. -->
> **Recommended flow:** <!-- skills to use — e.g. "topic-init + topic-plan + topic-test + topic-implement", "topic-init + topic-test (NEG)", "topic-init only", etc. -->
> **Status:** Draft
> **Last Updated:** <!-- date -->

---

## Table of Contents

- [](#)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Requirements](#2-requirements)
    - [2.1 Requirement Statement](#21-requirement-statement)
  - [3. Current State](#3-current-state)
    - [3.1 How It Works Today](#31-how-it-works-today)
    - [3.2 Key Files (Current)](#32-key-files-current)
    - [3.3 Current Limitations](#33-current-limitations)
  - [4. Target State](#4-target-state)
    - [4.1 What Needs to Change](#41-what-needs-to-change)
    - [4.2 New Flow](#42-new-flow)
  - [5. Technical Details](#5-technical-details)
    - [5.1 Data Structures](#51-data-structures)
    - [5.2 External Dependencies](#52-external-dependencies)
    - [5.3 Configuration](#53-configuration)
    - [5.4 Error Handling](#54-error-handling)
    - [5.5 Non-Functional Requirements](#55-non-functional-requirements)
  - [6. Decisions \& Constraints](#6-decisions--constraints)
  - [7. Open Questions](#7-open-questions)
  - [8. References](#8-references)

---

## 1. Overview

<!-- What is this topic (feature, task, investigation, or fix), what problem does it solve, and why is this work being done now? (2–5 sentences) -->

---

## 2. Requirements

> **Mandatory section. A topic with no stated requirement and no cited source is invalid — do not proceed past this section until it is filled in.**

| Field | Value |
|-------|-------|
| **Source** | <!-- Official doc (SRS section, ticket ID, spec, meeting notes — with link/reference) OR "Direct request (prompt)" if given directly by the user/stakeholder in conversation. Never leave blank. --> |
| **Type** | <!-- Feature (change/add) / Bugfix (fix) / Investigation (explore) — pick exactly one --> |

### 2.1 Requirement Statement

<!-- State precisely what must change/be added (Feature), what must be fixed (Bugfix), or what must be explored/answered (Investigation). Quote or closely paraphrase the source wording — do not restate the Overview in different words. -->

---

## 3. Current State

### 3.1 How It Works Today

<!-- Describe the current code behavior. Reference actual functions, files, and flows. -->

### 3.2 Key Files (Current)

<!-- Files as they exist today, for context only — not files to be modified. Planned file/function changes belong exclusively in the plan doc. -->

| File | Role |
|------|------|
| `<path/to/file>` | <!-- what this file does --> |

### 3.3 Current Limitations

<!-- What is missing, broken, slow, or unscalable? Bullet list. -->

---

## 4. Target State

### 4.1 What Needs to Change

<!-- Describe the desired end state after this work is done, in prose. Do not list specific files/functions to touch — that belongs in the plan doc. -->

### 4.2 New Flow

<!-- Describe the execution flow after the change. Numbered sequence or Mermaid diagram. -->

---

## 5. Technical Details

### 5.1 Data Structures

<!-- Key objects, payloads, cache key formats, DB schemas, etc. Describe in prose or tables — no code blocks. -->

### 5.2 External Dependencies

| Dependency | Purpose | Config Key | Pricing / Limits |
|-----------|---------|-----------|------------------|
| <!-- e.g. Google Maps API --> | <!-- what it provides --> | `<ENV_VAR>` | [Official Pricing](<url>) — <!-- e.g. $5 per 1,000 requests, 10k free/month --> |

### 5.3 Configuration

<!-- List config parameters, their defaults, and purpose. Use a table. No code blocks. -->

| Parameter | Default | Description |
|-----------|---------|-------------|
| `<param>` | `<default>` | <!-- description --> |

### 5.4 Error Handling

<!-- How errors from external calls or internal failures are handled — match the target repo's error-handling convention (e.g. log before responding, return before sending the error response). Prose or bullet list — no code blocks. -->

---

### 5.5 Non-Functional Requirements

**Required for `Feature` type; may be `N/A — none` for pure `Investigation` with a stated reason.** Non-functional targets and constraints that the implementation must satisfy — performance, scalability, security, and observability. If a target is not known, mark it `<!-- TODO: confirm -->` and list it as an open question (§7) rather than guessing.

| NFR | Target | Constraint / Note |
|-----|--------|------------------|
| Performance | <!-- e.g. p95 < 500ms, or "N/A" --> | <!-- e.g. measured via HTTP request timing in TC/PERF cases --> |
| Scalability | <!-- e.g. 100 concurrent requests, or "N/A" --> | <!-- e.g. cache TTL strategy, DB indexing --> |
| Security | <!-- e.g. auth required, input validation, or "N/A" --> | <!-- e.g. role/permission checks, parameter sanitization --> |
| Observability | <!-- e.g. log every request with request ID, or "N/A" --> | <!-- e.g. INFO log with response time, ERROR on failure --> |

---

## 6. Decisions & Constraints

<!-- Architectural decisions, tradeoffs, constraints. "We chose X over Y because Z." No unverified metric claims — use qualitative terms (High/Moderate/None) unless backed by actual measurement data. -->

---

## 7. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | <!-- question --> | Open |

<!-- When a question is answered, update Status to: ✅ Resolved — <answer> -->

---

## 8. References

<!-- Do NOT pre-populate links here. The plan and test docs are NOT created by default — add a link to each ONLY once that file actually exists in this folder. Only link docs within this topic folder. Do not link to other topic folders, external docs, or cross-project references. -->

<!-- Placeholder convention: docs that reference environment-specific values use <UPPER_SNAKE_CASE> placeholders (e.g. <LOCAL_API_URL>, <LOCAL_DB_HOST>, <STAGING_DOMAIN>), with real values kept out of committed docs. -->