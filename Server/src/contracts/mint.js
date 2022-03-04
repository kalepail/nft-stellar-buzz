import BigNumber from 'bignumber.js'
import {
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Account,
} from 'stellar-base'

import { handleResponse } from '../@js/utils'

export default async function mint(body, env) {
  const {
    userAccount,
    issuerAccount,
    ipfsHash
  } = body

  const NFT = new Asset('NFT', issuerAccount)

  return fetch(`${env.HORIZON_URL}/accounts/${userAccount}`)
  .then(handleResponse)
  .then((account) => {
    const ops = []

    ops.push(
      Operation.setOptions({
        setFlags: 15,
        inflationDest: userAccount,
        source: issuerAccount
      }),

      Operation.manageData({
        name: 'ipfshash',
        value: ipfsHash,
        source: issuerAccount
      }),

      Operation.changeTrust({
        asset: NFT,
        limit: '1',
        source: userAccount
      }),

      Operation.setTrustLineFlags({
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: true
        },
        source: issuerAccount
      }),

      Operation.payment({
        destination: userAccount,
        asset: NFT,
        amount: '1',
        source: issuerAccount,
      }),

      Operation.setTrustLineFlags({
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: false
        },
        source: issuerAccount
      }),
    )

    let transaction = new TransactionBuilder(
      new Account(account.id, account.sequence), 
      {
        fee: new BigNumber(1).div('0.0000001').div(ops.length).toFixed(0, 3), // 1 XLM div # of ops
        networkPassphrase: Networks[env.STELLAR_NETWORK]
      }
    ).setTimeout(0)

    ops.forEach((op) => transaction.addOperation(op))

    transaction = transaction.build()

    return transaction.toXDR()
  })
}