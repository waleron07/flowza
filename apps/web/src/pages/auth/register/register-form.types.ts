export type RegisterFormValues = {
  phone: string
  login: string
  email: string
  password: string
  consentToPrivacyPolicy: boolean
  consentToPersonalData: boolean
  captchaToken: string
}

export const registerFormInitialValues: RegisterFormValues = {
  phone: '',
  login: '',
  email: '',
  password: '',
  consentToPrivacyPolicy: false,
  consentToPersonalData: false,
  captchaToken: '',
}

export type RegisterStep = 'form' | 'verify' | 'success'
