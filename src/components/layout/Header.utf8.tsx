import React from 'react';
import {
    BiBell,
    BiLogOut,
    BiUser,
    BiChevronDown
} from 'react-icons/bi';
import { useAuth } from '../../hooks/useAuth';
import { getUserAvatar, getDisplayName } from '../../utils/authHelpers';
//import EmailVerificationBanner from '../auth/EmailVerificationBanner';
import Sidebar from './Sidebar';

const Header: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="bg-base-100 shadow mb-5">
            <div className="navbar px-4 md:px-6">
            
                {/* Columna centro - Contenido principal */}
                <div className="flex-1 flex justify-center items-center">
                    <Sidebar />
                </div>

                {/* Columna derecha - Notificaciones + Usuario */}
                <div className="flex-none flex items-center space-x-3">
                    {/* Notificaciones */}
                    <div className="dropdown dropdown-end">
                        <button className="btn btn-ghost btn-circle">
                            <div className="indicator">
                                <BiBell className="w-5 h-5" />
                                <span className="badge badge-xs badge-primary indicator-item">3</span>
                            </div>
                        </button>
                        <div className="dropdown-content mt-3 z-[1] card card-compact w-64 bg-base-100 shadow">
                            <div className="card-body">
                                <span className="font-bold text-lg">3 Notificaciones</span>
                                <div className="space-y-2">
                                    <div className="alert alert-info alert-sm">
                                        <span>Nueva actualizaciÃ³n disponible</span>
                                    </div>
                                    <div className="alert alert-success alert-sm">
                                        <span>Usuario creado correctamente</span>
                                    </div>
                                    <div className="alert alert-warning alert-sm">
                                        <span>Revisa los permisos del rol</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MenÃº de usuario */}
                    <div className="dropdown dropdown-end">
                        <button className="btn btn-ghost flex items-center space-x-2 px-2">
                            <div className="avatar">
                                <div className="w-8 rounded-full avatar" >
                                    <img src={getUserAvatar(user)} alt={getDisplayName(user)} />
                                </div>
                            </div>
                            <div className="hidden md:block text-left">
                                <div className="text-sm font-semibold">{getDisplayName(user)}</div>
                                <div className="text-xs text-base-content/60">
                                    {user?.role?.[0]?.display_name || 'Usuario'}
                                </div>
                            </div>
                            <BiChevronDown className="w-4 h-4" />
                        </button>
                        <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li>
                                <a href="/profile">
                                    <BiUser className="w-4 h-4" /> Mi Perfil
                                </a>
                            </li>
                            <li>
                                <hr className="my-2" />
                            </li>
                            <li>
                                <button onClick={() => logout()} className="text-error">
                                    <BiLogOut className="w-4 h-4" /> Cerrar SesiÃ³n
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Header;
