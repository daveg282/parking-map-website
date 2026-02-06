import Header from '@/components/Header/Header'
import Footer from '@/components/Footer/Footer'
import LoginForm from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-grow">
        <LoginForm />
      </main>
      
    </div>
  )
}