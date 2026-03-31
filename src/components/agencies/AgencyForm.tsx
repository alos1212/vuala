import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Agency } from '../../types/agency';
import type { Country, State, City } from '../../types/zone';
import { geoService } from '../../services/geoService';
import { userService } from '../../services/userService';
import type { User } from '../../types/auth';
import { resolveStorageUrl } from '../../utils/authHelpers';

const parseId = (value: unknown): number => {
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const match = String(value ?? '').match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
};

const isValidId = (value: unknown) => {
  const num = parseId(value);
  return Number.isFinite(num) && num > 0;
};

const schema = yup.object({
  name: yup.string().required('La razón social es obligatoria'),
  tax_id: yup.string().required('El NIT es obligatorio'),
  tax_regime: yup.string().required('El régimen es obligatorio'),
  address: yup.string().required('La dirección es obligatoria'),
  phone: yup.string().required('El teléfono es obligatorio'),
  email: yup.string().email('Correo inválido').required('El correo es obligatorio'),
  country_id: yup.string().required('El país es obligatorio'),
  state_id: yup.string().required('El estado es obligatorio'),
  city_id: yup.string().required('La ciudad es obligatoria'),
  color_primary: yup.string().nullable().required(),
  color_secondary: yup.string().nullable().required(),
});

export type AgencyFormValues = yup.InferType<typeof schema> & {
  logo?: File | null;
  logo_path?: string | null;
  manager_user_id?: number | null;
};

interface AgencyFormProps {
  initialValues?: Partial<Agency>;
  onSubmit: (data: AgencyFormValues) => void;
  isSubmitting?: boolean;
  title?: string;
}

const taxRegimeOptions = [
  { label: 'Régimen Común', value: 'Régimen Común' },
  { label: 'Régimen Simple', value: 'Régimen Simple' },
  { label: 'Régimen Especial', value: 'Régimen Especial' },
];

const dedupeCountries = (items: Country[]) => {
  const map = new Map<number, Country>();
  items.forEach((c) => {
    if (!map.has(c.id)) map.set(c.id, c);
  });
  return Array.from(map.values());
};

const extractCountries = (items: any[]): Country[] => {
  const collected: Country[] = [];
  items.forEach((item) => {
    if (item?.countries && Array.isArray(item.countries)) {
      item.countries.forEach((c: any) => {
        if (isValidId(c?.id) && c?.name) {
          collected.push({ id: parseId(c.id), name: c.name });
        }
      });
    }
    if (item?.type === 'country' && isValidId(item?.id) && item?.name) {
      collected.push({ id: parseId(item.id), name: item.name });
    }
  });
  return dedupeCountries(collected);
};

