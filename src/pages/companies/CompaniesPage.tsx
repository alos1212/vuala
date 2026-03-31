import { useEffect, useState } from 'react';
import { companyService } from '../../services/companyService';
import type { Company } from '../../types/company';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [formName, setFormName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const data = await companyService.getCompanies();
            setCompanies(data);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', formName);

        if (editingId) {
            await companyService.updateCompany(editingId, formData);
        } else {
            await companyService.createCompany(formData);
        }

        setFormName('');
        setEditingId(null);
        loadCompanies();
    };

    const handleEdit = (company: Company) => {
        setFormName(company.name);
        setEditingId(company.id);
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Seguro que deseas eliminar esta compañía?')) {
            await companyService.deleteCompany(id);
            loadCompanies();
        }
    };

    return (
        <div className="p-4 max-w-3xl mx-auto  bg-white shadow-md rounded-lg ">
            <h1 className="text-2xl font-bold mb-4">Gestión de Compañías</h1>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
                <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="Nombre de la compañía"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                />
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                    <FaPlus />
                    {editingId ? 'Actualizar' : 'Crear'}
                </button>
                {editingId && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                            setFormName('');
                            setEditingId(null);
                        }}
                    >
                        Cancelar
                    </button>
                )}
            </form>

            {/* Listado */}
            {loading ? (
                <p>Cargando compañías...</p>
            ) : companies.length === 0 ? (
                <p>No hay compañías registradas.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.map((company) => (
                                <tr key={company.id}>
                                    <td>{company.id}</td>
                                    <td>{company.name}</td>
                                    <td className="text-right flex gap-2 justify-end">
                                        <button
                                            className="btn btn-sm btn-warning flex items-center gap-1"
                                            onClick={() => handleEdit(company)}
                                        >
                                            <FaEdit /> Editar
                                        </button>
                                        <button
                                            className="btn btn-sm btn-error flex items-center gap-1"
                                            onClick={() => handleDelete(company.id)}
                                        >
                                            <FaTrash /> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
