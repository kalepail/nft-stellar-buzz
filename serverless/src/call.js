import { Keypair, Networks, Transaction } from 'stellar-sdk'

import { parseError } from "./@js/utils"

import txFunction from '../../contracts/txFunction'

export default async (event) => {
  try {
    const body = JSON.parse(event.body)
    const xdr = await txFunction(body)

    const transaction = new Transaction(xdr, Networks[process.env.STELLAR_NETWORK])
    const signerAccountKeypair = Keypair.fromSecret(process.env.SIGNER_SK)
    const sponsorAccountKeypair = Keypair.fromSecret(process.env.SPONSOR_SK)

    transaction.sign(signerAccountKeypair)

    if (transaction.operations.findIndex((op) => op.type === 'beginSponsoringFutureReserves') > -1)
      transaction.sign(sponsorAccountKeypair)

    return {
      statusCode: 200,
      body: transaction.toXDR()
    }
  }

  catch (err) {
    return parseError(err)
  }
}