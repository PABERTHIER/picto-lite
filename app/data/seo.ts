// Shared by Nuxt Robots (HTTP/SSR), content pages and error recovery (client)
export const robotsContent = {
  indexable:
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  blocked: 'noindex, nofollow',
} as const
