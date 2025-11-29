// Antonio Batista - LootFan - 2024-05-23
// Payment Service: Placeholder para futura integração de pagamentos.
// O Stripe foi removido conforme solicitação.

export const paymentService = {
  
  /**
   * Simula a criação de um pagamento.
   */
  async createPaymentIntent(amount: number, creatorId: string, campaignId: string) {
    console.log(`[Payment Simulation] Iniciando pagamento de R$${amount} para Creator ${creatorId}`);
    
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      transactionId: 'sim_' + Math.random().toString(36).substring(7)
    };
  }
};