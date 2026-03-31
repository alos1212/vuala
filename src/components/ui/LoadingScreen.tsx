import React from 'react';
import { BiShield } from 'react-icons/bi';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Cargando...'
}) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4 animate-pulse">
                    <BiShield className="w-8 h-8 text-primary-content" />
                </div>
                <div className="space-y-2">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-base-content/60">{message}</p>
                </div>
            </div>
        </div>
    );
};