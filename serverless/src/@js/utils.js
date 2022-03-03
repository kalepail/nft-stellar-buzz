export async function handleResponse(response) {
  if (response.ok)
    return response.headers.get('content-type')?.indexOf('json') > -1 ? response.json() : response.text()

  throw response.headers.get('content-type')?.indexOf('json') > -1 ? await response.json() : await response.text()
}

export async function parseError(err) {
  if (typeof err === 'string')
    err = {message: err, status: 400}

  else if (err.headers?.has('content-type')) 
    err.message = err.headers.get('content-type').indexOf('json') > -1
    ? await err.json()
    : await err.text()

  if (!err.status)
    err.status = 400

  return {
    statusCode: err.status,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...(
        typeof err.message === 'string'
        ? {message: err.message}
        : err.message
      ),
      status: err.status,
    })
  }
}