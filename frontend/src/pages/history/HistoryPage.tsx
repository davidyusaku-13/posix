import React, { useState } from 'react'
import { OrderHistory } from '../../components/OrderHistory'
import { ReceiptModal } from '../../components/ReceiptModal'
import type { CheckoutResponse } from '../../types/pos'

export const HistoryPage: React.FC = () => {
  const [reprintReceipt, setReprintReceipt] = useState<CheckoutResponse | null>(null)

  return (
    <>
      <OrderHistory onReprintReceipt={(receipt) => setReprintReceipt(receipt)} />

      {reprintReceipt && (
        <ReceiptModal
          receipt={reprintReceipt}
          onNewSale={() => setReprintReceipt(null)}
        />
      )}
    </>
  )
}
