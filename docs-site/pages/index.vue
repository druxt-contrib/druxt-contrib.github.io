<template>
  <div>
    <!--
      The page opens with the repository's README, which is what a reader
      arriving on GitHub sees first, so the two cannot drift apart.
    -->
    <NuxtContent :document="document" />

    <!-- The modules themselves come from the registry rather than from the
         README, so a module is listed by adding its file there and nothing
         in this repository has to be edited to keep up. -->
    <ModuleList />
  </div>
</template>

<script>
import { sections } from '../nav'

export default {
  layout: 'docs',

  async asyncData({ $content, $config, store, error }) {
    const documents = await $content().fetch()
    const document = documents.find((candidate) => candidate.slug === 'index')
    if (!document)
      return error({ statusCode: 404, message: 'No README to show' })

    store.commit('setDocsNav', {
      sections: sections(documents, { demo: $config.docsDemo }),
      toc: document.toc || [],
    })

    return { document }
  },

  computed: {
    title: ({ $config }) => $config.docsTitle,
  },

  head() {
    return {
      title: this.title,
      // The landing page is the site, so it carries the site's name alone.
      // The template appends that name to every other page's title, and
      // without this the landing page is named twice over.
      titleTemplate: '%s',
    }
  },
}
</script>
