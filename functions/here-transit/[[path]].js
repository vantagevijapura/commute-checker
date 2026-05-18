export async function onRequest(context) {
  const url = new URL(context.request.url)
  const targetPath = url.pathname.replace('/here-transit', '')
  const targetUrl = `https://transit.router.hereapi.com${targetPath}${url.search}`
  return fetch(targetUrl)
}
