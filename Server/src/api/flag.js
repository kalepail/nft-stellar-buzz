import { status } from 'itty-router-extras'

export default async (request, env, ctx) => {
  await env.FLAGGED.put(request.params.accountIssuer, 1)
  return status(204)
}