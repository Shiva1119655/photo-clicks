import crypto from 'node:crypto'
import { getStore } from '@netlify/blobs'

const store = getStore('photolink-photographers')
const key = 'directory'

async function readProfiles() {
  return (await store.get(key, { type: 'json' })) || []
}

async function writeProfiles(profiles) {
  await store.setJSON(key, profiles)
}

function publicProfile({ ownerToken: _ownerToken, passwordSalt: _passwordSalt, passwordHash: _passwordHash, ...profile }) {
  return profile
}

function validateProfile(profile) {
  const fields = ['name', 'studio', 'mobile', 'camera', 'address']
  return fields.every((field) => typeof profile[field] === 'string' && profile[field].trim())
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') }
}

function passwordMatches(password, profile) {
  if (!profile.passwordHash) return false
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, profile.passwordSalt).hash, 'hex'), Buffer.from(profile.passwordHash, 'hex'))
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-owner-token',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    },
  })
}

export default async (request) => {
  if (request.method === 'OPTIONS') return json(204, {})
  try {
    const profiles = await readProfiles()
    const url = new URL(request.url)
    const id = url.pathname.split('/').filter(Boolean).at(-1)

    if (request.method === 'GET') return json(200, profiles.map(publicProfile))

    if (request.method === 'POST') {
      const body = await request.json()
      if (url.pathname.endsWith('/auth/login')) {
        const profile = profiles.find((item) => item.mobile === body.mobile)
        if (!profile || !passwordMatches(body.password || '', profile)) return json(401, { error: 'Mobile number or password is incorrect' })
        return json(200, { ...publicProfile(profile), ownerToken: profile.ownerToken })
      }
      if (!validateProfile(body) || typeof body.password !== 'string' || body.password.length < 6) return json(400, { error: 'All details and a password of at least 6 characters are required' })
      const password = hashPassword(body.password)
      const { password: _password, ...profileBody } = body
      const profile = {
        ...profileBody,
        passwordSalt: password.salt,
        passwordHash: password.hash,
        id: crypto.randomUUID(),
        ownerToken: crypto.randomBytes(32).toString('hex'),
        available: true,
        createdAt: new Date().toISOString(),
      }
      await writeProfiles([profile, ...profiles])
      return json(201, { ...publicProfile(profile), ownerToken: profile.ownerToken })
    }

    const index = profiles.findIndex((profile) => profile.id === id)
    if (index < 0) return json(404, { error: 'Photographer not found' })

    if (request.method === 'PATCH') {
      const body = await request.json()
      profiles[index] = { ...profiles[index], available: Boolean(body.available) }
      await writeProfiles(profiles)
      return json(200, publicProfile(profiles[index]))
    }

    if (request.method === 'DELETE') {
      if (request.headers.get('x-owner-token') !== profiles[index].ownerToken) return json(403, { error: 'Only the profile owner can delete this profile' })
      await writeProfiles(profiles.filter((profile) => profile.id !== id))
      return json(200, { deleted: true })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (error) {
    return json(500, { error: error.message })
  }
}
