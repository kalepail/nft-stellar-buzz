import { server, handleResponse } from '../@js/utils'

const { Transaction, Networks } = StellarSdk

export default function apiMint() {
  this.loading = true

  // Once we've generated and configured a fresh new Issuing account from the `createAccount` method we're ready to attach metadata to it and issue an NFT from it
  return fetch(`${this.apiUrl}/contract/mint`, {
    method: 'POST',
    body: JSON.stringify({
      userAccount: this.userAccount,
      issuerAccount: this.issuerAccount, // The new issuing account we created in the `createAccount` method
      ipfsHash: this.ipfsHash // The IPFS hash we input on the interface and uploaded onto IPFS. Maybe via https://nft.storage/ or https://www.pinata.cloud/
    })
  })
  .then(handleResponse)
  .then((xdr) => {
    // When the XDR comes back from the Auth Server we need to add a signature so let's load up the raw XDR string into a Stellar Transaction object
    const transaction = new Transaction(xdr, Networks.TESTNET)

    // When the request comes back we need to add our own signature from our account to the XDR so the blockchain has permission to execute this transaction containing operations where our account is the source
    transaction.sign(this.userKeypair)

    // Once we're all sign up we can submit our transaction to the Stellar blockchain!
    return server.submitTransaction(transaction)
  })
  .then(() => {
    // Reset the interface and reload all our accounts and offers
    this.issuerAccount = null
    this.ipfsHash = null
    this.refresh()
  })
  .finally(() => this.loading = false)
}