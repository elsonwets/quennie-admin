import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // The whole workspace is loaded once by the root route; mutations invalidate it.
    defaultStaleTime: 30_000,
  })
}
