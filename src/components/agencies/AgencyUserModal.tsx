import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Role, User } from '../../types/auth';
import RoleSelector from '../ui/RoleSelector';

const schema = yup.object({
  name: yup.string().required('El nombre es obligatorio'),
  email: yup.string().email('Correo inválido').required('El correo es obligatorio'),
  password: yup
    .string()
    .transform((value) => (value?.trim() === '' ? undefined : value))
    .min(6, 'Mínimo 6 caracteres')
    .notRequired(),
  password_confirmation: yup
    .string()
    .transform((value) => (value?.trim() === '' ? undefined : value))
    .when('password', {
      is: (password: string | undefined) => Boolean(password),
      then: (rule) => rule.required('Confirma la contraseña').oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
      otherwise: (rule) => rule.notRequired(),
    }),
  roles: yup.array().of(yup.number().required()).min(1, 'Selecciona al menos un rol'),
  birthdate: yup.string().notRequired(),
  gender: yup.mixed<'M' | 'F'>().oneOf(['M', 'F']).notRequired(),
  status: yup.mixed<'active' | 'inactive'>().oneOf(['active', 'inactive']).default('active'),
});

export type AgencyUserFormValues = yup.InferType<typeof schema> & { isEditing?: boolean };

interface AgencyUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: AgencyUserFormValues) => void;
  roles: Role[];
  user?: User | null;
  isSaving?: boolean;
}

const AgencyUserModal: React.FC<AgencyUserModalProps> = ({ isOpen, onClose, onSubmit, roles, user, isSaving }) => {
  const isEditing = !!user;
  const normalizeDate = (value: unknown): string => {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.slice(0, 10) : raw;
  };

  const resolveStatus = (value: unknown, isActive: unknown): 'active' | 'inactive' => {
    if (value === 'inactive' || value === 0 || value === '0') return 'inactive';
    if (value === 'active' || value === 1 || value === '1') return 'active';
    if (isActive === false || isActive === 0 || isActive === '0') return 'inactive';
    return 'active';
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<AgencyUserFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<AgencyUserFormValues>,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      roles: [],
      birthdate: '',
      gender: undefined,
      status: 'active',
    },
  });

  useEffect(() => {
    if (user) {
      const rolesIds = Array.isArray(user.role)
        ? user.role.map((r) => (r as any)?.id).filter((id): id is number => typeof id === 'number')
        : (user as any)?.role && typeof (user as any).role.id === 'number'
        ? [(user as any).role.id as number]
        : [];
      reset({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        roles: rolesIds,
        birthdate: normalizeDate((user as any).birthdate || (user as any).birth_date),
        gender: (user as any).gender || undefined,
        status: resolveStatus((user as any).status, (user as any).is_active),
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [],
        birthdate: '',
        gender: undefined,
        status: 'active',
      });
    }
  }, [user, reset]);

  const watchedRoles = watch('roles');

  const submitHandler = (values: AgencyUserFormValues) => {
    if (!isEditing && !values.password) {
      setError('password', { type: 'required', message: 'La contraseña es obligatoria' });
      return;
    }
    onSubmit({ ...values, isEditing });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
          {isEditing ? 'Editar usuario' : 'Crear usuario'}
          <span className="badge badge-primary badge-outline">{isEditing ? 'Edición' : 'Nuevo'}</span>
        </h3>
        <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Nombre *</span>
              </label>
              <input className="input input-bordered input-primary/60" {...register('name')} />
              {errors.name && <span className="label-text-alt text-error">{errors.name.message}</span>}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Correo *</span>
              </label>
              <input className="input input-bordered input-primary/60" {...register('email')} />
              {errors.email && <span className="label-text-alt text-error">{errors.email.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">{isEditing ? 'Contraseña (opcional)' : 'Contraseña *'}</span>
              </label>
              <input type="password" className="input input-bordered input-primary/60" {...register('password')} />
              {errors.password && <span className="label-text-alt text-error">{errors.password.message}</span>}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Confirmación</span>
              </label>
              <input type="password" className="input input-bordered input-primary/60" {...register('password_confirmation')} />
              {errors.password_confirmation && (
                <span className="label-text-alt text-error">{errors.password_confirmation.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Fecha de nacimiento</span>
              </label>
              <input type="date" className="input input-bordered input-primary/60" {...register('birthdate')} />
              {errors.birthdate && <span className="label-text-alt text-error">{errors.birthdate.message}</span>}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Género</span>
              </label>
              <select
                className="select select-bordered"
                value={(watch('gender') as 'M' | 'F' | undefined) || ''}
                onChange={(e) =>
                  setValue(
                    'gender',
                    (e.target.value ? (e.target.value as 'M' | 'F') : undefined),
                    { shouldValidate: true }
                  )
                }
              >
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              {errors.gender && <span className="label-text-alt text-error">{errors.gender.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Estado</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={watch('status') !== 'inactive'}
                  onChange={(e) => setValue('status', e.target.checked ? 'active' : 'inactive', { shouldValidate: true })}
                />
                <span className="font-semibold">
                  {watch('status') === 'inactive' ? 'Inactivo' : 'Activo'}
                </span>
              </label>
              {errors.status && <span className="label-text-alt text-error">{errors.status.message}</span>}
            </div>
          </div>

          <div className="divider mt-2">Rol</div>
          <RoleSelector
            roles={roles}
            selectedRoles={(watchedRoles || []).filter((n): n is number => typeof n === 'number')}
            onRolesChange={(value) => setValue('roles', value)}
            multiple={false}
          />
          {errors.roles && <span className="label-text-alt text-error">{errors.roles.message}</span>}

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <span className="loading loading-spinner loading-sm" /> : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgencyUserModal;
