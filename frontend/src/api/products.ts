import { apiClient } from './client'
import type { ProductResponse } from '@/types'

export const productsApi = {
  list: (shopId: string) =>
    apiClient.get<{ products: ProductResponse[]; total: number }>(`/products/${shopId}`).then((r) => r.data),
}
