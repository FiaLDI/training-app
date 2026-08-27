import { randomInt } from 'crypto'

const CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&*'

/** Default length 12 → ~71 bits of entropy with the alphabet above. */
export function generateAuthCode(length = 12): string {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}
