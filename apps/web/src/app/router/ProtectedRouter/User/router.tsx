import { Navigate, Route, Routes } from 'react-router-dom'
import { WebLayout } from '../../../layouts/WebLayout'
import { CartPage } from '../../../../pages/cart/CartPage'
import { CheckoutPage } from '../../../../pages/checkout/CheckoutPage'
import { MenuPage } from '../../../../pages/menu/MenuPage'
import { ProfilePage } from '../../../../pages/profile/ProfilePage'

export function UserRouter() {
  return (
    <Routes>
      <Route element={<WebLayout />} path="/">
        <Route element={<Navigate replace to="/menu" />} index />
        <Route element={<MenuPage />} path="menu" />
        <Route element={<CartPage />} path="cart" />
        <Route element={<CheckoutPage />} path="checkout" />
        <Route element={<ProfilePage />} path="profile" />
        <Route element={<Navigate replace to="/profile" />} path="login" />
        <Route element={<Navigate replace to="/profile" />} path="register" />
      </Route>
      <Route element={<Navigate replace to="/menu" />} path="*" />
    </Routes>
  )
}
