# Heroku deployment and public homepage caching

The business database supports `DATABASE_PROVIDER=appwrite`, `supabase`, or
`postgres`. Unset still means Appwrite. Requests use the selected provider,
without automatic fallback or dual writes. Notion content and Clerk login keep
their existing configuration.

## Heroku runtime

Use the Node.js buildpack and a Heroku Postgres attachment. Configure these
server variables in Heroku Config Vars:

```text
DATABASE_PROVIDER=postgres
POSTGRES_DB_SCHEMA=appwrite_t2_data
POSTGRES_POOL_MAX=3
NEXT_PUBLIC_LINK=https://blog.vachiika.me
CLOUDFLARE_ROOT_CACHE=true
CLOUDFLARE_ROOT_CACHE_TTL=86400
NEXT_BUILD_CPUS=1
```

Heroku supplies `DATABASE_URL`. Preserve the existing Notion and Clerk variables.
Keep `CLERK_SECRET_KEY`, database credentials and the optional 64-character hex
`BUSINESS_SETTINGS_ENCRYPTION_KEY` server-only. Retain the encryption key across
releases once encrypted comment settings exist.

`heroku-postbuild` builds the standalone Next.js server and copies public/static
assets. Business database credentials are excluded from the build subprocess to
prevent static generation from changing production records. The release process
applies the PostgreSQL schema without replacing rows; other providers skip it.
The web process binds to `0.0.0.0:$PORT`.

Postgres verifies TLS certificates and hostnames. Heroku stacks include the AWS
RDS CA bundle. For external clients set `PGSSLROOTCERT` to that downloaded bundle.
`DATABASE_SSL=disable` is accepted only for a local development database.

## Repeatable migration and backup

The existing `scripts/database/appwrite_to_supabase.py` workflow exports and
checks Appwrite data for Supabase. `copy-postgres.cjs` transfers the ten business
tables and their `__appwrite_tables` metadata between PostgreSQL installations
using a private JSON snapshot. It never includes unrelated public-schema tables.

Set source `DATABASE_URL` in a private environment file, then:

```sh
node --env-file=/private/source.env scripts/database/copy-postgres.cjs export /private/snapshot.json
node scripts/database/copy-postgres.cjs inspect /private/snapshot.json
node --env-file=/private/target.env scripts/database/copy-postgres.cjs import /private/snapshot.json
node --env-file=/private/target.env scripts/database/copy-postgres.cjs verify /private/snapshot.json
```

Exports use one consistent read-only snapshot and create files with mode 0600.
Imports preserve IDs, fields, timestamps and original Appwrite documents. They
stop on changed or extra target rows before inserting anything, and repeated
imports of the same snapshot add no duplicates. Freeze source writes during the
final export/cutover. Once the new deployment accepts writes, the old database
will diverge; switching providers does not synchronize records automatically.

## Cloudflare and Eco

Point the custom-domain CNAME to the target returned by `heroku domains:add`.
Enable Heroku automated certificate management, verify its certificate, then
enable Cloudflare proxying. Retain the zone's other DNS records and rules.

`node scripts/cloudflare/heroku-cache.cjs blog.vachiika.me` prints the two cache
rules. Apply them to the zone's `http_request_cache_settings` entrypoint, merging
with unrelated rules. Only cookie-free and Authorization-free GET/HEAD requests
to exact `/`, without a query, qualify. APIs, admin/auth routes and authenticated
requests bypass the cache. Root caching skips Clerk middleware only for these
anonymous requests; protected routes retain normal authentication checks.

Respect origin cache headers and retain Set-Cookie. A negative status TTL prevents
caching redirects and errors; successful responses keep the origin's TTL. The
origin sends a Cloudflare-specific 24-hour TTL; the browser must
revalidate. Verify repeated requests return `CF-Cache-Status: HIT` and an increasing
`Age`; private requests must bypass. Purge the exact homepage URL after a release
or whenever homepage content needs to refresh before TTL expiry.

Uptime must request `https://blog.vachiika.me/` without cookies/query strings,
without browser subresource fetching, and without following article/API links.
A cache HIT avoids Heroku; a MISS, expiration, eviction or different edge location
can wake Eco. Eco can sleep after 30 minutes without origin traffic. A cached
homepage monitor checks the public edge response and does not prove live database
or origin health.
