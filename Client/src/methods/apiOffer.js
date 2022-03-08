import BigNumber from 'bignumber.js'

import { server, handleResponse } from '../@js/utils'

const { Transaction, Networks } = StellarSdk

export default function apiOffer(side, record) {
  let price

  if (side === 'sell') // If selling NFT open browser prompt to capture XLM sale price (less royalty payment)
    price = prompt('Enter the sale price in XLM')
  else // If buying NFT we assume the offer price. Consider this a "Buy it now" flow like on Ebay
    price = record.price

  if (!price)
    return

  price = new BigNumber(price).toFixed(7) // Stellar prices must be <= 7 decimal places so stunt our input value to that size

  this.loading = true

  // Depending on the state of the sale and the counter party making the request the asset issuer will be one of these values in this order
  const issuerAccount = record.asset_issuer || record.buying.asset_issuer || record.selling.asset_issuer

  // Make the request to the Auth Server for an appropriately defined XDR for the sale or purchase of the NFT
  return fetch(`${this.apiUrl}/contract/offer`, {
    method: 'POST',
    body: JSON.stringify({
      userAccount: this.userAccount,
      issuerAccount, // The issuing account for the NFT. The account hosting the metadata
      offerId: side === 'delete' ? record.id : 0, // If we're creating a new offer this will be zero. If we're deleting the offer this will be the id of the existing offer
      price, // The price as input into the prompt
      [side === 'sell' ? 'buying' : 'selling']: 'native' // If we're selling the NFT we want to "buy" XLM (native). If we're buying the NFT we're selling XLM
    }),
  })
  .then(handleResponse)
  .then((xdr) => {
    // When the XDR comes back from the Auth Server we need to add a signature so let's load up the raw XDR string into a Stellar Transaction object
    const transaction = new Transaction(xdr, Networks.TESTNET)

    // When the request comes back we need to add our own signature from our account to the XDR so the blockchain has permission to create or modify an offer involving us
    transaction.sign(this.userKeypair)

    // Once we're all sign up we can submit our transaction to the Stellar blockchain!
    return server.submitTransaction(transaction)
  })
  .then(() => this.refresh()) // Once we successfully submit we can update all the accounts and offers
  .finally(() => this.loading = false)
}