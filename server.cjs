const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const port = process.env.PORT || 4000
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'photographers.json')
fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]')

const readPhotographers = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'))
const writePhotographers = (photographers) => fs.writeFileSync(dataFile, JSON.stringify(photographers, null, 2))
const publicProfile = ({ ownerToken: _ownerToken, passwordSalt: _passwordSalt, passwordHash: _passwordHash, ...profile }) => profile
const validateProfile = (profile) => ['name', 'studio', 'mobile', 'camera', 'address'].every((field) => typeof profile[field] === 'string' && profile[field].trim())
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') })
const passwordMatches = (password, profile) => profile.passwordHash && crypto.timingSafeEqual(Buffer.from(hashPassword(password, profile.passwordSalt).hash, 'hex'), Buffer.from(profile.passwordHash, 'hex'))
const send = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  response.end(JSON.stringify(body))
}
const readBody = (request) => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk; if (body.length > 8_000_000) reject(new Error('Payload too large')) })
  request.on('end', () => resolve(body ? JSON.parse(body) : {}))
  request.on('error', reject)
})

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    return response.end()
  }
  if (!request.url.startsWith('/api/photographers') && request.url !== '/api/auth/login') return send(response, 404, { error: 'Not found' })
  try {
    const photographers = readPhotographers()
    if (request.method === 'GET' && request.url === '/api/photographers') return send(response, 200, photographers.map(publicProfile))
    if (request.method === 'POST' && request.url === '/api/photographers') {
      const body = await readBody(request)
      if (!validateProfile(body) || typeof body.password !== 'string' || body.password.length < 6) return send(response, 400, { error: 'All details and a password of at least 6 characters are required' })
      const password = hashPassword(body.password)
      const { password: _password, ...profileBody } = body
      const photographer = { ...profileBody, passwordSalt: password.salt, passwordHash: password.hash, id: crypto.randomUUID(), ownerToken: crypto.randomBytes(32).toString('hex'), available: true, createdAt: new Date().toISOString() }
      writePhotographers([photographer, ...photographers])
      return send(response, 201, { ...publicProfile(photographer), ownerToken: photographer.ownerToken })
    }
    if (request.method === 'POST' && request.url === '/api/auth/login') {
      const body = await readBody(request)
      const profile = photographers.find((person) => person.mobile === body.mobile)
      if (!profile || !passwordMatches(body.password || '', profile)) return send(response, 401, { error: 'Mobile number or password is incorrect' })
      return send(response, 200, { ...publicProfile(profile), ownerToken: profile.ownerToken })
    }
    const match = request.url.match(/^\/api\/photographers\/([^/]+)$/)
    if (request.method === 'PATCH' && match) {
      const body = await readBody(request)
      const index = photographers.findIndex((person) => person.id === match[1])
      if (index === -1) return send(response, 404, { error: 'Photographer not found' })
      photographers[index] = { ...photographers[index], available: Boolean(body.available) }
      writePhotographers(photographers)
      return send(response, 200, publicProfile(photographers[index]))
    }
    if (request.method === 'DELETE' && match) {
      if (request.headers['x-owner-token'] !== photographers.find((person) => person.id === match[1])?.ownerToken) return send(response, 403, { error: 'Only the profile owner can delete this profile' })
      const remaining = photographers.filter((person) => person.id !== match[1])
      if (remaining.length === photographers.length) return send(response, 404, { error: 'Photographer not found' })
      writePhotographers(remaining)
      return send(response, 200, { deleted: true })
    }
    return send(response, 405, { error: 'Method not allowed' })
  } catch (error) {
    return send(response, 400, { error: error.message })
  }
})

server.listen(port, () => console.log(`PhotoLink API running at http://localhost:${port}`))
