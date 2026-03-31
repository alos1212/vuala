import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { BiShield, BiCode, BiGroup, BiUser } from 'react-icons/bi';
import PermissionGuard from '../../components/auth/PermissionGuard';

const RolesLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-base-200">
            <div className="container mx-auto">
                {/* Navegación */}
                <div className="navbar bg-base-100 shadow-sm">
                    <div className="navbar-start">
                        <h1 className="text-xl font-bold">
                            <BiShield className="inline-block mr-2" />
                            Gestión de Accesos
                        </h1>
                    </div>
                    <div className="navbar-center">
                        <ul className="menu menu-horizontal px-1">
                            <PermissionGuard permission="users.list">
                                <li>
                                    <NavLink
                                        to="/users"
                                        className={({ isActive }) => isActive ? 'active' : ''}
                                    >
                                        <BiUser className="w-4 h-4" />
                                        Usuarios
                                    </NavLink>
                                </li>
                            </PermissionGuard>

                            <PermissionGuard permission="roles.list">
                                <li>
                                    <NavLink
                                        to="/roles"
                                        className={({ isActive }) => isActive ? 'active' : ''}
                                    >
                                        <BiGroup className="w-4 h-4" />
                                        Roles
                                    </NavLink>
                                </li>
                            </PermissionGuard>

                            <PermissionGuard permission="permissions.list">
                                <li>
                                    <NavLink
                                        to="/permissions"
                                        className={({ isActive }) => isActive ? 'active' : ''}
                                    >
                                        <BiCode className="w-4 h-4" />
                                        Permisos
                                    </NavLink>
                                </li>
                            </PermissionGuard>
                        </ul>
                    </div>
                </div>

                {/* Contenido */}
                <div className="py-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default RolesLayout;
