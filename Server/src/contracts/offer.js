import BigNumber from 'bignumber.js'
import {
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Account,
  Keypair,
} from 'stellar-base'

import { handleResponse } from '../@js/utils'

const XLM = Asset.native()

// This is the API endpoint called in the ./Client/src/methods/apiOffer.js file
export default async function offer(body, env) {
  const {
    userAccount,
    issuerAccount,
    offerId = 0
  } = body

  const NFT = new Asset('NFT', issuerAccount)

  let {
    selling,
    buying,
    price,
    amount,
  } = body

  if (buying && selling)
    throw 'Cannot configure both buying and selling parameters'

  if (price && amount)
    throw 'Cannot configure both price and amount parameters'

  // Enforce XLM as the counter asset for now
  selling = selling === 'native'
    ? XLM
    : NFT
  buying = buying === 'native'
    ? XLM
    : NFT

  if (offerId) // If this isn't 0 we're deleting an offer so set the amount to 0
    amount = '0'
  else if (price)
    amount = '1'
  else
    price = { n: 1, d: new BigNumber(amount).toNumber() }

  return fetch(`${env.HORIZON_URL}/accounts/${userAccount}`)
  .then(handleResponse)
  .then(async (account) => {
    const ops = []

    // Attempt to retrieve this account's balance of NFT. A non-zero balance will be the determining factor for if this is an attempt to buy or sell the NFT.
      // (holders can only sell and non-holders can only buy)
    const NftBalance = account.balances.find(({ asset_code, asset_issuer }) =>
      asset_code === NFT.code
      && asset_issuer === NFT.issuer
    )

    // Regardless of the zero balance status if there is no trustline for this account ensure we start things off by opening up a trustline on this account for the NFT so they will be able to receive it later on in the transaction
    if (!NftBalance) ops.push(
      Operation.changeTrust({
        asset: NFT,
        limit: '1',
        source: userAccount
      }),
    )

    // Next regardless of the buy or sell direction all future actions will need to live between an authorization open and close "sandwich"
    ops.push(
      Operation.setTrustLineFlags({
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: true,
          authorizedToMaintainLiabilities: false
        },
        source: issuerAccount
      }),
    )

    // Now we're going to toggle between buying and selling the NFT
    
    // In this block if the NFT balance exists and is greater than we'll trigger the sell scenario 
    if (
      NftBalance
      && new BigNumber(NftBalance.balance).isGreaterThan(0)
    ) {
      // Queue up the sponsorAccount for the offer which will enable us to filter offers on the client side by this offer account
      const sponsorAccount = Keypair.fromSecret(env.SPONSOR_SK).publicKey()

      ops.push(
        // We'll wrap the sell offer in a sponsorship which will cause the sponsorAccount to stake the XLM to host the offer onchain and allow a clean and secure filter mechanic for the frontend to grab ahold of
        Operation.beginSponsoringFutureReserves({
          sponsoredId: userAccount,
          source: sponsorAccount
        }),
        
        // Configure a sell offer of NFT for XLM at the configured price and amount
        Operation.manageSellOffer({
          selling, // Selling NFT
          buying, // Buying XLM
          amount, // 1 if creating a new offer, 0 if deleting an existing offer
          price, // whatever the frontend passed along as the sale price for the NFT
          offerId, // 0 if creating a new offer or the id of the existing offer if deleting
          source: userAccount
        }),
        
        // Close the sponsorship to ensure no further subentries are sponsored for this account
        Operation.endSponsoringFutureReserves({
          source: userAccount
        }),
      )
    }

    // In the following block we're assuming there's an existing open offer to sell the NFT, if there isn't the pathPaymentStrictReceive op will fail causing the entire transaction to fail resulting in a net zero transaction
    else {
      // Load up the issuing account so we can retrieve the inflation destination for the royalty payment
      const { inflation_destination } = await fetch(`${env.HORIZON_URL}/accounts/${issuerAccount}`)
      .then(handleResponse)

      ops.push(
        // Assuming the NFT is actually for sale for the `price` this path payment will execute successfully resulting in an atomic swap of XLM for NFT
        Operation.pathPaymentStrictReceive({
          sendAsset: selling, // Selling XLM
          sendMax: price, // Will sell {x} XLM. Whatever the offer is requesting
          destination: userAccount, // The user is making a path payment to themselves sending out XLM and receiving NFT 
          destAsset: buying, // Buying NFT
          destAmount: '1', // Must receive 1 NFT. Important in order to ensure NFTs never fractionalize
          path: [], // In this case the path payment is direct with no intermediary paths. For more information on path payments read up here: https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-receive
          source: userAccount
        }),

        // The point of the whole project. The 10% royalty payment of the `price`
        Operation.payment({
          destination: inflation_destination, // Will pay out to the original minter. Or whatever address was added to the inflation destination on the mint command
          asset: selling, // The payment will be made with the same asset that we're selling. In our case XLM but this could be configured to be other assets just be aware you may want to use claimable balances as you cannot make payments for assets the destination doesn't have a trustline added for.
          amount: new BigNumber(price).times(0.1).toFixed(7), // 10% of NFT offer counter asset (in our case XLM)
          source: userAccount
        }),
      )
    }

    ops.push(
      Operation.setTrustLineFlags({
        trustor: userAccount,
        asset: NFT,
        flags: {
          authorized: false,
          authorizedToMaintainLiabilities: true
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