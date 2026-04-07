import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { BiImage, BiPalette, BiUpload } from 'react-icons/bi';
import { companyService } from '../../services/companyService';
import { geoService } from '../../services/geoService';
import type { Company, CompanyUpsertPayload } from '../../types/company';
import { getCompanyLogo } from '../../utils/authHelpers';
import SearchableSelect from '../../components/ui/SearchableSelect';

const CompanyFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState('');

  const { data: company } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getCompany(Number(id)),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, reset, setValue, watch } = useForm<Partial<Company>>({
    values: company ?? {
      name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      country_id: undefined,
      state_id: undefined,
      city_id: undefined,
      color_primary: '#7c3aed',
      color_secondary: '#2e1065',
      status: 1,
    },
  });

  React.useEffect(() => {
    if (company) reset(company);
  }, [company, reset]);

  React.useEffect(() => {
    return () => {
      if (logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const currentLogo = logoPreview || getCompanyLogo(company);
  const primaryColor = watch('color_primary') || company?.color_primary || '#7c3aed';
  const secondaryColor = watch('color_secondary') || company?.color_secondary || '#2e1065';
  const selectedCountryId = Number(watch('country_id')) || undefined;
  const selectedStateId = Number(watch('state_id')) || undefined;
  const selectedCityId = Number(watch('city_id')) || undefined;

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });

  const { data: states = [], isFetched: isStatesFetched } = useQuery({
    queryKey: ['geo-states', selectedCountryId],
    queryFn: () => geoService.getStatesByCountry(selectedCountryId as number),
    enabled: Boolean(selectedCountryId),
  });

  const { data: cities = [], isFetched: isCitiesFetched } = useQuery({
    queryKey: ['geo-cities', selectedStateId],
    queryFn: () => geoService.getCitiesByState(selectedStateId as number),
    enabled: Boolean(selectedStateId),
  });

  React.useEffect(() => {
    if (!selectedCountryId) {
      setValue('state_id', undefined);
      setValue('city_id', undefined);
      return;
    }
    if (isStatesFetched && selectedStateId && !states.some((state) => state.id === selectedStateId)) {
      setValue('state_id', undefined);
      setValue('city_id', undefined);
    }
  }, [isStatesFetched, selectedCountryId, selectedStateId, setValue, states]);

  React.useEffect(() => {
    if (!selectedStateId) {
      setValue('city_id', undefined);
      return;
    }
    if (isCitiesFetched && selectedCityId && !cities.some((city) => city.id === selectedCityId)) {
      setValue('city_id', undefined);
    }
  }, [cities, isCitiesFetched, selectedCityId, selectedStateId, setValue]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: Partial<Company>) => {
    const normalizeGeoId = (value: unknown): number | undefined => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    const normalizedIsActive =
      typeof values.is_active === 'boolean'
        ? values.is_active
        : String(values.status ?? '').toLowerCase() === '1' || String(values.status ?? '').toLowerCase() === 'active';

    const payload: CompanyUpsertPayload = {
      ...values,
      is_active: normalizedIsActive,
      country_id: normalizeGeoId(values.country_id),
      state_id: normalizeGeoId(values.state_id),
      city_id: normalizeGeoId(values.city_id),
      logo: logoFile,
    };

    delete payload.status;
    if (logoFile) {
      delete payload.logo_path;
    }

    if (isEdit && id) {
      await companyService.updateCompany(Number(id), payload);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      navigate(`/companies/${id}`);
      return;
    }

    const created = await companyService.createCompany(payload);
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    navigate(`/companies/${created.id}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="rounded-[32px] border border-base-200 bg-gradient-to-r from-base-100 via-base-100 to-base-200/70 p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="badge badge-outline mb-3">{isEdit ? 'Edición' : 'Creación'}</div>
            <h1 className="text-3xl font-bold">{isEdit ? 'Editar compañía' : 'Crear compañía'}</h1>
            <p className="text-base-content/60">Configura la información general y la identidad visual de la compañía.</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.location.assign(isEdit && id ? `/companies/${id}` : '/companies')}
          >
            Volver
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-[32px] border border-base-200 bg-base-100 p-6 shadow space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-base-200 bg-base-50 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Logo e identidad</h2>
              <p className="text-sm text-base-content/60">Previsualiza cómo se verá la compañía dentro del sistema.</p>
            </div>

            <div className="rounded-3xl border border-base-200 bg-base-100 p-5">
              <div className="flex justify-center">
                <div className="w-44 h-44 rounded-3xl border border-base-300 bg-base-50 p-4">
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt={`Logo de ${company?.name || 'la compañía'}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-base-content/50">
                      <BiImage className="w-10 h-10" />
                      <span className="text-sm">Sin logo</span>
                    </div>
                  )}
                </div>
              </div>

              <label className="form-control mt-4">
                <span className="label-text mb-2 flex items-center gap-2">
                  <BiUpload className="w-4 h-4" />
                  Cargar logo
                </span>
                <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={handleLogoChange} />
              </label>

              <p className="mt-2 text-xs text-base-content/60">
                {logoFile ? logoFile.name : currentLogo ? 'Se conservará el logo actual.' : 'Aún no hay logo cargado.'}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-base-200 bg-base-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-base-content/60">
                    <BiPalette className="h-4 w-4" />
                    Primario
                  </div>
                  <input className="input input-bordered h-12 w-full p-1" type="color" {...register('color_primary')} />
                </div>
                <div className="rounded-2xl border border-base-200 bg-base-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-base-content/60">
                    <BiPalette className="h-4 w-4" />
                    Secundario
                  </div>
                  <input className="input input-bordered h-12 w-full p-1" type="color" {...register('color_secondary')} />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <div className="h-10 flex-1 rounded-2xl border border-base-300" style={{ backgroundColor: String(primaryColor) }} />
                <div className="h-10 flex-1 rounded-2xl border border-base-300" style={{ backgroundColor: String(secondaryColor) }} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-base-200 bg-base-50 p-5 space-y-5">
            <div>
              <h2 className="text-xl font-semibold">Información general</h2>
              <p className="text-sm text-base-content/60">Completa los datos principales y de contacto de la compañía.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="w-full">
                <label htmlFor="company-name" className="mb-2 block text-sm font-medium text-base-content">Nombre</label>
                <input id="company-name" className="input input-bordered h-11 w-full bg-base-100" {...register('name', { required: true })} />
              </div>
              <div className="w-full">
                <label htmlFor="company-tax-id" className="mb-2 block text-sm font-medium text-base-content">NIT</label>
                <input id="company-tax-id" className="input input-bordered h-11 w-full bg-base-100" {...register('tax_id')} />
              </div>
              <div className="w-full">
                <label htmlFor="company-email" className="mb-2 block text-sm font-medium text-base-content">Correo</label>
                <input id="company-email" className="input input-bordered h-11 w-full bg-base-100" type="email" {...register('email')} />
              </div>
              <div className="w-full">
                <label htmlFor="company-phone" className="mb-2 block text-sm font-medium text-base-content">Teléfono</label>
                <input id="company-phone" className="input input-bordered h-11 w-full bg-base-100" {...register('phone')} />
              </div>
              <div className="w-full md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="w-full">
                  <label htmlFor="company-country" className="mb-2 block text-sm font-medium text-base-content">País</label>
                  <Controller
                    control={control}
                    name="country_id"
                    render={({ field }) => (
                      <SearchableSelect
                        options={countries.map((country) => ({ value: country.id, label: country.name }))}
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? undefined)}
                        placeholder="Selecciona un país"
                        isClearable
                      />
                    )}
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="company-state" className="mb-2 block text-sm font-medium text-base-content">Estado</label>
                  <Controller
                    control={control}
                    name="state_id"
                    render={({ field }) => (
                      <SearchableSelect
                        options={states.map((state) => ({ value: state.id, label: state.name }))}
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? undefined)}
                        placeholder={selectedCountryId ? 'Selecciona un estado' : 'Primero selecciona un país'}
                        isDisabled={!selectedCountryId}
                        isClearable
                      />
                    )}
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="company-city" className="mb-2 block text-sm font-medium text-base-content">Ciudad</label>
                  <Controller
                    control={control}
                    name="city_id"
                    render={({ field }) => (
                      <SearchableSelect
                        options={cities.map((city) => ({ value: city.id, label: city.name }))}
                        value={field.value ?? null}
                        onChange={(value) => field.onChange(value ?? undefined)}
                        placeholder={selectedStateId ? 'Selecciona una ciudad' : 'Primero selecciona un estado'}
                        isDisabled={!selectedStateId}
                        isClearable
                      />
                    )}
                  />
                </div>
              </div>
              <div className="w-full md:col-span-2">
                <label htmlFor="company-address" className="mb-2 block text-sm font-medium text-base-content">Dirección</label>
                <input id="company-address" className="input input-bordered h-11 w-full bg-base-100" {...register('address')} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary px-6" type="submit">
            {isEdit ? 'Guardar cambios' : 'Crear compañía'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyFormPage;
