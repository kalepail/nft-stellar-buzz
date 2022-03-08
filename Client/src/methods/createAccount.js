import { server } from '../@js/utils'

const { Keypair, TransactionBuilder, Networks, Operation } = StellarSdk

export default function createAccount(type) {
  this.loading = true

  // When we're creating an account we need to start with a fresh Keypair
  const newAccountKeypair = Keypair.random()
  const newAccount = newAccountKeypair.publicKey()
  
  return server
  .friendbot(newAccount) // Using friendbot here let's us create the new Keypair account with 10,000 XLM. Once you move to production friendbot won't be available so you'll need to use the createAccount operation directly
  .call()
  .then(() => server
  .loadAccount(newAccount)
  .then((account) => {
    // Once the account is creating we just return it in the case that we're creating a new user ...
    if (type === 'user')
      return account

    // ... but if we're creating a new issuer we actually need to submit a simple transaction adding the Auth Server signer as an authorized signer to the new NFT issuer account
    else if (type === 'issuer') {
      const transaction = new TransactionBuilder(account, {
        fee: 10000000, // For information on Stellar transaction fees read up here: https://developers.stellar.org/docs/glossary/fees/#stellar-docsearch-form
        networkPassphrase: Networks.TESTNET // For information on the Network Passphrase read up here: https://developers.stellar.org/docs/glossary/network-passphrase/#stellar-docsearch-form
      })
      .addOperation(Operation.setOptions({ // This transaction consists of just a single setOptions operation adding a single fully authorized signer
        signer: {
          ed25519PublicKey: this.signer,
          weight: 1
        }
      })) // Read more about the setOptions operation here: https://developers.stellar.org/docs/start/list-of-operations/#set-options
      .setTimeout(0)
      .build()

      // The new account at this point only has the one signer so we'll use that now but after that we can safely forget about this signer as the above "this.signer" will now be a fully qualified signer so moving forward we can just use that private key counterpart to this public key as the signer for this NFT issuing account
      transaction.sign(newAccountKeypair)

      // Finally submit and assuming success we're ready to mint and move a new NFT from this account
      return server.submitTransaction(transaction)
    }
  }))
  .then(() => { // After success from the above `then` statement we can assign interface variables to update the DOM
    if (type === 'user')
      this.userSecret = newAccountKeypair.secret()

    else if (type === 'issuer')
      this.issuerAccount = newAccount
  })
  .finally(() => this.loading = false)
}