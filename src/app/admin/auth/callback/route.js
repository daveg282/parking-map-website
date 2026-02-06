import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  
  // Check for auth code in URL
  const hasCode = requestUrl.searchParams.has('code')
  const hasError = requestUrl.searchParams.has('error')
  
  console.log('Auth callback:', { hasCode, hasError })
  
  if (hasError) {
    const error = requestUrl.searchParams.get('error')
    console.error('Auth error in callback:', error)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    )
  }
  
  if (!hasCode) {
    console.log('No auth code in callback URL')
    return NextResponse.redirect(
      new URL('/login', request.url)
    )
  }
  
  // If we have a code, Supabase will handle it automatically
  // Wait a moment for Supabase to process
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Redirect to admin dashboard
  return NextResponse.redirect(new URL('/admin', request.url))
}