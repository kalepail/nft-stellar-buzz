import { Keypair, Networks, Transaction } from 'stellar-base'
import { text } from 'itty-router-extras'

import mint from '../contracts/mint'
import offer from '../contracts/offer'

export default async (request, env, ctx) => {
  const body = await request.json()

  let xdr

  switch(request.params.command) {
    case 'mint':
      xdr = await mint(body, env)
    break
    case 'offer':
      xdr = await offer(body, env)
    break
  }

  const transaction = new Transaction(xdr, Networks[env.STELLAR_NETWORK])
  const signerAccountKeypair = Keypair.fromSecret(env.SIGNER_SK)
  const sponsorAccountKeypair = Keypair.fromSecret(env.SPONSOR_SK)

  transaction.sign(signerAccountKeypair)

  if (transaction.operations.findIndex((op) => op.type === 'beginSponsoringFutureReserves') > -1)
    transaction.sign(sponsorAccountKeypair)

  return text(transaction.toXDR())
}