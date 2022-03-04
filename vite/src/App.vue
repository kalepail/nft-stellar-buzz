<template>
  <p v-if="userAccountLoaded">
    <button @click="refresh" :disabled="loading">Refresh</button>

    {{
      Math.ceil(parseFloat(userAccountLoaded.balances.find(
        ({ asset_type }) => asset_type === 'native'
      ).balance))
    }}
    XLM
  </p>

  <h1>Mint NFT</h1>

  <form @submit.prevent="mint">
    <label>
      User Secret
      <input type="text" v-model="userSecret" />
      <button @click="regenerate('user')" type="button" :disabled="loading">{{userSecret ? 'Regenerate' : 'Generate'}}</button>
    </label>

    <label>
      Issuer Public Key
      <input type="text" v-model="issuerAccount" />
      <button @click="regenerate('issuer')" type="button" :disabled="loading">{{issuerAccount ? 'Regenerate' : 'Generate'}}</button>
    </label>

    <label>
      IPFS Hash
      <input type="text" v-model="ipfsHash" />
      <img :src="`${apiUrl}/ipfs/0x0/${ipfsHash}`" v-if="ipfsHash" />
    </label>

    <button :disabled="loading">Mint</button>
  </form>

  <h1>NFTs</h1>

  <ul v-if="userAccountLoaded">
    <li
      v-for="balance in userAccountLoaded.balances.filter((balance) => 
        balance.asset_type !== 'native' 
        && balance.asset_code === 'NFT'
        && parseFloat(balance.balance) 
        && !parseFloat(balance.selling_liabilities)
      )"
      :key="balance.asset_type + balance.asset_code + balance.asset_issuer"
      @click="flag(balance.asset_issuer)"
    >
      <img :src="`${apiUrl}/ipfs/${balance.asset_issuer}/${ipfsHashMap[balance.asset_issuer]}`" v-if="ipfsHashMap[balance.asset_issuer]" />
      <button @click="offer('sell', balance)" :disabled="loading">Sell</button>
    </li>
  </ul>

  <ul v-if="offers.length">
    <li 
      v-for="offer in offers" 
      :key="offer.id"
      @click="flag(offer.buying.asset_issuer || offer.selling.asset_issuer)"
    >
      <img :src="`${apiUrl}/ipfs/${
        offer.buying.asset_issuer 
        || offer.selling.asset_issuer
      }/${ipfsHashMap[
        offer.buying.asset_issuer
        || offer.selling.asset_issuer
      ]}`" v-if="ipfsHashMap[
        offer.buying.asset_issuer
        || offer.selling.asset_issuer
      ]" />
      <button @click="offer('buy', offer, 'delete')" :disabled="loading" v-if="offer.seller === userAccount">Delete Offer</button>
      <button @click="offer('buy', offer)" :disabled="loading" v-else>Buy</button>
    </li>
  </ul>
</template>

<script>
import { handleResponse } from './@js/utils'

const { Keypair, Server, Transaction, TransactionBuilder, Networks, StrKey, Operation } = StellarSdk;
const server = new Server('https://horizon-testnet.stellar.org');

export default {
  data() {
    return {
      runAsAdmin: false,

      signer: import.meta.env.VITE_SIGNER_PK,
      sponsor: import.meta.env.VITE_SPONSOR_PK,
      apiUrl: import.meta.env.VITE_WRANGLER_API,

      userSecret: localStorage.getItem('secret'),
      issuerAccount: null,
      ipfsHash: null,

      userAccountLoaded: null,
      issuerAccountLoaded: null,

      offers: [],
      ipfsHashMap: {},

      loading: false
    };
  },
  computed: {
    userKeypair() {
      return this.userSecret ? Keypair.fromSecret(this.userSecret) : null;
    },
    userAccount() {
      return this.userKeypair?.publicKey();
    },
  },
  watch: {
    userSecret() {
      if (StrKey.isValidEd25519PublicKey(this.userAccount))
        localStorage.setItem('secret', this.userSecret)
    },
    async userAccount() {
      if (this.userAccount)
        this.userAccountLoaded = await this.updateAccount(this.userAccount);
    },
    async issuerAccount() {
      if (this.issuerAccount)
        this.issuerAccountLoaded = await this.updateAccount(this.issuerAccount);
    },
  },
  created() {
    if (location.pathname.indexOf('admin') > -1) {
      history.replaceState(null, null, '/')
      this.runAsAdmin = true
    }

    server.loadAccount(this.sponsor)
    .catch((err) => {
      if (err?.response?.status === 404)
        return server.friendbot(this.sponsor).call()
      throw err
    })
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true
      
      const [
        userAccountLoaded,
        issuerAccountLoaded,
        offers
      ] = await Promise.all([
        this.updateAccount(this.userAccount),
        this.updateAccount(this.issuerAccount),
        this.updateOffers()
      ])

      this.userAccountLoaded = userAccountLoaded;
      this.issuerAccountLoaded = issuerAccountLoaded;
      this.offers = offers;

      this.loading = false
    },
    regenerate(type) {
      this.loading = true

      const newAccountKeypair = Keypair.random()
      const newAccount = newAccountKeypair.publicKey()
      
      return server
      .friendbot(newAccount)
      .call()
      .then(() => {
        return server
        .loadAccount(newAccount)
        .then((account) => {
          if (type === 'user')
            return account
          else if (type === 'issuer') {
            const transaction = new TransactionBuilder(account, {
              fee: 10000000,
              networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.setOptions({
              signer: {
                ed25519PublicKey: this.signer,
                weight: 1
              }
            }))
            .setTimeout(0)
            .build()

            transaction.sign(newAccountKeypair)

            return server.submitTransaction(transaction)
          }
        })
      })
      .then(() => {
        if (type === 'user')
          this.userSecret = newAccountKeypair.secret()
        else if (type === 'issuer')
          this.issuerAccount = newAccount
      })
      .finally(() => this.loading = false)
    },

    flag(issuerAccount) {
      if (!this.runAsAdmin)
        return

      if (confirm('Are you sure you want to flag this NFT?'))
        return fetch(`${this.apiUrl}/flag/${issuerAccount}`, {
          method: 'POST'
        })
        .then(handleResponse)
    },
    updateAccount(accountId) {
      if (!accountId)
        return

      return server
      .loadAccount(accountId)
      .then((account) => {
        if (account.data_attr.ipfshash)
          this.ipfsHashMap[account.id] = atob(account.data_attr.ipfshash)

        account.balances.forEach((balance) => {
          if (
            balance.asset_type !== 'native' 
            && balance.asset_code === 'NFT'
          ) {
            server.loadAccount(balance.asset_issuer)
            .then((account) => {
              if (account.data_attr.ipfshash)
                this.ipfsHashMap[account.id] = atob(account.data_attr.ipfshash)
            })
          }
        })

        return account
      })
    },
    updateOffers() {
      return server
        .offers()
        .sponsor(this.sponsor)
        .call()
        .then(({ records }) => {
          records.forEach((record) => {
            this.updateAccount(record.selling.asset_issuer)
            this.updateAccount(record.buying.asset_issuer)
          })

          return records
        });
    },

    mint() {
      this.loading = true

      return fetch(`${this.apiUrl}/contract/mint`, {
        method: 'POST',
        body: JSON.stringify({
          userAccount: this.userAccount,
          issuerAccount: this.issuerAccount,
          ipfsHash: this.ipfsHash
        })
      })
      .then(handleResponse)
      .then((xdr) => {
        const transaction = new Transaction(xdr, Networks.TESTNET);

        transaction.sign(this.userKeypair);

        return server.submitTransaction(transaction);
      })
      .then(() => {
        this.issuerAccount = null
        this.ipfsHash = null
        this.refresh()
      })
      .finally(() => this.loading = false)
    },
    offer(side, record, command) {
      this.loading = true

      const issuerAccount = record.asset_issuer || record.buying.asset_issuer || record.selling.asset_issuer
      const isDelete = command === 'delete'

      return (
        side === 'buy'
        ? fetch(`${this.apiUrl}/contract/offer`, {
            method: 'POST',
            body: JSON.stringify({
              userAccount: this.userAccount,
              issuerAccount,
              offerId: isDelete ? record.id : 0,
              side: 'buy',
              price: '100',
              selling: 'native',
            }),
          })
        : fetch(`${this.apiUrl}/contract/offer`, {
            method: 'POST',
            body: JSON.stringify({
              userAccount: this.userAccount,
              issuerAccount,
              offerId: isDelete ? record.id : 0,
              side: 'sell',
              price: '100',
              buying: 'native',
            }),
          })
      )
      .then(handleResponse)
      .then((xdr) => {
        const transaction = new Transaction(xdr, Networks.TESTNET);

        transaction.sign(this.userKeypair);

        return server.submitTransaction(transaction);
      })
      .then(() => this.refresh())
      .finally(() => this.loading = false)
    },
  },
};
</script>

<style lang="scss">
body {
  background-color: whitesmoke;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 10px;
  font-size: 16px;
}
h1 {
  margin: 30px 0 10px;
  font-size: 36px;
  font-weight: 600;
}
img {
  display: block;
}
form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
label {
  display: flex;
  align-items: center;
  margin-bottom: 5px;

  img {
    width: calc(16px * 2);
  }
}
button {
  margin: 0;
  padding: 0 10px;
  line-height: 1;
  font-size: 12px;
  outline: none;
  appearance: none;
  background-color: white;
  border: solid 1px black;
  color: black;
  border-radius: 3px;
  height: 30px;
  cursor: pointer;

  &:disabled {
    color: gray;
    border: solid 1px gray;
    pointer-events: none;
  }
}
input {
  margin: 0 5px 0 10px;
  outline: none;
  appearance: none;
  background-color: white;
  border: solid 1px black;
  color: black;
  border-radius: 3px;
  padding: 0 10px;
  height: 30px;
  font-size: 12px;
}
ul {
    display: flex;
    flex-wrap: wrap;
}
li {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin: 0 10px 10px 0;
  background-color: white;
  box-shadow: 0 5px 10px lightgray, inset 0 0 0 1px lightgray;
  padding: 10px;
  border-radius: 5px;

  img {
    height: calc(16px * 8);
    margin-bottom: 10px;
  }
}
</style>
