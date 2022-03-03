const HORIZON_URL = 'https://horizon-testnet.stellar.org'
const STELLAR_NETWORK = 'TESTNET'

import BigNumber from 'bignumber.js'
import {
  Server,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
} from 'stellar-sdk'

const XLM = Asset.native()
const server = new Server(HORIZON_URL)
const sponsorAccount = 'GBJHUYYBOJV5ZQOXK3AI4ADDZAHVT2GL7VFW3AUDG4TRL2VPBCI43HV6' // SAQS4BNTEUTGM3YEGSEYLIHLCJAU4C7OVDET6ZK6ZIZYUKHMIFVDXZV5

export default async (body) => {
  const { command } = body

  switch (command) {
    case 'mint':
      return mint(body)

    case 'offer':
      return offer(body)
  }
}

async function mint(body) {
  const {
    userAccount,
    issuerAccount,
    ipfsHash
  } = body

  const NFT = new Asset('NFT', issuerAccount)

  return server
    .loadAccount(userAccount)
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

      let transaction = new TransactionBuilder(account, {
        fee: new BigNumber(1).div('0.0000001').div(ops.length).toFixed(0, 3), // 1 XLM div # of ops
        networkPassphrase: Networks[STELLAR_NETWORK]
      }).setTimeout(0)

      ops.forEach((op) => transaction.addOperation(op))

      transaction = transaction.build()

      return transaction.toXDR()
    })
}

async function offer(body) {
  const {
    userAccount,
    issuerAccount,
    offerId = 0,
    side,
  } = body

  const issuerAccountLoaded = await server.loadAccount(issuerAccount)

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

  return server
    .loadAccount(userAccount)
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

      let transaction = new TransactionBuilder(account, {
        fee: new BigNumber(1).div('0.0000001').div(ops.length).toFixed(0, 3), // 1 XLM div # of ops
        networkPassphrase: Networks[STELLAR_NETWORK]
      }).setTimeout(0)

      ops.forEach((op) => transaction.addOperation(op))

      transaction = transaction.build()

      return transaction.toXDR()
    })
}