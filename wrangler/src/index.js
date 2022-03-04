import {
  StatusError,
  ThrowableRouter,
} from 'itty-router-extras'

import apiContract from './api/contract'
import apiIpfs from './api/ipfs'
import apiFlag from './api/flag'

const router = ThrowableRouter()

router.post('/contract/:command', apiContract)
router.get('/ipfs/:accountIssuer/:hash', apiIpfs)
router.post('/flag/:accountIssuer', apiFlag)
router.all('*', () => { throw new StatusError(404, 'Not Found') })

exports.handlers = {
  fetch: (...args) => router
  .handle(...args)
  .then(response => {
    response.headers.append('Access-Control-Allow-Origin', '*') // cors ftw
    return response 
  })
}