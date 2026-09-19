import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { handler } from '../.output/server/index.mjs'

async function get(path) {
  const response = await handler({
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'example.lambda-url.ap-northeast-1.on.aws' },
    requestContext: {
      http: { method: 'GET', path, sourceIp: '127.0.0.1' },
    },
    isBase64Encoded: false,
  }, {})
  const body = response.isBase64Encoded
    ? Buffer.from(response.body, 'base64').toString('utf8')
    : response.body
  return { ...response, body }
}

const home = await get('/')
assert.equal(home.statusCode, 200)
assert.match(home.body, /Code route: home/)

const hello = await get('/hello/Ada')
assert.equal(hello.statusCode, 200)
assert.match(hello.body, /Server hello, Ada/)

const ping = await get('/api/ping')
assert.equal(ping.statusCode, 200)
assert.deepEqual(JSON.parse(ping.body), { pong: true })
assert.equal((await get('/does-not-exist')).statusCode, 404)

const assetPath = home.body.match(/(?:src|href)="([^" ]+\.js)"/)?.[1]
assert.ok(assetPath, 'SSR HTML must include a client JavaScript asset')
assert.ok(assetPath.startsWith('/assets/'), 'CloudFront routes client assets to S3')
assert.ok((await readFile(new URL('../.output/public' + assetPath, import.meta.url))).length > 100)
assert.equal((await get(assetPath)).statusCode, 404, 'Lambda must not serve S3 assets')
console.log('Lambda handler: SSR, dynamic route, JSON, 404 and S3 asset routing passed')
