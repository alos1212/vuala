import React from 'react';
import { BiMailSend, BiX } from 'react-icons/bi';
//import { useAuth } from '../../hooks/useAuth';
//import { isEmailVerified } from '../../utils/authHelpers';
import { useState } from 'react';

const EmailVerificationBanner: React.FC = () => {
    //const { user } = useAuth();
    //const [isDismissed, setIsDismissed] = useState(false);
    const [isResending, setIsResending] = useState(false);

    /*if (!user || isEmailVerified(user) || isDismissed) {
        return null;
    }*/

    const handleResendVerification = async () => {
        setIsResending(true);
        try {
            // Aquí iría la llamada a la API para reenviar verificación
            // await authService.resendVerification();
            console.log('Reenviando verificación...');
        } catch (error) {
            console.error('Error al reenviar verificación:', error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="alert alert-warning shadow-lg">
            <BiMailSend className="w-6 h-6" />
            <div className="flex-1">
                <h3 className="font-bold">Verifica tu email</h3>
                <div className="text-sm">
                    Hemos enviado un enlace de verificación a 
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleResendVerification}
                    disabled={isResending}
                >
                    {isResending ? (
                        <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                        'Reenviar'
                    )}
                </button>
                <button
                    className="btn btn-sm btn-ghost"
                >
                    <BiX className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default EmailVerificationBanner;