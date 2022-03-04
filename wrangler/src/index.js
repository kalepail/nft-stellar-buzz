import { Keypair, Networks, Transaction } from 'stellar-base'
import {
  text,
  status,
  StatusError,
  ThrowableRouter,
} from 'itty-router-extras'

import mint from './contracts/mint'
import offer from './contracts/offer'

const router = ThrowableRouter()

router.post('/contract/:command', async (request, env, ctx) => {
  const body = await request.json()

  let xdr

  switch(request.params.command) {
    case 'mint':
      xdr = await mint(body, env)
    break;
    case 'offer':
      xdr = await offer(body, env)
    break;
  }

  const transaction = new Transaction(xdr, Networks[env.STELLAR_NETWORK])
  const signerAccountKeypair = Keypair.fromSecret(env.SIGNER_SK)
  const sponsorAccountKeypair = Keypair.fromSecret(env.SPONSOR_SK)

  transaction.sign(signerAccountKeypair)

  if (transaction.operations.findIndex((op) => op.type === 'beginSponsoringFutureReserves') > -1)
    transaction.sign(sponsorAccountKeypair)

  return text(transaction.toXDR())
})

router.get('/ipfs/:accountIssuer/:hash', async (request, env, ctx) => {
  if (await env.FLAGGED.get(request.params.accountIssuer))
    throw new StatusError(403, 'Forbidden')

  const response = await fetch(`https://ipfs.io/ipfs/${request.params.hash}`, {
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
})

router.post('/flag/:accountIssuer', async (request, env, ctx) => {
  await env.FLAGGED.put(request.params.accountIssuer, 1)
  return status(204)
})

router.all('*', () => {throw new StatusError(404, 'Not Found')})

exports.handlers = {
  fetch: (...args) => router
  .handle(...args)
  .then(response => {
    response.headers.append('Access-Control-Allow-Origin', '*') // cors ftw
    return response 
  })
}