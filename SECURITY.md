# Security Policy

## Supported Versions

This project is under active development. Only the latest version on the `main` branch is supported with security updates.

| Version        | Supported |
| -------------- | --------- |
| Latest (main)  | Yes       |
| Older versions | No        |

---

## Reporting a Vulnerability

If you discover a security vulnerability, report it **privately**. Do not open a public issue.

### How to report

* Open a **GitHub Security Advisory**

### What to include

* Description of the vulnerability
* Steps to reproduce
* Potential impact
* Any suggested fix (optional)

---

## Response Expectations

* Initial acknowledgment: within 72 hours
* Status updates: as progress is made
* Resolution timeline: depends on severity and complexity

If the issue is accepted:

* It will be fixed on the `main` branch
* A patch will be released as soon as possible
* Credit will be given if desired

If the issue is declined:

* A brief explanation will be provided

---

## Scope

This project is a **client-side Even Hub application**. Relevant security areas include:

* Data handling from external APIs (NBA endpoints)
* Event handling and input processing
* Packaging (`app.json`) and permissions configuration 
* Any future backend integrations

Out of scope:

* Issues caused by third-party services (e.g., NBA APIs)
* Local development environment misconfiguration

---

## Security Considerations

Contributors should:

* Avoid committing secrets, API keys, or tokens
* Use environment variables for sensitive data
* Validate external data before rendering
* Keep dependencies up to date
* Minimize permissions in `app.json`
