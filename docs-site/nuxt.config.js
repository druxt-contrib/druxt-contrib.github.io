/*
 * The landing page for the Druxt contrib documentation sites.
 *
 * Everything about how it looks comes from @druxt/dui, the same library the
 * module sites are built from, so arriving here and then opening a module's
 * documentation is one site rather than two.
 */

/*
 * An organisation's Pages site is served from the root of its domain, and a
 * project site from /<repository>/. This repository is the first kind, and it
 * is named for the organisation, so the name is how the two are told apart.
 * Reading it from the environment rather than writing `/` down keeps this file
 * the same file the module sites use.
 */
import { get } from 'https'

import { SOURCES, contrib, siteSitemaps, title } from './registry'

/*
 * Reads the module registry while the site is built.
 *
 * Node 16, which .nvmrc pins, has no global fetch, and a one-page site does
 * not need an HTTP client of its own, so this is the one place the server
 * side reaches the network. The browser refreshes the same file with fetch,
 * which keeps a node builtin out of the client bundle.
 */
const read = (url, redirects = 0) =>
  new Promise((resolve, reject) => {
    get(url, (response) => {
      const { statusCode, headers } = response
      if (statusCode > 299 && statusCode < 400 && headers.location) {
        response.resume()
        if (redirects > 3) return reject(new Error(`${url} redirects too far`))
        return resolve(read(new URL(headers.location, url).href, redirects + 1))
      }
      if (statusCode !== 200) {
        response.resume()
        return reject(new Error(`${url} answered ${statusCode}`))
      }
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => (body += chunk))
      response.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(new Error(`${url} is not the JSON this site expects`))
        }
      })
    }).on('error', reject)
  })

/*
 * A build that cannot read the registry fails here rather than publishing a
 * page with no modules on it, which is the whole page.
 */
const registry = async () => {
  const failures = []
  for (const source of SOURCES) {
    try {
      const data = await read(source)
      if (data && Array.isArray(data.modules)) return data
      failures.push(`${source} held no modules`)
    } catch (error) {
      failures.push(error.message)
    }
  }
  throw new Error(
    `The module registry could not be read.\n${failures.join('\n')}`
  )
}

const repository = (process.env.GITHUB_REPOSITORY || '').split('/')[1]
const base =
  repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/'

const ORIGIN = 'https://contrib.druxtjs.org'

export default async () => {
  // Read once: the page is built from it and robots.txt lists the sitemaps
  // of the sites it names.
  const modules = await registry()

  return {
    target: 'static',
    ssr: true,

    router: { base },

    publicRuntimeConfig: {
      // The registry as it stood when this site was built.
      registry: modules,

      docsTitle: 'Druxt Contrib',
      docsTagline:
        'Documentation for the community modules that extend a Druxt site.',
      docsRepoUrl: 'https://github.com/druxt-contrib',
      docsBadges: [],

      // The links every Druxt site shows, plus where the modules live.
      docsLinks: [
        {
          text: 'GitHub',
          icon: 'github',
          href: 'https://github.com/druxt-contrib',
        },
        {
          text: 'Discord',
          icon: 'discord',
          href: 'https://discord.druxtjs.org',
        },
      ],
    },

    head: {
      titleTemplate: '%s - Druxt Contrib',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      script: [
        {
          // The theme is set before the first paint, so a reader who prefers
          // dark does not see a white page first.
          hid: 'druxt-theme-init',
          innerHTML:
            "(function(){try{var k='druxt-color-mode';var p=localStorage.getItem(k)||'system';var v=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',v)}catch(e){}})()",
        },
      ],
      __dangerouslyDisableSanitizersByTagID: {
        'druxt-theme-init': ['innerHTML'],
      },
    },

    // No @nuxt/postcss8: Nuxt 2.18 is already on postcss 8, and the module
    // drags in css-loader 5, whose webpack 5 is hoisted over the webpack 4
    // that Nuxt 2 builds with. The build then fails inside
    // html-webpack-plugin, nowhere near the cause.
    buildModules: ['@nuxtjs/tailwindcss', '@nuxtjs/color-mode'],

    colorMode: {
      classSuffix: '',
      dataValue: 'theme',
      storageKey: 'druxt-color-mode',
    },

    // @druxt/dui before @nuxt/content, deliberately. Content parses every
    // file while it starts up, so a hook registered by a module listed after it
    // is registered too late and never runs.
    modules: [
      [
        '@druxt/dui',
        {
          // Where a link that leaves the site's own pages points instead: the
          // same file on GitHub.
          repoUrl: 'https://github.com/druxt-contrib/druxt-contrib.github.io',
          gitRef: 'main',
          // This site is the root of the domain, so it is the one that writes
          // robots.txt, and the only place the sites served beneath it can be
          // announced to a crawler.
          siteUrl: ORIGIN,
          sitemaps: siteSitemaps(modules, ORIGIN),
          // The modules themselves, which is what an assistant reading this
          // site is here for. The page renders the same list from the same
          // registry.
          llmsSections: [
            {
              title: 'Modules',
              links: contrib(modules).map((module) => ({
                text: title(module),
                href: module.website,
                notes: module.description,
              })),
            },
          ],
        },
      ],
      '@nuxt/content',
    ],

    generate: { fallback: '404.html' },
  }
}
