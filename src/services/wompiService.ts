import api from "../lib/axios";

export interface FinancialInstitution { code: string; name: string }

export const wompiService = {
  getFinancialInstitutions: async (): Promise<FinancialInstitution[]> => {
    const { data } = await api.get(
      "/wompi/pse/financial-institutions"
    );
    // API returns keys: financial_institution_code, financial_institution_name
    if (Array.isArray(data)) {
      return data.map((d: any) => ({
        code: String(d.financial_institution_code ?? d.code ?? ""),
        name: String(d.financial_institution_name ?? d.name ?? ""),
      }));
    }
    return [];
  },
};
