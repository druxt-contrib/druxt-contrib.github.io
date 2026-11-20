/*
 * The module registry, and how this site reads it.
 *
 * The registry is a repository of one YAML file per module, compiled to a
 * single `modules.json` and served straight from it over a CDN. There is no
 * package to install and no API to call, so a site reads the file.
 */

/*
 * The origin first, the CDN second.
 *
 * jsDelivr is the registry's published route, and for a file it serves by
 * tag it is the right one. By branch it is not: it caches the name-to-commit
 * resolution as well as the file, so a `@main` path keeps serving the
 * previous commit for up to twelve hours, and purging the file does not
 * re-resolve the branch. Measured after a merge, with a purge that reported
 * success: the CDN still answered with the registry as it stood before.
 *
 * A stale answer is worse here than a slow one. At build time it bakes a
 * missing module into static HTML that stays wrong until the next deploy,
 * and in the browser it would replace a fresh list with an older one. So the
 * origin is read first and the CDN stands behind it, which is the way round
 * that makes the refresh worth doing at all.
 *
 * Once the registry publishes tags, a tagged jsDelivr path can lead again.
 */
export const SOURCES = [
  'https://raw.githubusercontent.com/druxt/modules/main/modules.json',
  'https://cdn.jsdelivr.net/gh/druxt/modules@main/modules.json',
]

/*
 * Where the registry's own icons are served from. The CDN leads here, because
 * an icon that arrives a few hours late costs a reader nothing, and these are
 * the requests a page actually repeats.
 */
export const ICON_BASE = 'https://cdn.jsdelivr.net/gh/druxt/modules@main/icons/'

/*
 * The six parts of the stack a module can belong to, in the order they are
 * shown. `core` is the framework itself, so no contributed module uses it,
 * and a category the registry adds later falls through to its own key rather
 * than disappearing.
 */
export const CATEGORIES = [
  ['content-and-entities', 'Content and entities'],
  ['routing-and-navigation', 'Routing and navigation'],
  ['site-and-layout', 'Site and layout'],
  ['authoring-and-preview', 'Authoring and preview'],
  ['authentication', 'Authentication'],
  ['tooling', 'Tooling'],
  ['core', 'Core'],
]

const LABELS = new Map(CATEGORIES)

/** What a status means to someone deciding whether to install the module. */
export const STATUS = {
  stable: { text: 'Stable', hint: 'Released and supported' },
  prerelease: { text: 'Prerelease', hint: 'Released for testing' },
  unreleased: { text: 'Unreleased', hint: 'No published release yet' },
  deprecated: { text: 'Deprecated', hint: 'No longer maintained' },
}

/** The contributed modules, newest registry first, archives left out. */
export const contrib = (registry) =>
  ((registry && registry.modules) || []).filter(
    (module) => module.type === 'contrib' && !module.archived
  )

/**
 * The contributed modules under their category headings.
 *
 * A category with no modules is left out rather than rendered as a heading
 * over nothing, and a module whose category the list above does not know
 * still gets a group, so a registry that grows cannot hide an entry.
 */
export const grouped = (registry) => {
  const modules = contrib(registry)
  const keys = [
    ...CATEGORIES.map(([key]) => key),
    ...modules.map((module) => module.category),
  ]
  const seen = new Set()
  const groups = []
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const members = modules
      .filter((module) => module.category === key)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (members.length)
      groups.push({ key, title: LABELS.get(key) || key, modules: members })
  }
  return groups
}

/*
 * How a word in a module's name is written when capitalising it does not
 * produce the name its project uses. The registry holds a key rather than a
 * label, so until it carries one these are the exceptions.
 */
const SPELLINGS = { ckeditor: 'CKEditor' }

/**
 * The sitemaps of the documentation sites served under this domain.
 *
 * A crawler reads `/robots.txt` and nothing else, so a site served from a
 * path below this one has no way to announce its own sitemap. This page is
 * the only place that can, and the registry already records where each
 * module presents itself.
 *
 * @param {object} registry - The registry document.
 * @param {string} origin - This site's origin, with no trailing slash.
 * @returns {Array<string>} Absolute sitemap URLs, in registry order.
 */
export const siteSitemaps = (registry, origin) =>
  contrib(registry)
    .map((module) => module.website)
    .filter((website) => website && website.startsWith(origin + '/'))
    .map((website) => `${website.replace(/\/$/, '')}/sitemap.xml`)

/** The module's own name, as a reader would say it. */
export const title = (module) =>
  `Druxt ${module.name
    .split('-')
    .map(
      (word) => SPELLINGS[word] || word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ')}`

/**
 * The supported Druxt range.
 *
 * A module that never declared one says so, because an entry that simply
 * omits it reads as though every version works.
 */
export const supports = (module) => {
  const range = module.compatibility && module.compatibility.druxt
  return !range || range === 'unknown' ? null : range
}
