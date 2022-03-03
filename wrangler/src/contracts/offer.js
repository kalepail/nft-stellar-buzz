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

export default async function offer(body, env) {
  const {
    userAccount,
    issuerAccount,
    offerId = 0,
    side,
  } = body

  const issuerAccountLoaded = await fetch(`${env.HORIZON_URL}/accounts/${issuerAccount}`)
  .then(handleResponse)

  const NFT = new Asset('NFT', issuerAccount)
  const sponsorAccount = Keypair.fromSecret(env.SPONSOR_SK).publicKey()

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

  selling = selling === 'native'
    ? XLM
    : selling
      ? new Asset(selling.code, selling.issuer)
      : NFT
  buying = buying === 'native'
    ? XLM
    : buying
      ? new Asset(buying.code, buying.issuer)
      : NFT

  if (offerId)
    amount = '0'
  else if (price)
    amount = '1'
  else
    price = { n: 1, d: new BigNumber(amount).toNumber() }

  return fetch(`${env.HORIZON_URL}/accounts/${userAccount}`)
  .then(handleResponse)
  .then((account) => {
    const ops = []
    const NFTBalance = account.balances.find(({ asset_code, asset_issuer }) =>
      asset_code === NFT.code
      && asset_issuer === NFT.issuer
    )

    if (!NFTBalance) ops.push(
      Operation.changeTrust({
        asset: NFT,
        limit: '1',
        source: userAccount
      }),
    )

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

    if (
      !NFTBalance
      || new BigNumber(NFTBalance.balance).isEqualTo(0)
    ) {
      ops.push(
        side === 'buy'
          ? Operation.pathPaymentStrictReceive({ // buying NFT for XLM
            sendAsset: selling,
            sendMax: price,
            destination: userAccount,
            destAsset: buying,
            destAmount: '1',
            path: [],
            source: userAccount
          })
          : Operation.pathPaymentStrictSend({ // selling XLM for NFT
            sendAsset: selling,
            sendAmount: amount,
            destination: userAccount,
            destAsset: buying,
            destMin: '1',
            path: [],
            source: userAccount
          }),
      )

      // Royalty payment if we wouldn't be paying ourselves
      if (userAccount !== issuerAccountLoaded.inflation_destination) ops.push(
        Operation.payment({
          destination: issuerAccountLoaded.inflation_destination,
          asset: selling,
          amount: new BigNumber(side === 'buy' ? price : amount).times(0.1).toFixed(7), // 10% of NFT counter asset
          source: userAccount
        }),
      )
    }

    else ops.push(
      Operation.beginSponsoringFutureReserves({
        sponsoredId: userAccount,
        source: sponsorAccount
      }),

      side === 'buy'
        ? Operation.manageBuyOffer({
          selling,
          buying,
          buyAmount: amount,
          price,
          offerId,
          source: userAccount
        })
        : Operation.manageSellOffer({
          selling,
          buying,
          amount,
          price,
          offerId,
          source: userAccount
        }),

      Operation.endSponsoringFutureReserves({
        source: userAccount
      }),
    )

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