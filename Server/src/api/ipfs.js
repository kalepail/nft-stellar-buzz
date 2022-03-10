import { StatusError } from 'itty-router-extras'
import ImgixClient from '@imgix/js-core'

export default async (request, env, ctx) => {
  if (await env.FLAGGED.get(request.params.accountIssuer))
    throw new StatusError(403, 'Forbidden')

  let url

  if (
    env.IMGIX_DOMAIN 
    && env.IMGIX_TOKEN
  ) {
    const client = new ImgixClient({
      domain: env.IMGIX_DOMAIN,
      secureURLToken: env.IMGIX_TOKEN,
    })
  
    url = client.buildURL(`https://cloudflare-ipfs.com/ipfs/${request.params.hash}`, { h: 16 * 12 * 3 })
  }

  else
    url = `https://cloudflare-ipfs.com/ipfs/${request.params.hash}`

  const response = await fetch(url, {
    cf: {
       cacheTtlByStatus: { 
        '200-299': 86400, // one day
        '404': 1, 
        '500-599': 0 
      } 
    },
  })
  .then(async (res) => {
    if (res.ok)
      return new Response(await res.arrayBuffer(), {
        headers: res.headers
      })
    throw res
  })

  return response
}