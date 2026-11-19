# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems.

Report privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**. If that option isn't available, contact the maintainer, [@mcsplat](https://github.com/mcsplat), using the details on their GitHub profile.

Include what you found, how to reproduce it, and what impact you think it has. You'll get an acknowledgment as soon as possible, and we'll keep you updated until it's resolved.

## Scope

Bay Flood Watch has no user accounts and stores no personal data on the server. The most relevant issues are things like:

- Injection or cross-site scripting through data from upstream sources (alert text, gauge names, camera names, outage causes)
- The service worker serving the wrong or tampered content
- Ways to make the app show false flood information

## Not a security issue

Wrong, late, or missing flood data from an upstream source (NWS, NOAA, Cal OES, Caltrans) is a **data issue**, not a security issue. Please open a regular bug report for those.
