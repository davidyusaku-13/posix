import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginScreen } from '../../components/LoginScreen'
import { useAuth } from '../../context/AuthContext'

export const LoginPage: React.FC = () => {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  // If already logged in, redirect to register
  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate])

  return <LoginScreen onLoginSuccess={() => navigate('/', { replace: true })} />
}
