# NFT Stellar Buzz Server

## Running Locally
1. Rename .env.local.default to .env.local
2. Fill out the `SIGNER_SK` env var with your own value (you can generate valid keypairs [on the laboratory](https://laboratory.stellar.org/#account-creator?network=test))
3. Fill out the `SPONSOR_SK` env var with your own value (ensure you actually create this account onchain with some XLM. Feel free to use the Laboratory Friendbot)
4.
```
npm i --no-optional
npm start
```