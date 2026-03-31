// src/components/auth/LoginForm.tsx
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../stores/authStore";
import { useState } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi"; // 👈 import de react-icons

export const LoginForm = () => {
    const { register, handleSubmit } = useForm();
    const { login } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data: any) => {
        try {
            await login(data.email, data.password);
        } catch (error) {
            console.error("Failed to login:", error);
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-sm bg-base-100 shadow-xl rounded-lg p-6 space-y-4"
        >
            <h2 className="text-2xl font-bold text-center">Iniciar Sesión</h2>

            {/* Email */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Correo electrónico</span>
                </label>
                <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="input input-bordered w-full"
                    {...register("email")}
                />
            </div>

            {/* Password con toggle */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text">Contraseña</span>
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        className="input input-bordered w-full pr-10"
                        {...register("password")}
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <HiEyeOff size={20} />
                        ) : (
                            <HiEye size={20} />
                        )}
                    </button>
                </div>
            </div>

            {/* Botón Login */}
            <button type="submit" className="btn btn-primary w-full">
                Iniciar sesión
            </button>
        </form>
    );
};
