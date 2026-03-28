export function getPostAuthRedirect(search: string) {
  const redirectTo = new URLSearchParams(search).get('redirectTo')

  if (!redirectTo || !redirectTo.startsWith('/')) {
    return '/profile'
  }

  return redirectTo
}
