import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { BiEnvelope, BiArrowBack, BiShield } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import type { ForgotPasswordRequest } from '../../types/auth';

type ForgotPasswordForm = Pick<ForgotPasswordRequest, 'email'>;

const schema: yup.ObjectSchema<ForgotPasswordForm> = yup.object({
    email: yup
        .string()
        .email('Ingresa un email válido')
        .required('El email es requerido'),
});

const ForgotPasswordPage: React.FC = () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordForm>({
        resolver: yupResolver(schema),
    });

    const onSubmit = async (data: ForgotPasswordForm) => {
        setIsLoading(true);
        setFeedback(null);
        try {
            const payload: ForgotPasswordRequest = {
                ...data,
                return_url: window.location.origin,
                requested_from: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            };
            const message = await authService.forgotPassword(payload);
            toast.success(message);
            setFeedback({ type: 'success', message });
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Error al enviar el enlace de recuperación';
            toast.error(message);
            setFeedback({ type: 'error', message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
                        <BiShield className="w-8 h-8 text-primary-content" />
                    </div>
                    <h1 className="text-3xl font-bold text-base-content">
                        Recuperar Contraseña
                    </h1>
                    <p className="text-base-content/60 mt-2">
                        Te enviaremos un enlace para restablecer tu contraseña
                    </p>
                </div>

                {/* Form */}
                <div className="card bg-base-100 shadow-2xl">
                    <div className="card-body">
                        {feedback && (
                            <div className={`alert mb-4 ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                                <span>{feedback.message}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">
                                        <BiEnvelope className="inline w-4 h-4 mr-1" />
                                        Email
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="tu@email.com"
                                    className={`input input-bordered w-full ${errors.email ? 'input-error' : ''
                                        }`}
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            {errors.email.message}
                                        </span>
                                    </label>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm mr-2"></span>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <BiEnvelope className="w-5 h-5 mr-2" />
                                        Enviar Enlace
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="divider"></div>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="btn btn-ghost btn-sm"
                            >
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

export default ForgotPasswordPage;
