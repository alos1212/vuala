import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { BiArrowBack, BiLock, BiShield, BiShow, BiHide } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import type { ResetPasswordRequest } from '../../types/auth';

type ResetPasswordForm = Pick<ResetPasswordRequest, 'password' | 'password_confirmation'>;

const schema: yup.ObjectSchema<ResetPasswordForm> = yup.object({
    password: yup
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .required('La contraseña es requerida'),
    password_confirmation: yup
        .string()
        .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
        .required('La confirmación es requerida'),
});

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);
    const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);
    const hasValidParams = !!token && !!email;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        resolver: yupResolver(schema),
        defaultValues: {
            password: '',
            password_confirmation: '',
        },
    });

    const onSubmit = async (formData: ResetPasswordForm) => {
        if (!hasValidParams) {
            const message = 'El enlace de recuperación no es válido o está incompleto.';
            toast.error(message);
            setFeedback({ type: 'error', message });
            return;
        }

        setIsLoading(true);
        setFeedback(null);
        try {
            const message = await authService.resetPassword({
                email,
                token,
                password: formData.password,
                password_confirmation: formData.password_confirmation,
            });
            toast.success(message);
            setFeedback({ type: 'success', message });
        } catch (error: any) {
            const message = error?.response?.data?.message || 'No se pudo restablecer la contraseña.';
            toast.error(message);
            setFeedback({ type: 'error', message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
                        <BiShield className="w-8 h-8 text-primary-content" />
                    </div>
                    <h1 className="text-3xl font-bold text-base-content">Restablecer Contraseña</h1>
                    <p className="text-base-content/60 mt-2">Ingresa una nueva contraseña para tu cuenta</p>
                </div>

                <div className="card bg-base-100 shadow-2xl">
                    <div className="card-body">
                        {!hasValidParams ? (
                            <div className="text-center space-y-4">
                                <p className="text-error">El enlace de recuperación no es válido o ya expiró.</p>
                                <Link to="/forgot-password" className="btn btn-primary btn-sm">
                                    Solicitar un nuevo enlace
                                </Link>
                            </div>
                        ) : feedback?.type === 'success' ? (
                            <div className="space-y-4">
                                <div className="alert alert-success">
                                    <span>{feedback.message}</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary w-full"
                                    onClick={() => navigate('/login')}
                                >
                                    Iniciar sesión
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                {feedback?.type === 'error' && (
                                    <div className="alert alert-error">
                                        <span>{feedback.message}</span>
                                    </div>
                                )}

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Correo</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="input input-bordered w-full bg-base-200"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            <BiLock className="inline w-4 h-4 mr-1" />
                                            Nueva contraseña
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={`input input-bordered w-full pr-12 ${errors.password ? 'input-error' : ''}`}
                                            {...register('password')}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 flex items-center"
                                            onClick={() => setShowPassword((v) => !v)}
                                        >
                                            {showPassword ? <BiHide className="w-5 h-5 text-base-content/40" /> : <BiShow className="w-5 h-5 text-base-content/40" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.password.message}</span>
                                        </label>
                                    )}
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Confirmar contraseña</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswordConfirm ? 'text' : 'password'}
                                            className={`input input-bordered w-full pr-12 ${errors.password_confirmation ? 'input-error' : ''}`}
                                            {...register('password_confirmation')}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 px-3 flex items-center"
                                            onClick={() => setShowPasswordConfirm((v) => !v)}
                                        >
                                            {showPasswordConfirm ? <BiHide className="w-5 h-5 text-base-content/40" /> : <BiShow className="w-5 h-5 text-base-content/40" />}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.password_confirmation.message}</span>
                                        </label>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                            Actualizando...
                                        </>
                                    ) : (
                                        'Actualizar contraseña'
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="divider"></div>

                        <div className="text-center">
                            <Link to="/login" className="btn btn-ghost btn-sm">
                                <BiArrowBack className="w-4 h-4 mr-2" />
                                Volver al Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
