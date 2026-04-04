import * as Yup from 'yup'

/** Подсказка под полем «Логин», когда нет сообщения об ошибке */
export const REGISTER_LOGIN_HELPER_TEXT =
  'Только латиница, цифры, символы _ и - (например, ivan_01)'

export const registerValidationSchema = Yup.object({
  phone: Yup.string()
    .required('Введите номер телефона')
    .matches(/^\+7\d{10}$/, 'Введите номер телефона РФ в формате +79991234567'),
  login: Yup.string()
    .trim()
    .required('Введите логин')
    .matches(
      /^[a-zA-Z0-9_-]+$/,
      'Логин: только латинские буквы, цифры, символы _ и -',
    ),
  email: Yup.string().trim().email('Введите корректный email').required('Введите email'),
  password: Yup.string()
    .required('Введите пароль')
    .min(8, 'Пароль должен содержать минимум 8 символов'),
  consentToPrivacyPolicy: Yup.boolean().oneOf(
    [true],
    'Нужно согласиться с политикой конфиденциальности',
  ),
  consentToPersonalData: Yup.boolean().oneOf(
    [true],
    'Нужно согласиться с обработкой персональных данных',
  ),
  captchaToken: Yup.string().required('Подтвердите, что вы не робот'),
})

export const verifyCodeSchema = Yup.object({
  code: Yup.string()
    .required('Введите код')
    .matches(/^\d{6}$/, 'Код — 6 цифр'),
})
