import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { FaUpload} from "react-icons/fa";
import type { CostFile } from "../../types/costFile";
import { costFileService } from "../../services/costFileService";
import type { Company } from "../../types/company";
import { companyService } from "../../services/companyService";
import { insurancePlanService } from "../../services/insurancePlanService";
import type { InsurancePlan } from "../../types/insurancePlan";

const CostFileList = () => {
  const [costFiles, setCostFiles] = useState<CostFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [type, setType] = useState<number>(0);
  const [planId, setPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [availablePlans, setAvailablePlans] = useState<InsurancePlan[]>([]);

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
    fetchCostFiles();
  }, []);

  const fetchCompanies = async () => {
    try {
      const companies = await companyService.getCompanies();
      setAvailableCompanies(companies);
    } catch (error) {
      console.error("Error al cargar compañías:", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const plans = await insurancePlanService.getInsurancePlans();
      setAvailablePlans(plans);
    } catch (error) {
      console.error("Error al cargar planes:", error);
    }
  };

  const fetchCostFiles = async () => {
    try {
      const { data } = await costFileService.getAll();
      setCostFiles(data);
    } catch (error) {
      console.error("Error al cargar archivos:", error);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      await costFileService.upload({ file: selectedFile, company_id: companyId, type, plan_id: planId });
      await fetchCostFiles();
      setSelectedFile(null);
      setCompanyId(null);
      setType(1);
      setPlanId(null);
    } catch (error) {
      console.error("Error al subir el archivo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center p-4">
      <div className="w-full container">
        {/* Card para el formulario */}
        <div className="card bg-base-200 shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-4">Subir Archivo de Costos</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <div>
              <label className="label">
                <span className="label-text">Archivo (CSV/XLS/XLSX)</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input file-input-bordered file-input-primary w-full"
                accept=".csv,.xlsx,.xls"
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Compañía</span>
              </label>
              <select
                value={companyId || ""}
                onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
                className="select select-bordered select-primary w-full"
              >
                <option value="">Selecciona una compañía (opcional)</option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                <span className="label-text">Plan (opcional)</span>
              </label>
              <select
                value={planId || ""}
                onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : null)}
                className="select select-bordered select-primary w-full"
              >
                <option value="">Todos los planes</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecciona un plan si deseas actualizar solo sus costos con columnas “días” y “valor”.
              </p>
            </div>
            <div>
              <label className="label">
                <span className="label-text">Tipo de valor</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                className="select select-bordered select-primary w-full"
              >
                <option value={0}>Selecciona</option>
                <option value={1} disabled>Venta</option>
                <option value={2}>Costo</option>
              </select>
              <p className="text-xs text-red-600 mt-1">{type === 0 ? "Obligatorio seleccionar un tipo." : "\u00a0"}</p>
            </div>
            <div>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isLoading || type === 0}
                className="btn btn-primary w-full"
              >
                {isLoading ? <span className="loading loading-spinner"></span> : <FaUpload />}
                Subir
              </button>
            </div>
          </div>
        </div>

        {/* Card para la tabla */}
        <div className="card bg-base-100 shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-4">Lista de Archivos</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre del Archivo</th>
                  <th>Compañía</th>
                  <th>Plan</th>
                  <th>Tipo de valor</th>
                  <th>Fecha de Creación</th>
                </tr>
              </thead>
              <tbody>
                {costFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.id}</td>
                    <td>{file.file_name}</td>
                    <td>{file.company?.name || "N/A"}</td>
                    <td>{file.plan?.name || "—"}</td>
                    <td>{file.type === 1 ? "Venta" : "Costo"}</td>
                    <td>{new Date(file.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostFileList;
