import { server, handleResponse } from '../@js/utils'
import BigNumber from 'bignumber.js'

const { Transaction, TransactionBuilder, Networks } = StellarSdk

export default function apiMint() {
  this.loading = true

  // Once we've generated and configured a fresh new Issuing account from the `createAccount` method we're ready to attach metadata to it and issue an NFT from it
  return fetch(`${this.apiUrl}/contract/mint`, {
    method: 'POST',
    body: JSON.stringify({
      userAccount: this.userAccount,
      issuerAccount: this.issuerAccount, // The new issuing account we created in the `createAccount` method
    })
  })
  .then(handleResponse)
  .then((xdr) => {
    // When the XDR comes back from the Auth Server we need to add a signature so let's load up the raw XDR string into a Stellar Transaction object
    const innerTx = new Transaction(xdr, Networks.TESTNET)

    // When the request comes back we need to add our own signature from our account to the XDR so the blockchain has permission to execute this transaction containing operations where our account is the source
    innerTx.sign(this.userKeypair)

    // Once we're all sign up we can submit our transaction to the Stellar blockchain!
    // console.log(innerTx)
    // console.log(innerTx.toXDR());

    const feeBumpTx = new TransactionBuilder.buildFeeBumpTransaction(
      this.userKeypair,
      new BigNumber(1).div('0.0000001').div(innerTx.operations.length).toFixed(0, 3), // 1 XLM div # of ops,
      innerTx,
      Networks.TESTNET
    )
  
    feeBumpTx.sign(this.userKeypair)

    console.log(feeBumpTx)
    console.log(feeBumpTx.toXDR())

    return server.submitTransaction(feeBumpTx)

    
  })
  .then(() => this.refresh())
  .finally(() => this.loading = false)
}