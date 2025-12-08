
// Antonio Batista - LootFan - 2024-05-23
// Definições de Tipos e Interfaces Globais

export enum UserRole {
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
  FAN = 'FAN',
  GUEST = 'GUEST'
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CompanyData {
  cnpj: string;
  legalName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  stateRegistration?: string; // Inscrição Estadual (Opcional para serviços em alguns casos)
}

export interface PersonalData {
  fullName: string;
  cpf: string;
  birthDate: string;
  phoneNumber: string;
  address: Address;
  
  // Dados de Pessoa Jurídica
  isCompany?: boolean;
  company?: CompanyData;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isAdult?: boolean; // Se o creator ou fã é +18 (Perfil)
  balance?: number; // Para Creators (Ganhos) ou Fãs (Créditos, se aplicável)
  commissionRate?: number; // Taxa da plataforma configurável (0.1 = 10%)
  termsAccepted?: boolean; // Novo: Flag de aceite de termos
  
  // Campos de Perfil Público
  username?: string; // Identificador único na URL
  bio?: string;
  socialLinks?: SocialLinks;

  // Dados Pessoais Sensíveis (LGPD - Armazenado em personal_info)
  personalData?: PersonalData;
}

export enum PrizeType {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
  SINGLE_VIEW = 'SINGLE_VIEW' // Visualização única (ex: link que expira ou conteúdo one-off)
}

export interface Prize {
  id: string;
  name: string;
  type: PrizeType;
  description: string; // URL para digital, Descrição envio para físico
  stock: number; // -1 para infinito
  probability: number; // 0 a 100
  perceivedValue: number;
  costPrice?: number; // Custo médio para o Creator (apenas físico/opcional)
  imageUrl?: string;
}

export enum CampaignAnimation {
  WHEEL = 'WHEEL',   // Roleta
  BOX = 'BOX',       // Caixa Surpresa
  LOOT = 'LOOT',     // Pacote de Figurinhas/Card
  MACHINE = 'MACHINE' // Slot Machine
}

export interface Campaign {
  id: string;
  creatorId: string;
  creatorUsername?: string; // Novo campo para exibir na FanView
  title: string;
  slug: string; // URL amigável (Globalmente única no momento)
  pricePerSpin: number;
  isActive: boolean;
  hasAdultContent: boolean; // Flag para conteúdo +18 específico da campanha
  prizes: Prize[];
  totalSpins: number;
  totalRevenue: number;
  animationType: CampaignAnimation; // Tipo de visualização para o fã
  coverImageUrl?: string; // Foto de capa da campanha para listagem
}

export enum DeliveryStatus {
    PENDING = 'PENDING',
    TRANSIT = 'TRANSIT',
    DELIVERED = 'DELIVERED',
    RETURNED = 'RETURNED',
    REFUND = 'REFUND'
}

export interface Transaction {
  id: string;
  campaignId: string; // Adicionado para filtro
  campaignTitle?: string; // Adicionado para exibição em detalhes
  date: string;
  fanName: string; // Anonimizado na view pública
  prizeWon: string;
  amountPaid: number;
  platformFee: number;
  creatorNet: number;
  status?: 'PENDING' | 'PAID' | 'FAILED';
  transactionType?: 'SPIN' | 'CREDIT_PURCHASE'; // Novo: Diferencia uso de crédito de compra
  
  // Snapshot do Prêmio (Para histórico do Fã)
  prizeType?: PrizeType;
  prizeContent?: string; // Link ou Descrição
  prizeImageUrl?: string; // Foto do produto no momento da compra
  isConsumed?: boolean; // Para Single View
  creatorName?: string; // Para listagem fácil
  creatorId?: string; // ID do Creator para suporte e contexto
  
  // Logística (Apenas Físico)
  deliveryStatus?: DeliveryStatus;
  trackingCode?: string;
  trackingUrl?: string;
  shippingAddress?: Address;
}

export enum TicketStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    CLOSED = 'CLOSED'
}

export interface SupportTicket {
    id: string;
    fanId: string;
    creatorId: string;
    transactionId: string;
    transactionPrizeName?: string; // Helper for UI
    fanName?: string; // Helper for UI
    creatorName?: string; // Helper for UI
    issueType: string;
    description: string;
    status: TicketStatus;
    contactEmail: string;
    contactPhone: string;
    createdAt: string;
    isRisk: boolean;
}

export interface ChatMessage {
    id: string;
    contextId: string; // ID da Transação ou do Ticket
    contextType: 'DELIVERY' | 'TICKET';
    senderId: string;
    senderName?: string; // Helper
    senderRole?: UserRole; // Helper
    content: string;
    createdAt: string;
    isRead: boolean;
}

// Novos Tipos para Gestão Financeira do Fã
export interface PaymentMethod {
    id: string;
    fanId: string;
    brand: string; // 'visa', 'mastercard', etc.
    last4: string;
    isDefault: boolean;
}

export interface CampaignBalance {
    campaignId: string;
    campaignTitle: string;
    campaignCover?: string;
    campaignSlug: string;
    creatorName: string;
    balance: number;
}

export const SUPPORT_ISSUES = [
    "Dúvida sobre o prazo de envio (Físico)",
    "Não recebi meu produto",
    "Meu produto veio com defeito",
    "O produto recebido não foi o sorteado",
    "Erro ao visualizar o produto (Digital)"
];
