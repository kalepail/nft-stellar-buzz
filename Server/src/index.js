import {
  StatusError,
  ThrowableRouter,
} from 'itty-router-extras'

import apiContract from './api/contract'
import apiFlag from './api/flag'
import apiImage from './api/image'

const router = ThrowableRouter()

router.post('/contract/:command', apiContract)
router.post('/flag/:accountIssuer', apiFlag)
router.get('/image/:issuer/:code', apiImage)
router.all('*', () => { throw new StatusError(404, 'Not Found') })

export default { 
  fetch: (...args) => router
  .handle(...args)
  .then(response => {
    response.headers.append('Access-Control-Allow-Origin', '*') // cors ftw
    return response 
  }) 
}