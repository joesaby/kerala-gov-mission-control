# Security Policy

Kerala Mission Control is a **public accountability dashboard**. Its credibility
depends on the integrity of what it shows — so for this project, security covers
not only the usual web vulnerabilities but also **data integrity** and the **AI
ingestion pipeline**.

## Reporting a Vulnerability

**Please report privately. Do not open a public GitHub issue for a security
problem.**

Use GitHub's **Security Advisories** — go to the
[**Security** tab](../../security/advisories) of this repository and click
**"Report a vulnerability"**. This keeps the report private until a fix is
ready.

You will receive an acknowledgement within **48 hours** and, for confirmed
issues, a resolution or mitigation plan within **7 days**.

## What to Include

1. **What** — the vulnerability and the component affected.
2. **How to reproduce** — steps or a proof-of-concept.
3. **Impact** — what an attacker could do, in your assessment.

## What Counts as a Security Issue Here

Alongside conventional web vulnerabilities (auth bypass, injection, secret
exposure, dependency CVEs), the following are explicitly in scope for this
project:

- **Data integrity** — any way to cause the dashboard to display a public-facing
  number, Government Order, or governance fact that does **not** match its
  official source. Unauthorised alteration of displayed figures is a security
  issue, not just a bug, because a trusted accountability tool showing a
  fabricated figure is a direct attack on its purpose.
- **AI ingestion manipulation** — prompt injection or crafted source documents
  that cause the Government-Order ingestion to mis-map an order to the wrong
  manifesto promise, fabricate a mapping, exfiltrate data, or write malicious
  content into the data store. The mapping is designed to be inspectable and to
  fail visibly; anything that defeats that (a silent wrong guess presented as
  confident) is in scope.
- **Credential / admin exposure** — any path that exposes the authenticated
  admin area or its credentials.

## A Note on Data

This project ingests and displays **only data that is already published publicly
by official sources**. It does not collect, store, or republish private or
restricted government data.

If you believe the dashboard has somehow exposed information that is **not**
already public — or that the pipeline has ingested a non-public document — treat
it as a security issue and report it **privately** via the Security Advisories
flow above, **not** in a public issue.

For a figure that is simply **wrong or outdated** (a public-data accuracy
problem, not a security one), please use the
[data accuracy issue template](.github/ISSUE_TEMPLATE/data-accuracy.md) instead.

## Supported Versions

This is a continuously deployed, single-version project on Deno Deploy. Only the
current `main` branch is supported; there are no separate versioned releases to
patch.
