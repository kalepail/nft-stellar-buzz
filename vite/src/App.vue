<template>
  <p v-if="userAccountLoaded">
    <button @click="refresh" :disabled="loading">Refresh</button>

    {{
      parseInt(userAccountLoaded.balances.find(
        ({ asset_type }) => asset_type === 'native'
      ).balance)
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
      <img :src="`https://gateway.pinata.cloud/ipfs/${ipfsHash}`" v-if="ipfsHash" />
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
    >
      <img :src="`https://gateway.pinata.cloud/ipfs/${ipfsHashMap[balance.asset_issuer]}?preview=1`" />
      <button @click="trade('sell', balance)" :disabled="loading">Sell</button>
    </li>
  </ul>

  <ul v-if="offers.length">
    <li v-for="offer in offers" :key="offer.id">
      <img :src="`https://gateway.pinata.cloud/ipfs/${ipfsHashMap[
        offer.buying.asset_issuer
        || offer.selling.asset_issuer
      ]}?preview=1`" />
      <button @click="trade('buy', offer, 'delete')" :disabled="loading" v-if="offer.seller === userAccount">Delete Offer</button>
      <button @click="trade('buy', offer)" :disabled="loading" v-else>Buy</button>
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
      signer: 'GD6266NKBLK4VVGWUKY4HMNHADNDPYY32RXEHSQ354SBAMKM5XQZDZTZ',
      sponsor: 'GBJHUYYBOJV5ZQOXK3AI4ADDZAHVT2GL7VFW3AUDG4TRL2VPBCI43HV6',

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

      return fetch(`https://igvfiv902k.execute-api.us-east-1.amazonaws.com/contract`, {
        method: 'POST',
        body: JSON.stringify({
          userAccount: this.userAccount,
          issuerAccount: this.issuerAccount,
          command: 'mint',
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
    trade(side, record, command) {
      this.loading = true

      const issuerAccount = record.asset_issuer || record.buying.asset_issuer || record.selling.asset_issuer
      const isDelete = command === 'delete'

      return (
        side === 'buy'
        ? fetch(`https://igvfiv902k.execute-api.us-east-1.amazonaws.com/contract`, {
            method: 'POST',
            body: JSON.stringify({
              userAccount: this.userAccount,
              issuerAccount,
              offerId: isDelete ? record.id : 0,
              command: 'offer',
              side: 'buy',
              price: '100',
              selling: 'native',
            }),
          })
        : fetch(`https://igvfiv902k.execute-api.us-east-1.amazonaws.com/contract`, {
            method: 'POST',
            body: JSON.stringify({
              userAccount: this.userAccount,
              issuerAccount,
              offerId: isDelete ? record.id : 0,
              command: 'offer',
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
  image-rendering: optimizeSpeed;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -moz-crisp-edges;
}
form {
  display: flex;
  flex-direction: column;
  align-items: start;
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
  align-items: end;
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
