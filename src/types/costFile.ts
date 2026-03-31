export interface CostFile {
  id: number;
  file_name: string;
  file_path: string;
  company_id: number | null;
  plan_id?: number | null;
  type: number;
  created_at: string;
  company?: {
    id: number;
    name: string;
  };
  plan?: {
    id: number;
    name: string;
  };
}

export interface CreateCostFileData {
  file: File;
  company_id?: number | null;
  type: number;
  plan_id?: number | null;
}
