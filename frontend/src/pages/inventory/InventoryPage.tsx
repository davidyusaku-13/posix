import React from 'react'
import { InventoryManager } from '../../components/InventoryManager'
import type { CreateProductInput, Product, UpdateProductInput } from '../../types/pos'
import { posApi } from '../../services/api'

interface InventoryPageProps {
  products: Product[]
  onRefreshProducts: () => void
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  products,
  onRefreshProducts,
}) => {
  const handleCreateProduct = async (input: CreateProductInput) => {
    await posApi.createProduct(input)
    onRefreshProducts()
  }

  const handleUpdateProduct = async (id: number, input: UpdateProductInput) => {
    await posApi.updateProduct(id, input)
    onRefreshProducts()
  }

  const handleAdjustStock = async (id: number, delta: number) => {
    await posApi.adjustStock(id, delta)
    onRefreshProducts()
  }

  return (
    <InventoryManager
      products={products}
      onRefresh={onRefreshProducts}
      onCreateProduct={handleCreateProduct}
      onUpdateProduct={handleUpdateProduct}
      onAdjustStock={handleAdjustStock}
    />
  )
}
