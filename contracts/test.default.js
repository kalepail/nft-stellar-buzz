import { Keypair, Networks, Server, Transaction } from "stellar-sdk";

import txFunction from "./txFunction";

const sponsorAccountKeypair = Keypair.fromSecret('<contract-offer-sponsor-account-secret-key>')

const userAccountKeypair = Keypair.fromSecret('SCEUON2UI73MYX27PTYWMO4W7AQ5YKU4TCIRR6UWS3L6VIZEAOEN6FFW') // GCJNSWOAN7DOZD55ASZEO7BOZ4S27C5QWZRLEOZRRUAN3PG5OU7OUIKH
const userAccount = userAccountKeypair.publicKey()

const counterAccountKeypair = Keypair.fromSecret('SBFJ5TXBNVZOBRBCKDWZRGIUSIUTZHPMAQWTSI7U3B375H7Z5VBRJJZG') // GCC3LGB4ATJFFPTWYGSZFFQGBAOJF2HXANMVHE4XPH3L52VKL2HPEO7Z
const counterAccount = counterAccountKeypair.publicKey()

const issuerAccountKeypair = Keypair.random()
const issuerAccount = issuerAccountKeypair.publicKey()

const server = new Server('https://horizon-testnet.stellar.org')

console.log(`
userAccount: ${userAccount}
counterAccount: ${counterAccount}
issuerAccount: ${issuerAccount}
`);

; (async () => {
  try {
    await Promise.all([
      server.loadAccount(userAccount)
      .catch((err) => {
        if (err?.response?.status === 404)
          return server.friendbot(userAccount).call()
        throw err
      }),

      server.loadAccount(counterAccount)
      .catch((err) => {
        if (err?.response?.status === 404)
          return server.friendbot(counterAccount).call()
        throw err
      }),

      server.loadAccount(issuerAccount)
      .catch((err) => {
        if (err?.response?.status === 404)
          return server.friendbot(issuerAccount).call()
        throw err
      })
    ])
  } catch(err) {
    console.error(err)
  }

  console.log(`Initial mint (user receive)`)
  await txFunction({
    userAccount,
    issuerAccount,
    command: 'mint',
    ipfsHash: 'Qmcjz4R9wQWWqMMizHKXs3VhmeCspAYUJNtLcbT9PZCt2R',
  })
  .then((xdr) => {
    const transaction = new Transaction(xdr, Networks.TESTNET)

    transaction.sign(
      userAccountKeypair,
      issuerAccountKeypair
    )

    return server.submitTransaction(transaction)
  })
  .then(parseResponse)
  .catch(parseError)

  console.log(`(user give)`)
  await txFunction({
    userAccount,
    issuerAccount,
    command: 'offer',
    side: 'sell',
    price: '100',
    buying: 'native',
  })
  .then((xdr) => {
    const transaction = new Transaction(xdr, Networks.TESTNET)

    transaction.sign(
      userAccountKeypair,
      issuerAccountKeypair,
      sponsorAccountKeypair
    )

    return server.submitTransaction(transaction)
  })
  .then(parseResponse)
  .catch(parseError)

  console.log(`(counter receive)`)
  await txFunction({
    userAccount: counterAccount,
    issuerAccount,
    command: 'offer',
    side: 'sell',
    amount: '100',
    selling: 'native',
  })
  .then((xdr) => {
    const transaction = new Transaction(xdr, Networks.TESTNET)

    transaction.sign(
      counterAccountKeypair,
      issuerAccountKeypair
    )

    console.log('(should pay an extra 10 XLM for the royalty payment)')
    return server.submitTransaction(transaction)
  })
  .then(parseResponse)
  .catch(parseError)

  console.log(`(counter give)`);
  await txFunction({
    userAccount: counterAccount,
    issuerAccount,
    command: 'offer',
    side: 'buy',
    amount: '100',
    buying: 'native',
  })
  .then((xdr) => {
    const transaction = new Transaction(xdr, Networks.TESTNET)

    transaction.sign(
      counterAccountKeypair,
      issuerAccountKeypair,
      sponsorAccountKeypair
    )

    return server.submitTransaction(transaction)
  })
  .then(parseResponse)
  .catch(parseError)

  console.log(`(user receive)`)
  await txFunction({
    userAccount,
    issuerAccount,
    command: 'offer',
    side: 'buy',
    price: '100',
    selling: 'native',
  })
  .then((xdr) => {
    const transaction = new Transaction(xdr, Networks.TESTNET)

    transaction.sign(
      userAccountKeypair,
      issuerAccountKeypair
    )

    return server.submitTransaction(transaction)
  })
  .then(parseResponse)
  .catch(parseError)
})()

function parseError(err) {
  console.error(
    err?.response?.data?.extras?.result_codes
    || err?.response?.data
    || err?.response
    || err
  )
}

async function parseResponse(res) {
  console.log(res.id)

  console.log('userAccount balance')
  await loadAccount(userAccount)

  console.log('counterAccount balance')
  await loadAccount(counterAccount)

  console.log('\n')
}

function loadAccount(id) {
  return server.loadAccount(id)
    .then((account) => {
      const XLMBalance = account.balances.find(({ asset_type }) => asset_type === 'native')
      console.log(XLMBalance.balance)
    })
}