import * as yup from 'yup';

// Esquemas de validación reutilizables
export const passwordSchema = yup
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'
  )
  .required('La contraseña es requerida');

export const emailSchema = yup
  .string()
  .email('Ingresa un email válido')
  .required('El email es requerido');

export const nameSchema = yup
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede exceder 50 caracteres')
  .required('El nombre es requerido');

// Validaciones específicas para formularios
export const loginValidationSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('La contraseña es requerida'),
  remember_me: yup.boolean(),
});

export const registerValidationSchema = yup.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  password_confirmation: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('La confirmación de contraseña es requerida'),
  terms: yup
    .boolean()
    .oneOf([true], 'Debes aceptar los términos y condiciones'),
});

export const changePasswordSchema = yup.object({
  current_password: yup.string().required('La contraseña actual es requerida'),
  password: passwordSchema,
  password_confirmation: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('La confirmación de contraseña es requerida'),
});

export const updateProfileSchema = yup.object({
  name: nameSchema,
  email: emailSchema,
});