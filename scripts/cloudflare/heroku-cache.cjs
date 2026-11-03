const rulesForHost = hostname => {
  if (!/^[a-z0-9.-]+$/.test(hostname))
    throw new Error('Invalid public hostname')
  const host = `(http.host eq "${hostname}")`
  return [
    {
      ref: 't2_public_root',
      description: 'T2: cache anonymous homepage for uptime',
      enabled: true,
      // Cloudflare evaluates single-file invalidations as internal PURGE requests.
      expression: `${host} and (http.request.uri.path eq "/") and (http.request.uri.query eq "") and (http.request.method in {"GET" "HEAD" "PURGE"}) and (http.cookie eq "") and not any(http.request.headers["authorization"][*] ne "")`,
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: {
          mode: 'respect_origin',
          status_code_ttl: [
            { status_code_range: { from: 201, to: 599 }, value: -1 }
          ]
        }
      }
    },
    {
      ref: 't2_private_bypass',
      description: 'T2: bypass authenticated and dynamic content',
      enabled: true,
      expression: `${host} and (not (http.request.method in {"GET" "HEAD" "PURGE"}) or any(http.request.headers["authorization"][*] ne "") or ((http.cookie ne "") and not starts_with(http.request.uri.path, "/_next/static/")) or starts_with(http.request.uri.path, "/api/") or (http.request.uri.path eq "/api") or starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/sign-in") or starts_with(http.request.uri.path, "/auth") or starts_with(http.request.uri.path, "/_next/data/"))`,
      action: 'set_cache_settings',
      action_parameters: { cache: false }
    }
  ]
}
const mergeRules = (existing, hostname) => {
  const ours = new Set(['t2_public_root', 't2_private_bypass'])
  return [
    ...existing.filter(rule => !ours.has(rule.ref)),
    ...rulesForHost(hostname)
  ]
}
if (require.main === module)
  console.log(
    JSON.stringify(rulesForHost(process.argv[2] || 'blog.vachiika.me'), null, 2)
  )
module.exports = { rulesForHost, mergeRules }
