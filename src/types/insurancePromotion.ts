export interface InsurancePromotion {
  id: number
  name: string
  relation: number // 1 = Intervalo, 2 = Edad
  interval?: number // 1 = Para Todos, 2 = 2 en 2, 3 = 3 en 3
  interval1?: number
  interval2?: number
  interval3?: number
  start_age?: number
  end_age?: number
  discount?: number
  created_at: string
  updated_at: string
}

export interface InsurancePromotionFormData {
  name: string
  relation: string // Manejado como string en el formulario
  interval: string
  interval1: string
  interval2: string
  interval3: string
  start_age: string
  end_age: string
  discount: string
}

export interface InsurancePromotionCreateData {
  name: string
  relation: number
  interval?: number
  interval1?: number
  interval2?: number
  interval3?: number
  start_age?: number
  end_age?: number
  discount?: number
}
