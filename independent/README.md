# Independent Cloudflare staging

This directory is a **staging implementation**, not the current production service.
The current production hostname still points to the existing Sites deployment. Do
not attach production traffic until the separate production database, data migration,
administrator login, retention schedule, backups and end-to-end tests are verified.

## Components

- Native Worker modules in src/; no ChatGPT identity or connector is required.
- Cloudflare Access validates an email one-time PIN for the administrator hostname;
  the Worker additionally verifies the signed Access JWT and configured audience.
- D1 stores encrypted applications. The independent staging configuration uses
  Supabase for reviews, with public read access and a separately authenticated
  administrator function. retention.mjs deletes only
  applications at least one calendar year old. The scheduled handler reports failure
  when a backlog remains. D1 point-in-time recovery can retain older database states;
  disclose and review backup retention separately.
- The staging database contains synthetic test data only. Runtime keys
  APPLICATION_ENCRYPTION_KEY and STAGING_TOKEN are Cloudflare secrets; do not
  commit them or put them in configuration files.
- schema.sql supports the local D1 fallback. supabase-reviews.sql creates the
  separate reviews tables, row-level access rules and statistics triggers.
- build.mjs generates ignored dist/assets.mjs from the public HTML and admin page.
  Run node independent/build.mjs and node --test independent/tests/*.test.mjs
  from the repository root.
- wrangler.staging.jsonc points only to the staging Worker and database. It does not
  deploy production and must not be reused for production without a separately
  reviewed configuration.

## Outstanding

Cloudflare's GitHub application has been granted repository access; a Workers
Builds configuration and its scoped build token are still required for automatic
deployments. The free Workers plan shares daily D1 limits with the existing USIM
service, so do not bulk import 108,250 reviews into D1. Before cutover, verify
live-data migration, production administrator audience, production secrets,
recovery procedures, final synchronization and the scheduled deletion job.
Consultation channel addresses have not yet been provided. The current standalone
admin interface does not implement CSV bulk import.
