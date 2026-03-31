import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    BiUser,
    BiLock,
    BiShow,
    BiHide,
    BiLogIn
} from 'react-icons/bi';
import { useAuth } from '../../hooks/useAuth';
import type { LoginRequest } from '../../types/auth';
import { LayoutAuth } from '../../components/layout/LayoutAuth';

const schema: yup.ObjectSchema<LoginRequest> = yup.object({
    email: yup
        .string()
        .required('Ingresa tu email o usuario'),
    password: yup
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres')
        .required('La contraseña es requerida'),
    remember_me: yup.boolean().optional(),
});

const LoginPage: React.FC = () => {
    const { login, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<LoginRequest>({
        resolver: yupResolver(schema),
        defaultValues: {
            email: '',
            password: '',
            remember_me: false,
        },
    });

    const onSubmit = async (data: LoginRequest) => {
        try {
            await login(data);
        } catch (error: any) {
            if (error?.response?.status === 422 && error?.response?.data?.errors) {
                const validationErrors = error.response.data.errors;
                Object.keys(validationErrors).forEach((field) => {
                    setError(field as keyof LoginRequest, {
                        message: validationErrors[field][0],
                    });
                });
            }
        }
    };

    return (
        <LayoutAuth>
            <div >
                <div className="text-center mb-8">
                    <p className="text-base-content/60 mt-2">
                        Inicia sesión en tu cuenta
                    </p>
                </div>
                {/* Login Form */}
                <div >
                    <div >
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email Field */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        <BiUser className="inline w-4 h-4 mr-1" />
                                        Usuario o correo
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="tu@email.com o usuario"
                                    className={`input w-full ${errors.email ? 'input-error' : ''
                                        }`}
                                    {...register('email')}
                                    autoComplete="username"
                                />
                                {errors.email && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            {errors.email.message}
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        <BiLock className="inline w-4 h-4 mr-1" />
                                        Contraseña
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className={`input input-bordered w-full pr-12 ${errors.password ? 'input-error' : ''
                                            }`}
                                        {...register('password')}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 px-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <BiHide className="w-5 h-5 text-base-content/40" />
                                        ) : (
                                            <BiShow className="w-5 h-5 text-base-content/40" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            {errors.password.message}
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <label className="label cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary checkbox-sm"
                                        {...register('remember_me')}
                                    />
                                    <span className="label-text ml-2">Recordarme</span>
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="link link-primary text-sm"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Iniciando sesión...
                                    </>
                                ) : (
                                    <>
                                        <BiLogIn className="w-5 h-5 mr-2" />
                                        Iniciar Sesión
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="divider">o</div>

                        {/* Register Link */}
                        <div className="text-center">
                            <p className="text-base-content/60">
                                ¿No tienes cuenta?{' '}
                                <Link to="/register" className="link link-primary font-semibold">
                                    Regístrate aquí
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-base-content/40 text-sm">
                        © 2025 {import.meta.env.VITE_APP_NAME}. Todos los derechos reservados.
                    </p>
                </div>
            </div>

        </LayoutAuth>
    );
};

export default LoginPage;
