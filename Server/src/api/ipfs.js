import { StatusError } from 'itty-router-extras'

export default async (request, env, ctx) => {
  if (await env.FLAGGED.get(request.params.accountIssuer))
    throw new StatusError(403, 'Forbidden')

  const response = await fetch(`https://cloudflare-ipfs.com/ipfs/${request.params.hash}`, {
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