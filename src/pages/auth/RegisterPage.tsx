import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    BiUser,
    BiEnvelope,
    BiLock,
    BiShow,
    BiHide,
    BiUserPlus,
    BiShield,
    BiCheck,
    BiPhone
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import { geoService } from '../../services/geoService';
import type { AgencyRegisterRequest } from '../../types/auth';
import type { Country, State, City } from '../../types/zone';

type RegisterForm = Omit<AgencyRegisterRequest, 'agency_country_id' | 'agency_state_id' | 'agency_city_id' | 'gender'> & {
    agency_country_id: string;
    agency_state_id: string;
    agency_city_id: string;
    gender?: '' | 'M' | 'F';
    terms: boolean;
};

const schema: yup.ObjectSchema<RegisterForm> = yup.object({
    agency_name: yup
        .string()
        .min(2, 'El nombre de la agencia debe tener al menos 2 caracteres')
        .max(255, 'El nombre de la agencia no puede exceder 255 caracteres')
        .required('El nombre de la agencia es requerido'),
    agency_tax_id: yup
        .string()
        .min(5, 'El NIT debe tener al menos 5 caracteres')
        .max(50, 'El NIT no puede exceder 50 caracteres')
        .required('El NIT de la agencia es requerido'),
    agency_phone: yup
        .string()
        .transform((value) => (value?.trim() === '' ? undefined : value))
        .max(50, 'El teléfono no puede exceder 50 caracteres')
        .optional(),
    agency_email: yup
        .string()
        .transform((value) => (value?.trim() === '' ? undefined : value))
        .email('Ingresa un email válido para la agencia')
        .optional(),
    agency_country_id: yup
        .string()
        .required('El país de la agencia es requerido'),
    agency_state_id: yup
        .string()
        .required('El estado de la agencia es requerido'),
    agency_city_id: yup
        .string()
        .required('La ciudad de la agencia es requerida'),
    name: yup
        .string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres')
        .required('El nombre es requerido'),
    email: yup
        .string()
        .email('Ingresa un email válido')
        .required('El email es requerido'),
    birthdate: yup
        .string()
        .transform((value) => (value?.trim() === '' ? undefined : value))
        .optional(),
    gender: yup
        .string()
        .transform((value) => (value?.trim() === '' ? undefined : value))
        .oneOf(['M', 'F'], 'Selecciona un género válido')
        .optional() as yup.Schema<'' | 'M' | 'F' | undefined>,
    password: yup
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .matches(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'
        )
        .required('La contraseña es requerida'),
    password_confirmation: yup
        .string()
        .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
        .required('La confirmación de contraseña es requerida'),
    terms: yup
        .boolean()
        .oneOf([true], 'Debes aceptar los términos y condiciones')
        .required('Debes aceptar los términos y condiciones'),
});

const RegisterPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGeoLoading, setIsGeoLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        watch,
        reset,
        setValue,
    } = useForm<RegisterForm>({
        resolver: yupResolver(schema),
        defaultValues: {
            agency_name: '',
            agency_tax_id: '',
            agency_phone: '',
            agency_email: '',
            agency_country_id: '',
            agency_state_id: '',
            agency_city_id: '',
            name: '',
            email: '',
            birthdate: '',
            gender: '',
            password: '',
            password_confirmation: '',
            terms: false,
        },
    });

    const watchPassword = watch('password');
    const selectedCountryId = watch('agency_country_id');
    const selectedStateId = watch('agency_state_id');
    const selectedCityId = watch('agency_city_id');

    const passwordChecks = {
        length: watchPassword?.length >= 8,
        lowercase: /[a-z]/.test(watchPassword || ''),
        uppercase: /[A-Z]/.test(watchPassword || ''),
        number: /\d/.test(watchPassword || ''),
    };

    useEffect(() => {
        let active = true;

        const loadCountries = async () => {
            setIsGeoLoading(true);
            try {
                const data = await geoService.getCountries();
                if (!active) return;
                setCountries(data || []);
            } catch {
                if (!active) return;
                toast.error('No se pudieron cargar los países.');
                setCountries([]);
            } finally {
                if (active) {
                    setIsGeoLoading(false);
                }
            }
        };

        loadCountries();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        const countryId = Number(selectedCountryId);
        if (!selectedCountryId || Number.isNaN(countryId) || countryId <= 0) {
            setStates([]);
            setCities([]);
            setValue('agency_state_id', '');
            setValue('agency_city_id', '');
            return () => {
                active = false;
            };
        }

        const loadStates = async () => {
            try {
                const data = await geoService.getStatesByCountry(countryId);
                if (!active) return;

                const nextStates = data || [];
                setStates(nextStates);

                const hasSelectedState = nextStates.some((state) => String(state.id) === String(selectedStateId));
                if (!hasSelectedState) {
                    setValue('agency_state_id', '');
                    setValue('agency_city_id', '');
                    setCities([]);
                }
            } catch {
                if (!active) return;
                toast.error('No se pudieron cargar los estados.');
                setStates([]);
                setCities([]);
                setValue('agency_state_id', '');
                setValue('agency_city_id', '');
            }
        };

        loadStates();

        return () => {
            active = false;
        };
    }, [selectedCountryId, selectedStateId, setValue]);

    useEffect(() => {
        let active = true;

        const stateId = Number(selectedStateId);
        if (!selectedStateId || Number.isNaN(stateId) || stateId <= 0) {
            setCities([]);
            setValue('agency_city_id', '');
            return () => {
                active = false;
            };
        }

        const loadCities = async () => {
            try {
                const data = await geoService.getCitiesByState(stateId);
                if (!active) return;

                const nextCities = data || [];
                setCities(nextCities);

                const hasSelectedCity = nextCities.some((city) => String(city.id) === String(selectedCityId));
                if (!hasSelectedCity) {
                    setValue('agency_city_id', '');
                }
            } catch {
                if (!active) return;
                toast.error('No se pudieron cargar las ciudades.');
                setCities([]);
                setValue('agency_city_id', '');
            }
        };

        loadCities();

        return () => {
            active = false;
        };
    }, [selectedStateId, selectedCityId, setValue]);

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true);
        setFeedback(null);

        try {
            const { terms, ...registerData } = data;
            const payload: AgencyRegisterRequest = {
                ...registerData,
                name: registerData.name.trim(),
                agency_phone: registerData.agency_phone?.trim() || undefined,
                agency_email: registerData.agency_email?.trim() || undefined,
                agency_country_id: Number(registerData.agency_country_id),
                agency_state_id: Number(registerData.agency_state_id),
                agency_city_id: Number(registerData.agency_city_id),
                birthdate: registerData.birthdate?.trim() || undefined,
                gender: registerData.gender || undefined,
            };

            const message = await authService.registerAgency(payload);
            setFeedback({ type: 'success', message });
            toast.success(message);

            reset({
                agency_name: '',
                agency_tax_id: '',
                agency_phone: '',
                agency_email: '',
                agency_country_id: '',
                agency_state_id: '',
                agency_city_id: '',
                name: '',
                email: '',
                birthdate: '',
                gender: '',
                password: '',
                password_confirmation: '',
                terms: false,
            });
            setStates([]);
            setCities([]);
        } catch (error: any) {
            const apiMessage = error?.response?.data?.message || 'No se pudo enviar el registro';
            setFeedback({ type: 'error', message: apiMessage });
            toast.error(apiMessage);

            if (error?.response?.status === 422 && error?.response?.data?.errors) {
                const validationErrors = error.response.data.errors;
                Object.keys(validationErrors).forEach((field) => {
                    const mappedField = field === 'first_name' || field === 'last_name' ? 'name' : field;
                    setError(mappedField as keyof RegisterForm, {
                        message: validationErrors[field][0],
                    });
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const errorTextClass = 'label-text-alt text-error block w-full max-w-full whitespace-normal break-words text-[10px] leading-tight';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 py-12">
            <div className="w-full max-w-6xl px-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
                        <BiShield className="w-8 h-8 text-primary-content" />
                    </div>
                    <h1 className="text-3xl font-bold text-base-content">Registro de Agencia</h1>
                    <p className="text-base-content/60 mt-2">
                        Registra tu agencia y usuario. El acceso quedará pendiente de activación.
                    </p>
                </div>

                <div className="card bg-base-100 shadow-2xl">
                    <div className="card-body">
                        {feedback && (
                            <div className={`alert mb-4 ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                                <span>{feedback.message}</span>
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-6 [&_.label-text-alt.text-error]:block [&_.label-text-alt.text-error]:w-full [&_.label-text-alt.text-error]:max-w-full [&_.label-text-alt.text-error]:whitespace-normal [&_.label-text-alt.text-error]:break-words [&_.label-text-alt.text-error]:text-[10px] [&_.label-text-alt.text-error]:leading-tight"
                        >
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-base-200 p-4 space-y-4">
                                    <div className="text-sm font-semibold text-base-content/80">Datos de la agencia</div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="form-control md:col-span-2">
                                            <label className="label">
                                                <span className="label-text font-semibold">Nombre de la agencia *.</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Mi Agencia S.A.S."
                                                className={`input input-bordered w-full ${errors.agency_name ? 'input-error' : ''}`}
                                                {...register('agency_name')}
                                                autoComplete="organization"
                                            />
                                            {errors.agency_name && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_name.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">NIT de la agencia *.</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="900123456-7"
                                                className={`input input-bordered w-full ${errors.agency_tax_id ? 'input-error' : ''}`}
                                                {...register('agency_tax_id')}
                                            />
                                            {errors.agency_tax_id && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_tax_id.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    <BiPhone className="inline w-4 h-4 mr-1" />
                                                    Teléfono de la agencia
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="+57 300 000 0000"
                                                className={`input input-bordered w-full ${errors.agency_phone ? 'input-error' : ''}`}
                                                {...register('agency_phone')}
                                            />
                                            {errors.agency_phone && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_phone.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control md:col-span-2">
                                            <label className="label">
                                                <span className="label-text font-semibold">Correo de la agencia</span>
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="contacto@agencia.com"
                                                className={`input input-bordered w-full ${errors.agency_email ? 'input-error' : ''}`}
                                                {...register('agency_email')}
                                            />
                                            {errors.agency_email && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_email.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">País *.</span>
                                            </label>
                                            <select
                                                className={`select select-bordered w-full ${errors.agency_country_id ? 'select-error' : ''}`}
                                                {...register('agency_country_id')}
                                                disabled={isGeoLoading}
                                            >
                                                <option value="">Selecciona un país</option>
                                                {countries.map((country) => (
                                                    <option key={country.id} value={country.id}>
                                                        {country.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.agency_country_id && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_country_id.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">Estado *.</span>
                                            </label>
                                            <select
                                                className={`select select-bordered w-full ${errors.agency_state_id ? 'select-error' : ''}`}
                                                {...register('agency_state_id')}
                                                disabled={!selectedCountryId || states.length === 0}
                                            >
                                                <option value="">Selecciona un estado</option>
                                                {states.map((state) => (
                                                    <option key={state.id} value={state.id}>
                                                        {state.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.agency_state_id && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_state_id.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">Ciudad *.</span>
                                            </label>
                                            <select
                                                className={`select select-bordered w-full ${errors.agency_city_id ? 'select-error' : ''}`}
                                                {...register('agency_city_id')}
                                                disabled={!selectedStateId || cities.length === 0}
                                            >
                                                <option value="">Selecciona una ciudad</option>
                                                {cities.map((city) => (
                                                    <option key={city.id} value={city.id}>
                                                        {city.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.agency_city_id && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.agency_city_id.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-base-200 p-4 space-y-4">
                                    <div className="text-sm font-semibold text-base-content/80">Datos del usuario</div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    <BiUser className="inline w-4 h-4 mr-1" />
                                                    Nombre completo *.
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Juan Pérez"
                                                className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                                                {...register('name')}
                                                autoComplete="name"
                                            />
                                            {errors.name && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.name.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control md:col-span-2">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    <BiEnvelope className="inline w-4 h-4 mr-1" />
                                                    Email del usuario *.
                                                </span>
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="tu@email.com"
                                                className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                                                {...register('email')}
                                                autoComplete="email"
                                            />
                                            {errors.email && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.email.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">Fecha de nacimiento</span>
                                            </label>
                                            <input
                                                type="date"
                                                className={`input input-bordered w-full ${errors.birthdate ? 'input-error' : ''}`}
                                                {...register('birthdate')}
                                            />
                                            {errors.birthdate && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.birthdate.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">Género</span>
                                            </label>
                                            <select
                                                className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                                                {...register('gender')}
                                            >
                                                <option value="">Seleccionar</option>
                                                <option value="M">Masculino</option>
                                                <option value="F">Femenino</option>
                                            </select>
                                            {errors.gender && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.gender.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    <BiLock className="inline w-4 h-4 mr-1" />
                                                    Contraseña *.
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    className={`input input-bordered w-full pr-12 ${errors.password ? 'input-error' : ''}`}
                                                    {...register('password')}
                                                    autoComplete="new-password"
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
                                                    <span className={errorTextClass}>{errors.password.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    <BiLock className="inline w-4 h-4 mr-1" />
                                                    Confirmar contraseña *.
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    className={`input input-bordered w-full pr-12 ${errors.password_confirmation ? 'input-error' : ''}`}
                                                    {...register('password_confirmation')}
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <BiHide className="w-5 h-5 text-base-content/40" />
                                                    ) : (
                                                        <BiShow className="w-5 h-5 text-base-content/40" />
                                                    )}
                                                </button>
                                            </div>
                                            {errors.password_confirmation && (
                                                <label className="label">
                                                    <span className={errorTextClass}>{errors.password_confirmation.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {watchPassword && (
                                        <div className="mt-2 space-y-1">
                                            <div className="text-sm font-medium text-base-content/70">Requisitos de contraseña:</div>
                                            <div className="space-y-1">
                                                {[
                                                    { check: passwordChecks.length, text: 'Al menos 8 caracteres' },
                                                    { check: passwordChecks.lowercase, text: 'Una letra minúscula' },
                                                    { check: passwordChecks.uppercase, text: 'Una letra mayúscula' },
                                                    { check: passwordChecks.number, text: 'Un número' },
                                                ].map((req, index) => (
                                                    <div key={index} className="flex items-center text-xs">
                                                        <BiCheck className={`w-4 h-4 mr-1 ${req.check ? 'text-success' : 'text-base-content/30'}`} />
                                                        <span className={req.check ? 'text-success' : 'text-base-content/60'}>
                                                            {req.text}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label cursor-pointer justify-start">
                                        <input
                                            type="checkbox"
                                            className={`checkbox checkbox-primary checkbox-sm ${errors.terms ? 'checkbox-error' : ''}`}
                                            {...register('terms')}
                                        />
                                        <span className="label-text ml-3">
                                            Acepto los{' '}
                                            <Link to="/terms" className="link link-primary">
                                                términos y condiciones
                                            </Link>{' '}
                                            y la{' '}
                                            <Link to="/privacy" className="link link-primary">
                                                política de privacidad
                                            </Link>
                                        </span>
                                    </label>
                                    {errors.terms && (
                                        <label className="label">
                                            <span className={errorTextClass}>{errors.terms.message}</span>
                                        </label>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                            Enviando solicitud...
                                        </>
                                    ) : (
                                        <>
                                            <BiUserPlus className="w-5 h-5 mr-2" />
                                            Enviar Registro
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="divider">o</div>

                        <div className="text-center">
                            <p className="text-base-content/60">
                                ¿Ya tienes cuenta?{' '}
                                <Link to="/login" className="link link-primary font-semibold">
                                    Inicia sesión aquí
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <p className="text-base-content/40 text-sm">
                        © 2024 {import.meta.env.VITE_APP_NAME}. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
