<template>
  <section aria-labelledby="modules">
    <h2 id="modules">Modules</h2>

    <p v-if="!groups.length">The registry lists no contributed modules yet.</p>

    <div v-for="group in groups" :key="group.key" class="mb-10">
      <h3>{{ group.title }}</h3>

      <ul class="module-grid grid gap-4 sm:grid-cols-2 list-none p-0 m-0">
        <li
          v-for="module in group.modules"
          :key="module.name"
          class="card card-bordered bg-base-100 h-full"
        >
          <div class="card-body gap-3 p-5">
            <div class="flex items-start gap-3">
              <img
                v-if="module.icon"
                :src="iconBase + module.icon"
                alt=""
                width="28"
                height="28"
                class="mt-1 shrink-0"
                loading="lazy"
              />
              <div class="min-w-0">
                <h4 class="card-title text-base m-0">
                  <a :href="module.website" class="link link-hover">{{
                    heading(module)
                  }}</a>
                </h4>
                <p class="text-sm opacity-80 m-0 mt-1">
                  {{ module.description }}
                </p>
              </div>
            </div>

            <dl class="text-sm m-0 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              <dt class="opacity-60">Status</dt>
              <dd class="m-0">
                <span :title="status(module).hint">{{
                  status(module).text
                }}</span>
              </dd>

              <dt class="opacity-60">Druxt</dt>
              <dd class="m-0">
                <!-- A module that never declared a range says so. Leaving it
                     out would read as though every version works. -->
                <code v-if="supports(module)">{{ supports(module) }}</code>
                <span v-else class="opacity-70">Not declared</span>
              </dd>

              <template v-if="module.drupal && module.drupal.length">
                <dt class="opacity-60">Drupal</dt>
                <dd class="m-0">
                  {{ module.drupal.map((project) => project.label).join(', ') }}
                </dd>
              </template>
            </dl>

            <!-- Only destinations the registry recorded. A module with no
                 published package shows no npm link rather than one that
                 resolves to nothing. -->
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a :href="module.website" class="link link-hover"
                >Documentation</a
              >
              <a
                :href="'https://github.com/' + module.repo"
                class="link link-hover"
                >Source</a
              >
              <a
                v-if="module.npm"
                :href="'https://www.npmjs.com/package/' + module.npm"
                class="link link-hover"
                >npm</a
              >
            </div>
          </div>
        </li>
      </ul>
    </div>

    <p class="text-sm opacity-70">
      This list is the
      <a href="https://github.com/druxt/modules" class="link"
        >Druxt module registry</a
      >, filtered to the contributed modules, so a module is listed by adding
      its file there rather than by editing this site.
      <a href="https://druxtjs.org/modules" class="link">druxtjs.org/modules</a>
      has every Druxt module, rather than the contributed ones alone.
    </p>
  </section>
</template>

<script>
import {
  ICON_BASE,
  SOURCES,
  STATUS,
  grouped,
  supports,
  title,
} from '../registry'

export default {
  data() {
    /*
     * The list is read once while the site is built and baked into the page,
     * so it is in the HTML for a reader and for a crawler, with nothing to
     * wait for. The browser then re-reads it, because the registry changes
     * without this site being rebuilt.
     */
    return { registry: this.$config.registry, iconBase: ICON_BASE }
  },

  computed: {
    groups() {
      return grouped(this.registry)
    },
  },

  mounted() {
    this.refresh()
  },

  methods: {
    heading: title,
    supports,

    status(module) {
      return STATUS[module.status] || { text: module.status, hint: '' }
    },

    /*
     * A refresh that fails leaves the built-in list showing. The page is
     * readable without the network, so a CDN that is slow or blocked costs
     * the reader nothing.
     */
    async refresh() {
      for (const source of SOURCES) {
        try {
          const response = await fetch(source, { cache: 'no-cache' })
          if (!response.ok) continue
          const registry = await response.json()
          if (registry && Array.isArray(registry.modules)) {
            this.registry = registry
            return
          }
        } catch (error) {
          // Try the next source.
        }
      }
    },
  },
}
</script>

<style scoped>
/*
 * The layout wraps a page in `.prose`, which draws a bullet on a list item as
 * a `::before` rather than a list marker, so `list-none` leaves the dot where
 * it was. The pinned Tailwind Typography is 0.4, which has no `not-prose` to
 * opt out with, so the marker comes off by name, the way the theme already
 * does it for its own page sequence.
 */
.module-grid > li::marker,
.module-grid > li::before {
  content: none;
}
</style>
