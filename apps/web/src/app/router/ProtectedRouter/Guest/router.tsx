import { Navigate, Route, Routes } from 'react-router-dom'
import { WebLayout } from '../../../layouts/WebLayout'
import { CartPage } from '../../../../pages/cart/CartPage'
import { CheckoutPage } from '../../../../pages/checkout/CheckoutPage'
import { LoginPage } from '../../../../pages/auth/login/LoginPage'
import { RegisterPage } from '../../../../pages/auth/register/RegisterPage'
import { MenuPage } from '../../../../pages/menu/MenuPage'
import { PersonalDataConsentPage } from '../../../../pages/legal/PersonalDataConsentPage'

export function GuestRouter() {
  return (
    <Routes>
      <Route element={<WebLayout />} path="/">
        <Route element={<Navigate replace to="/menu" />} index />
        <Route element={<MenuPage />} path="menu" />
        <Route element={<PersonalDataConsentPage />} path="legal/personal-data-consent" />
        <Route element={<CartPage />} path="cart" />
        <Route element={<CheckoutPage requireAuth />} path="checkout" />
        <Route element={<LoginPage />} path="login" />
        <Route element={<RegisterPage />} path="register" />
        <Route element={<Navigate replace to="/menu" />} path="profile" />
      </Route>
      <Route element={<Navigate replace to="/menu" />} path="*" />
    </Routes>
  )
}
