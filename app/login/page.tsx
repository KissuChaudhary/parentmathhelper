import { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <LoginClient />
    </div>
  )
}