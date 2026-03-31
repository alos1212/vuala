import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { BiX, BiShield } from 'react-icons/bi';
import { useRoles } from '../../hooks/useRoles';
import type { Role, Permission } from '../../types/auth';
import PermissionsSelector from './PermissionsSelector';

interface RoleFormData {
    name: string;
    display_name: string;
    description?: string;
    type: 0 | 1 | 2;
    permissions: number[];
}

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role?: Role | null;
    permissions: Permission[];
}

const schema = yup.object({
    name: yup.string()
        .required('El nombre es requerido')
        .matches(/^[a-z_]+$/, 'Solo letras minúsculas y guiones bajos'),
    display_name: yup.string().required('El nombre para mostrar es requerido'),
    description: yup.string().optional(),
    type: yup.number().oneOf([0, 1, 2], 'Selecciona un tipo válido').required('El tipo es requerido'),
    permissions: yup.array().of(yup.number().required()).min(1, 'Selecciona al menos un permiso'),
});

const RoleModal: React.FC<RoleModalProps> = ({
    isOpen,
    onClose,
    role,
    permissions
}) => {
    const { createRole, updateRole, isCreating, isUpdating } = useRoles();
    const isEditing = !!role;

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<RoleFormData>({
        resolver: yupResolver(schema) as unknown as Resolver<RoleFormData>,
        defaultValues: {
            name: '',
            display_name: '',
            description: '',
            type: 0,
            permissions: [] as number[],
        },
    });

    const watchedPermissions = watch('permissions');

    useEffect(() => {
        if (role) {
            reset({
                name: role.name,
                display_name: role.display_name,
                description: role.description || '',
                type: role.type,
                permissions: role.permissions.map(p => p.id),
            });
        } else {
            reset({
                name: '',
                display_name: '',
                description: '',
                type: 0,
                permissions: [],
            });
        }
    }, [role, reset]);

    const onSubmit = (data: RoleFormData) => {
        if (isEditing && role) {
            updateRole({ id: role.id, data }, {
                onSuccess: () => {
                    onClose();
                    reset();
                }
            });
        } else {
            createRole(data, {
                onSuccess: () => {
                    onClose();
                    reset();
                }
            });
        }
    };

    const handleClose = () => {
        onClose();
        reset();
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg flex items-center">
                        <BiShield className="w-6 h-6 mr-2 text-primary" />
                        {isEditing ? 'Editar Rol' : 'Crear Rol'}
                    </h3>
                    <button
                        className="btn btn-sm btn-circle btn-ghost"
                        onClick={handleClose}
                    >
                        <BiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre del rol */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">
                                    Nombre del Rol *
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="admin, editor, viewer..."
                                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                                {...register('name')}
                            />
                            {errors.name && (
                                <label className="label">
                                    <span className="label-text-alt text-error">
                                        {errors.name.message}
                                    </span>
                                </label>
                            )}
                        </div>

                        {/* Nombre para mostrar */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">
                                    Nombre para Mostrar *
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="Administrador, Editor, Visualizador..."
                                className={`input input-bordered ${errors.display_name ? 'input-error' : ''}`}
                                {...register('display_name')}
                            />
                            {errors.display_name && (
                                <label className="label">
                                    <span className="label-text-alt text-error">
                                        {errors.display_name.message}
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Tipo de rol */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">
                                Tipo de Rol *
                            </span>
                        </label>
                        <select
                            className={`select select-bordered ${errors.type ? 'select-error' : ''}`}
                            {...register('type', { valueAsNumber: true })}
                        >
                            <option value={0}>Administrativo</option>
                            <option value={1}>Agencia</option>
                            <option value={2}>Comercial</option>
                        </select>
                        {errors.type && (
                            <label className="label">
                                <span className="label-text-alt text-error">
                                    {errors.type.message}
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Descripción</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered h-20"
                            placeholder="Descripción del rol..."
                            {...register('description')}
                        />
                    </div>

                    {/* Selector de Permisos */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">
                                Permisos * ({watchedPermissions?.length} seleccionados)
                            </span>
                        </label>
                        <PermissionsSelector
                            permissions={permissions}
                            selectedPermissions={watchedPermissions ? watchedPermissions.filter((id): id is number => typeof id === 'number') : []}
                            onPermissionsChange={(selected) => setValue('permissions', selected)}
                        />
                        {errors.permissions && (
                            <label className="label">
                                <span className="label-text-alt text-error">
                                    {errors.permissions.message}
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={handleClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isCreating || isUpdating}
                        >
                            {isCreating || isUpdating ? (
                                <span className="loading loading-spinner loading-sm"></span>
                            ) : (
                                isEditing ? 'Actualizar' : 'Crear'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;
