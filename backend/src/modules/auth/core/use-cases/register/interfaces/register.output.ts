export interface RegisterOutput {
  email: string
  created: boolean
  /** Present only when a new account was created — show once, never stored client-side permanently. */
  loginCode?: string
}
