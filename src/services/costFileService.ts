import api from '../lib/axios';
import type { CostFile, CreateCostFileData } from "../types/costFile";

export const costFileService = {
  // Obtener todos los archivos de costos
  getAll: async (): Promise<{ data: CostFile[] }> => {
    const response = await api.get("/cost-files");
    return response.data;
  },
  // Cargar un nuevo archivo de costos
  upload: async (data: CreateCostFileData): Promise<{ data: CostFile }> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("company_id", data.company_id?.toString() || "");
    formData.append("type", data.type.toString());
    // Si se envía plan_id, el backend puede limitar la actualización a ese plan.
    if (data.plan_id) {
      formData.append("plan_id", data.plan_id.toString());
    }
    const response = await api.post("/cost-files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