const AgencyForm: React.FC<AgencyFormProps> = ({
  initialValues,
  onSubmit,
  isSubmitting,
  title,
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const initializingRef = useRef(false);
  const initialStateIdRef = useRef<string | null>(null);
  const initialCityIdRef = useRef<string | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AgencyFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<AgencyFormValues>,
    defaultValues: {
      name: '',
      tax_id: '',
      tax_regime: '',
      address: '',
      phone: '',
      email: '',
      country_id: '',
      state_id: '',
      city_id: '',
      color_primary: '#7c3aed',
      color_secondary: '#2e1065',
      manager_user_id: undefined,
      logo: null,
      logo_path: null,
    },
  });

  const countryId = watch('country_id');
  const stateId = watch('state_id');
  const taxRegimeValue = watch('tax_regime');
  const hasCountry = !!countryId;
  const hasState = !!stateId;

  const fetchStates = useCallback(
    async (country: number, opts?: { preserveStateId?: number; preserveCityId?: number }) => {
      setStates([]);
      if (!opts?.preserveStateId) setValue('state_id', '');
      setCities([]);
      if (!opts?.preserveCityId) setValue('city_id', '');
      const data = await geoService.getStatesByCountry(country);
      const filtered = data
        .filter((item) => isValidId(item.id))
        .map((item) => ({ ...item, id: Number(item.id) }));
      setStates(filtered);
      if (opts?.preserveStateId) {
        const idToUse = opts.preserveStateId;
        const found = filtered.find((s) => s.id === idToUse);
        if (found) {
          setValue('state_id', String(idToUse));
        }
      }
    },
    [setValue]
  );

  const fetchCities = useCallback(
    async (state: number, opts?: { preserveCityId?: number }) => {
      setCities([]);
      if (!opts?.preserveCityId) setValue('city_id', '');
      const data = await geoService.getCitiesByState(state);
      const filtered = data
        .filter((item) => isValidId(item.id))
        .map((item) => ({ ...item, id: Number(item.id) }));
      setCities(filtered);
      if (opts?.preserveCityId) {
        const idToUse = opts.preserveCityId;
        const found = filtered.find((c) => c.id === idToUse);
        if (found) {
          setValue('city_id', String(idToUse));
        }
      }
    },
    [setValue]
  );

  const currentCountryId = isValidId(countryId) ? parseId(countryId) : undefined;
  const countryRegister = register('country_id');
  const stateRegister = register('state_id');
  const cityRegister = register('city_id');

  useEffect(() => {
    const loadCountries = async () => {
      try {
        // Preferir endpoint directo de países
        const direct = await geoService.getCountries();
        const mapped = direct
          .filter((c: any) => isValidId(c?.id) && c?.name)
          .map((c: any) => ({ id: parseId(c.id), name: c.name })) as Country[];
        if (mapped.length) {
          setCountries(mapped);
          setCountriesLoaded(true);
          return;
        }

        // Fallback: continentes con países
        const items = await geoService.getContinentsWithCountries();
        const raw = Array.isArray((items as any)?.data) ? (items as any).data : items;
        let countriesMapped = extractCountries(Array.isArray(raw) ? raw : []);

        if (!countriesMapped.length) {
          const continents = await geoService.getContinents();
          const contData = Array.isArray((continents as any)?.data) ? (continents as any).data : continents;
          countriesMapped = extractCountries(Array.isArray(contData) ? contData : []);
        }

        setCountries(countriesMapped);
        setCountriesLoaded(true);
      } catch (err) {
        console.error('No se pudieron cargar los países', err);
        setCountries([]);
        setCountriesLoaded(true);
      }
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const loadManagers = async () => {
      try {
        const users = await userService.getAgencyManagers();
        if (users.length) {
          setManagers(users);
          return;
        }
        // Fallback: filtrar usuarios locales por permiso cuando no haya respuesta
        const res = await userService.getUsers({ per_page: 200 });
        const list = res.data || [];
        const filtered = list.filter((u) =>
          Array.isArray(u.role)
            ? u.role.some((r) => r.permissions?.some((p) => p.name === 'agencies.manager'))
            : (u.role as any)?.permissions?.some((p: any) => p.name === 'agencies.manager')
        );
        setManagers(filtered);
      } catch (err) {
        // Si falla el endpoint de managers, intentar con listado general
        try {
          const res = await userService.getUsers({ per_page: 200 });
          const list = res.data || [];
          const filtered = list.filter((u) =>
            Array.isArray(u.role)
              ? u.role.some((r) => r.permissions?.some((p) => p.name === 'agencies.manager'))
              : (u.role as any)?.permissions?.some((p: any) => p.name === 'agencies.manager')
          );
          setManagers(filtered);
        } catch (err2) {
          console.error('No se pudieron cargar usuarios', err, err2);
        }
      }
    };
    loadManagers();
  }, []);

  useEffect(() => {
    if (initialStateIdRef.current && states.length > 0) {
      const target = states.find((s) => String(s.id) === initialStateIdRef.current);
      if (target) {
        setValue('state_id', initialStateIdRef.current);
      }
    }
  }, [states, setValue]);

  useEffect(() => {
    if (initialCityIdRef.current && cities.length > 0) {
      const target = cities.find((c) => String(c.id) === initialCityIdRef.current);
      if (target) {
        setValue('city_id', initialCityIdRef.current);
      }
    }
  }, [cities, setValue]);

  useEffect(() => {
    if (!initialValues || !countriesLoaded) return;
    let active = true;
    const loadInitial = async () => {
      initializingRef.current = true;
      const countryNum = parseId(initialValues.country_id);
      const stateNum = parseId(initialValues.state_id);
      const cityNum = parseId(initialValues.city_id);

      reset({
        name: initialValues.name ?? '',
        tax_id: initialValues.tax_id ?? '',
        tax_regime: initialValues.tax_regime ?? '',
        address: initialValues.address ?? '',
        phone: initialValues.phone ?? '',
        email: initialValues.email ?? '',
        color_primary: initialValues.color_primary ?? '#7c3aed',
        color_secondary: initialValues.color_secondary ?? '#2e1065',
        country_id: isValidId(countryNum) ? String(countryNum) : '',
        state_id: isValidId(stateNum) ? String(stateNum) : '',
        city_id: isValidId(cityNum) ? String(cityNum) : '',
        manager_user_id: initialValues.manager_user_id ?? undefined,
        logo: null,
        logo_path: initialValues.logo_path ?? null,
      });
      if (initialValues.logo_path) {
        setLogoPreview(resolveStorageUrl(initialValues.logo_path as string) ?? (initialValues.logo_path as string));
      }

      if (isValidId(countryNum)) {
        setValue('country_id', String(countryNum));
        initialStateIdRef.current = isValidId(stateNum) ? String(parseId(stateNum)) : null;
        initialCityIdRef.current = isValidId(cityNum) ? String(parseId(cityNum)) : null;
        await fetchStates(countryNum, {
          preserveStateId: isValidId(stateNum) ? parseId(stateNum) : undefined,
          preserveCityId: isValidId(cityNum) ? parseId(cityNum) : undefined,
        });
        if (!active) return;
        if (isValidId(stateNum)) {
          const parsedState = parseId(stateNum);
          setValue('state_id', String(parsedState));
          await fetchCities(parsedState, { preserveCityId: isValidId(cityNum) ? parseId(cityNum) : undefined });
          if (!active) return;
          if (isValidId(cityNum)) {
            setValue('city_id', String(parseId(cityNum)));
          } else if (initialCityIdRef.current) {
            setValue('city_id', initialCityIdRef.current);
          }
        } else {
          setValue('city_id', '');
        }
      } else {
        setValue('country_id', '');
        setValue('state_id', '');
        setValue('city_id', '');
      }
      initializingRef.current = false;
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, [initialValues, reset, setValue, countriesLoaded, fetchStates, fetchCities]);

  const submitHandler = (values: AgencyFormValues) => {
    onSubmit(values);
  };

  const availableTaxRegimeOptions = useMemo(() => {
    const currentRegime = String(taxRegimeValue ?? '').trim();
    if (!currentRegime) return taxRegimeOptions;
    const alreadyExists = taxRegimeOptions.some(
      (option) => option.value.toLowerCase() === currentRegime.toLowerCase()
    );
    if (alreadyExists) return taxRegimeOptions;
    return [{ label: `${currentRegime} (actual)`, value: currentRegime }, ...taxRegimeOptions];
  }, [taxRegimeValue]);

  const handleLogoFile = (file: File | null) => {
    setValue('logo', file);
    setValue('logo_path', file ? null : watch('logo_path') ?? null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body space-y-4">
        <h2 className="card-title">{title}</h2>
        <form onSubmit={handleSubmit(submitHandler)} className="space-y-6">
          <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="badge badge-primary badge-sm"></div>
              <h3 className="text-lg font-semibold">Datos Generales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-semibold">Razón Social *</span>
              </label>
                <input className="input input-bordered w-full" {...register('name')} />
              {errors.name && <span className="label-text-alt text-error">{errors.name.message}</span>}
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-semibold">NIT *</span>
              </label>
                <input className="input input-bordered w-full" {...register('tax_id')} />
              {errors.tax_id && <span className="label-text-alt text-error">{errors.tax_id.message}</span>}
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-semibold">Régimen *</span>
              </label>
                <select className="select select-bordered w-full" {...register('tax_regime')}>
                  <option value="">Selecciona un régimen</option>
                  {availableTaxRegimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              {errors.tax_regime && <span className="label-text-alt text-error">{errors.tax_regime.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">Dirección *</span>
                </label>
                <input className="input input-bordered w-full" {...register('address')} />
              {errors.address && <span className="label-text-alt text-error">{errors.address.message}</span>}
            </div>
            <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">Teléfono *</span>
                </label>
                <input className="input input-bordered w-full" {...register('phone')} />
              {errors.phone && <span className="label-text-alt text-error">{errors.phone.message}</span>}
            </div>
            <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">Correo *</span>
                </label>
                <input className="input input-bordered w-full" {...register('email')} />
              {errors.email && <span className="label-text-alt text-error">{errors.email.message}</span>}
            </div>
          </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="badge badge-secondary badge-sm"></div>
              <h3 className="text-lg font-semibold">Ubicación</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">
                    País *{currentCountryId ? ` (ID: ${currentCountryId})` : ''}
                  </span>
                </label>
            <select
                className="select select-bordered w-full"
                {...countryRegister}
              onChange={async (e) => {
                countryRegister.onChange(e);
                const val = e.target.value ? parseId(e.target.value) : undefined;
                setValue('country_id', e.target.value);
                if (val && isValidId(val)) {
                  await fetchStates(val);
                } else {
                  setStates([]);
                  setValue('state_id', '');
                  setCities([]);
                  setValue('city_id', '');
                }
              }}
            >
              <option value="">Selecciona un país</option>
              {countries.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
              </select>
              {errors.country_id && <span className="label-text-alt text-error">{errors.country_id.message}</span>}
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-semibold">Estado *</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...stateRegister}
                disabled={!hasCountry}
                onChange={async (e) => {
                  stateRegister.onChange(e);
                  const val = e.target.value ? parseId(e.target.value) : undefined;
                  setValue('state_id', e.target.value);
                  if (val && isValidId(val)) {
                    await fetchCities(val);
                  } else {
                    setCities([]);
                    setValue('city_id', '');
                  }
                }}
              >
                <option value="">Selecciona un estado</option>
                {states.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.state_id && <span className="label-text-alt text-error">{errors.state_id.message}</span>}
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-sm font-semibold">Ciudad *</span>
              </label>
              <select
                className="select select-bordered w-full"
                {...cityRegister}
                disabled={!hasState}
                onChange={(e) => {
                  cityRegister.onChange(e);
                  setValue('city_id', e.target.value);
                }}
              >
                <option value="">Selecciona una ciudad</option>
                {cities.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.city_id && <span className="label-text-alt text-error">{errors.city_id.message}</span>}
            </div>
          </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="badge badge-accent badge-sm"></div>
              <h3 className="text-lg font-semibold">Administración</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">Encargado</span>
                </label>
                <select className="select select-bordered w-full" {...register('manager_user_id')}>
                  <option value="">Selecciona un encargado</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="badge badge-info badge-sm"></div>
              <h3 className="text-lg font-semibold">Identidad visual</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control col-span-1">
                <label className="label pb-1">
                  <span className="label-text text-sm font-semibold">Logo</span>
                </label>
                <input type="hidden" {...register('logo_path')} />
                <div
                  className="border-2 border-dashed border-base-300 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-base-100"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0] ?? null;
                    if (file) handleLogoFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-contain rounded-lg border border-base-200" />
                  ) : (
                    <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-base-200 text-base-content/60 text-sm">
                      Preview
                    </div>
                  )}
                  <p className="text-sm text-base-content/70">Arrastra y suelta o haz clic para subir</p>
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      handleLogoFile(file);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgencyForm;
