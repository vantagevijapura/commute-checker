export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/here-transit/')) {
      const targetPath = url.pathname.replace('/here-transit', '')
      const targetUrl = `https://transit.router.hereapi.com${targetPath}${url.search}`
      return fetch(targetUrl)
    }

    return env.ASSETS.fetch(request)
  },
}
