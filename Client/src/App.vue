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

  <form @submit.prevent="apiMint">
    <label>
      User Secret
      <input type="text" v-model="userSecret" />
      <button @click="createAccount('user')" type="button" :disabled="loading">{{userSecret ? 'Regenerate' : 'Generate'}}</button>
    </label>

    <label>
      Issuer Public Key
      <input type="text" v-model="issuerAccount" />
      <button @click="createAccount('issuer')" type="button" :disabled="loading">{{issuerAccount ? 'Regenerate' : 'Generate'}}</button>
    </label>

    <button :disabled="loading" v-if="issuerAccountLoaded">Mint</button>
  </form>

  <h1>NFTs</h1>

  <ul v-if="userAccountLoaded">
    <li
      v-for="balance in userAccountLoaded.balances.filter((balance) => 
        balance.asset_type !== 'native' 
        && parseFloat(balance.balance) 
        && !parseFloat(balance.selling_liabilities)
      )"
      :key="balance.asset_type + balance.asset_code + balance.asset_issuer"
      @click="flag(balance.asset_issuer)"
    >
      <img :src="`${apiUrl}/image/${balance.asset_issuer}/${balance.asset_code}`" />
      <button @click="apiOffer('sell', balance)" :disabled="loading">Sell</button>
    </li>
  </ul>

  <ul v-if="offers.length">
    <li 
      v-for="offer in offers" 
      :key="offer.id"
      @click="flag(offer.buying.asset_issuer || offer.selling.asset_issuer)"
    >
      <img :src="`${apiUrl}/image/${
        offer.buying.asset_issuer 
        || offer.selling.asset_issuer
      }/${
        offer.buying.asset_code 
        || offer.selling.asset_code
      }`" v-if="
        offer.buying.asset_code 
        || offer.selling.asset_code
      " />
      <button @click="apiOffer('delete', offer)" :disabled="loading" v-if="offer.seller === userAccount">Delete Offer</button>
      <button @click="apiOffer('buy', offer)" :disabled="loading" v-html="offerPriceString(offer)" v-else-if="userAccountLoaded"></button>
    </li>
  </ul>

  <footer>
    <a href="https://github.com/tyvdh/nft-stellar-buzz">GitHub Repo</a>
  </footer>
</template>

<script>
import BigNumber from 'bignumber.js'

import { server, handleResponse } from './@js/utils'

import createAccount from './methods/createAccount'
import apiMint from './methods/apiMint'
import apiOffer from './methods/apiOffer'

const { Keypair, StrKey } = StellarSdk

export default {
  data() {
    return {
      runAsAdmin: false,

      signer: import.meta.env.VITE_SIGNER_PK,
      sponsor: import.meta.env.VITE_SPONSOR_PK,
      apiUrl: import.meta.env.VITE_WRANGLER_API,

      userSecret: localStorage.getItem('userSecret'),
      issuerAccount: localStorage.getItem('issuerAccount'),

      userAccountLoaded: null,
      issuerAccountLoaded: null,

      offers: [],
      loading: false
    }
  },
  computed: {
    userKeypair() {
      return this.userSecret ? Keypair.fromSecret(this.userSecret) : null
    },
    userAccount() {
      return this.userKeypair?.publicKey()
    },
  },
  watch: {
    userSecret() {
      if (StrKey.isValidEd25519PublicKey(this.userAccount))
        localStorage.setItem('userSecret', this.userSecret)
    },
    async userAccount() {
      if (this.userAccount)
        this.userAccountLoaded = await this.loadAccount(this.userAccount)
    },
    async issuerAccount() {
      if (StrKey.isValidEd25519PublicKey(this.issuerAccount)) {
        this.issuerAccountLoaded = await this.loadAccount(this.issuerAccount)
        localStorage.setItem('issuerAccount', this.issuerAccount)
      }
    },
  },
  created() {
    this.refresh()

    if (location.pathname.indexOf('admin') > -1) {
      history.replaceState(null, null, '/')
      this.runAsAdmin = true
    }

    // If the sponsor account doesn't exist go ahead and create it. Thanks occasional testnet resets! 🙄
    server.loadAccount(this.sponsor)
    .catch((err) => {
      if (err?.response?.status === 404)
        return server.friendbot(this.sponsor).call()
      throw err
    })
  },
  methods: {
    async refresh() {
      this.loading = true
      
      const [
        offers,
        userAccountLoaded,
        issuerAccountLoaded,
      ] = await Promise.all([
        this.updateOffers(),
        this.loadAccount(this.userAccount),
        this.loadAccount(this.issuerAccount),
      ])

      this.offers = offers
      this.userAccountLoaded = userAccountLoaded
      this.issuerAccountLoaded = issuerAccountLoaded

      this.loading = false
    },
    flag(issuerAccount) {
      if (!this.runAsAdmin)
        return

      if (confirm('Are you sure you want to flag this NFT?'))
        return fetch(`${this.apiUrl}/flag/${issuerAccount}`, {
          method: 'POST'
        }).then(handleResponse)
    },

    createAccount,
    loadAccount(accountId) {
      return accountId 
      ? server
      .loadAccount(accountId)
      .catch((err) => {
        if (err?.response?.status === 404)
          return server.friendbot(accountId).call()
      })
      : null
    },
    updateOffers() {
      return server
      .offers()
      .sponsor(this.sponsor) // When looking up all open NFT sell offers we use the offer sponsor field to filter out offers to only those involving our specific NFT project
      .call()
      .then(({ records }) => records)
    },

    apiMint,
    apiOffer,

    offerPriceString(offer) {
      return `
        <span>Buy for <strong>${parseFloat(new BigNumber(offer.price).times(1.1).toFixed(7))} XLM</strong></span>
        <span>${parseFloat(new BigNumber(offer.price).toFixed(7))} XLM base</span>
        <span>+10% royalty (${parseFloat(new BigNumber(offer.price).times(0.1).toFixed(7))} XLM)</span>
      `
    }
  }
}
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

  &:hover {
    color: blue;
  }
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
  margin-right: -10px;
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
    max-width: 100%;
    max-height: calc(16px * 12);
  }
  button {
    height: auto;
    padding: 5px 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;
    margin-top: 10px;

    span {

      &:first-of-type {
        margin-bottom: 5px;
      }
      &:nth-child(n + 2) {
        color: gray;
      }
    }
  }
}
strong {
  font-weight: 600;
}
footer {
  margin-top: 30px;
}
</style>