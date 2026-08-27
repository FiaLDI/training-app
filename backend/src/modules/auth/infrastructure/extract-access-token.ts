import { Request } from 'express'

export const ACCESS_TOKEN_COOKIE = 'access_token'

/** Reads the JWT from the Authorization header, falling back to the session cookie. */
export function extractAccessToken(request: Request): string | null {
  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) {
    return header.slice(7)
  }

  const cookieHeader = request.headers.cookie
  if (cookieHeader) {
    const prefix = `${ACCESS_TOKEN_COOKIE}=`
    const match = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
    if (match) {
      return decodeURIComponent(match.slice(prefix.length))
    }
  }

  return null
}
