import BigNumber from 'bignumber.js'
import {
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Account,
} from 'stellar-base'

import { handleResponse } from '../@js/utils'

// This is the API endpoint called in the ./Client/src/methods/apiMint.js file
export default async function mint(body, env) {
  const {
    userAccount,
    issuerAccount,
    ipfsHash
  } = body

  // Configure the NFT asset
  // NOTE: There's nothing particularly special about the 'NFT' code name but if you change it here you'll want to also change references to "NFT" the code name on the client side when searching for ipfs hashes
  const NFT = new Asset('NFT', issuerAccount)

  // First we'll load up the user account as it will pay the transaction fee and sequence number 
  return fetch(`${env.HORIZON_URL}/accounts/${userAccount}`)
  .then(handleResponse)
  .then((account) => {
    const ops = []

    ops.push(
      Operation.setOptions({
        setFlags: 15, // This is where we configure the NFT we're about the issue as an auth required asset
        inflationDest: userAccount, // This is where we mark the account which will receive the royalty payments
        source: issuerAccount
      }),

      Operation.manageData({ // This is where we assign the ipfsHash as metadata to the issuing account
        name: 'ipfshash',
        value: ipfsHash,
        source: issuerAccount
      }),

      Operation.changeTrust({ // This is where we open access on the user account to receive the original, only, 1:1 NFT
        asset: NFT,
        limit: '1',
        source: userAccount
      }),

      Operation.setTrustLineFlags({ // This is the first authorization open operation for the new NFT allowing it to be minted from the issuing account to the mint/royalty user account
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: true
        },
        source: issuerAccount
      }),

      Operation.payment({ // Within the open/close setTrustLineFlags operations we have the payment from the issuer to the user for the NFT
        destination: userAccount,
        asset: NFT,
        amount: '1',
        source: issuerAccount,
      }),

      Operation.setTrustLineFlags({ // Now that the payment for the NFT has been made we close the authorization effectively locking down the NFT into the user account where they may now hold the NFT but not sell it unless they do so through the authorized/official `offer.js` contract
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: false
        },
        source: issuerAccount
      }),
    )

    // Now that we have all the ops configured we can build the Stellar Transaction and pass it back to the user request after signing it in the ./Server/src/api/contract.js route
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