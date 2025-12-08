
import { User, UserRole, Campaign, Prize, PrizeType, Transaction, SocialLinks, PersonalData, CampaignAnimation, DeliveryStatus, SupportTicket, TicketStatus, ChatMessage, PaymentMethod, CampaignBalance } from '../types';
import { supabase } from './supabaseClient';

// Antonio Batista - LootFan - 2024-05-23
// Service Layer: Lógica de Negócio e Persistência Supabase
// Atualizado: Sistema de Créditos e Gestão Financeira do Fã

class DbService {
  private currentUser: User | null = null;

  // --- AUTH & PROFILE ---
  
  async login(role: UserRole): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .limit(1)
      .single();

    if (error || !data) {
      console.error("Erro no login:", error);
      throw new Error('Usuário de demonstração não encontrado.');
    }

    return this.mapProfileToUser(data);
  }

  async loginByEmail(email: string, password?: string, role?: UserRole): Promise<User> {
      if (!password) throw new Error("Senha é obrigatória.");

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
      });

      if (authError) {
          if (authError.code === 'invalid_credentials') {
              throw new Error('E-mail ou senha incorretos.');
          }
          throw new Error('Falha na autenticação.');
      }

      if (!authData.user) throw new Error('Falha na autenticação.');

      const user = await this.getUserProfile(authData.user.id);
      
      if (!user) {
           console.warn("Usuário Auth sem Profile. Tentando recuperar...");
           throw new Error("Perfil de usuário não encontrado. Entre em contato com o suporte.");
      }
      
      this.currentUser = user;
      return user;
  }

  async registerUser(name: string, email: string, password?: string, role?: UserRole): Promise<User> {
      if (!password || !role) throw new Error("Dados incompletos para registro.");

      const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
      });

      if (authError) {
          if (authError.code === 'user_already_exists') {
              throw new Error('Este e-mail já está cadastrado.');
          }
          console.error("SignUp Error:", JSON.stringify(authError));
          throw new Error(authError.message || 'Falha ao criar conta.');
      }

      if (!authData.user) throw new Error('Erro inesperado ao criar usuário.');

      if (!authData.session) {
          throw new Error('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta antes de entrar.');
      }

      const tempUsername = name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);

      const { data, error } = await supabase
          .from('profiles')
          .insert({
              id: authData.user.id,
              name,
              email,
              role,
              username: tempUsername,
              is_adult: true, 
              balance: 0,
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString()
          })
          .select()
          .single();

      if (error || !data) {
          console.error("Profile Create Error:", JSON.stringify(error));
          throw new Error('Falha ao configurar perfil do usuário.');
      }

      const user = this.mapProfileToUser(data);
      this.currentUser = user;
      return user;
  }

  async logout() {
    await supabase.auth.signOut();
    this.currentUser = null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async getUserProfile(userId: string): Promise<User | null> {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
      
      if (error || !data) return null;
      return this.mapProfileToUser(data);
  }

  async acceptTerms(userId: string): Promise<void> {
      const { error } = await supabase
          .from('profiles')
          .update({ 
              terms_accepted: true,
              terms_accepted_at: new Date().toISOString()
          })
          .eq('id', userId);
      
      if (error) throw error;
      
      if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser.termsAccepted = true;
      }
  }

  private mapProfileToUser(data: any): User {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        avatarUrl: data.avatar_url,
        isAdult: data.is_adult,
        balance: data.balance,
        commissionRate: data.commission_rate,
        username: data.username,
        bio: data.bio,
        socialLinks: data.social_links,
        personalData: data.personal_info,
        termsAccepted: data.terms_accepted || false
      };
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.avatarUrl) payload.avatar_url = updates.avatarUrl;
    if (updates.username) payload.username = updates.username;
    if (updates.bio) payload.bio = updates.bio;
    if (updates.socialLinks) payload.social_links = updates.socialLinks;
    
    if (updates.personalData) payload.personal_info = updates.personalData;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw error;
    
    if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = { ...this.currentUser, ...updates };
    }
  }

  async uploadAvatar(file: File, userId: string): Promise<string> {
    if (file.size > 2 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 2MB.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
            throw new Error("Erro de Configuração: O Bucket 'avatars' não existe no Supabase. Crie-o como Público.");
        }
        throw new Error(`Falha no upload: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(cleanFileName);
    return data.publicUrl;
  }

  async uploadPrizeImage(file: File, creatorId: string): Promise<string> {
    if (file.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5MB.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${creatorId}/${Date.now()}.${fileExt}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._\-/]/g, '');
    
    const { error: uploadError } = await supabase.storage
      .from('prize-images')
      .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
            throw new Error("Erro de Configuração: O Bucket 'prize-images' não existe no Supabase. Crie-o como Público.");
        }
        throw new Error(`Falha no upload: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('prize-images').getPublicUrl(cleanFileName);
    return data.publicUrl;
  }

  async uploadCampaignImage(file: File, creatorId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${creatorId}/camp_${Date.now()}.${fileExt}`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._\-/]/g, '');
    
    const { error: uploadError } = await supabase.storage
      .from('campaign-images')
      .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
            throw new Error("Erro de Configuração: O Bucket 'campaign-images' não existe no Supabase. Crie-o como Público.");
        }
        throw new Error(`Falha no upload da capa: ${uploadError.message}`);
    }
    const { data } = supabase.storage.from('campaign-images').getPublicUrl(cleanFileName);
    return data.publicUrl;
  }

  // --- SEARCH & READ ---
  async searchCreators(query: string): Promise<User[]> {
      if (!query.trim()) return [];
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'CREATOR')
          .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(20);
      if (error) return [];
      return data.map(this.mapProfileToUser);
  }

  async getTopCreators(): Promise<User[]> {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'CREATOR')
          .order('balance', { ascending: false }) 
          .limit(10);
      if (error) return [];
      return data.map(this.mapProfileToUser);
  }

  async getCreatorByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).eq('role', 'CREATOR').single();
    if (error || !data) return null;
    return this.mapProfileToUser(data);
  }

  // --- CAMPAIGNS ---
  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    const { data, error } = await supabase.from('campaigns').select(`*, prizes (*)`).eq('creator_id', creatorId);
    if (error) return [];
    return data.map((c: any) => ({
      id: c.id, creatorId: c.creator_id, title: c.title, slug: c.slug, pricePerSpin: c.price_per_spin,
      isActive: c.is_active, totalSpins: c.total_spins, totalRevenue: c.total_revenue,
      animationType: c.animation_type, coverImageUrl: c.cover_image_url, hasAdultContent: c.has_adult_content,
      prizes: (c.prizes || []).map(this.mapPrize).sort((a: Prize, b: Prize) => b.probability - a.probability)
    }));
  }

  async getCampaignBySlug(slug: string): Promise<Campaign | undefined> {
    const { data, error } = await supabase.from('campaigns').select(`*, prizes (*), profiles (username, name)`).eq('slug', slug).single();
    if (error || !data) return undefined;
    return {
      id: data.id, creatorId: data.creator_id, creatorUsername: data.profiles?.username, title: data.title,
      slug: data.slug, pricePerSpin: data.price_per_spin, isActive: data.is_active, totalSpins: data.total_spins,
      totalRevenue: data.total_revenue, animationType: data.animation_type, coverImageUrl: data.cover_image_url,
      hasAdultContent: data.has_adult_content,
      prizes: data.prizes.map(this.mapPrize)
    };
  }

  async createCampaign(creatorId: string, title: string, slug: string, price: number): Promise<Campaign | null> {
    const { data, error } = await supabase.from('campaigns').insert({
        creator_id: creatorId, title, slug, price_per_spin: price, is_active: false, total_spins: 0, total_revenue: 0, animation_type: CampaignAnimation.WHEEL, has_adult_content: false
      }).select().single();
    if (error) throw error;
    return { ...data, creatorId: data.creator_id, pricePerSpin: data.price_per_spin, totalSpins: 0, totalRevenue: 0, isActive: false, hasAdultContent: false, prizes: [] } as any;
  }

  async saveCampaign(campaign: Campaign): Promise<void> {
    await supabase.from('campaigns').update({
        title: campaign.title, 
        slug: campaign.slug, 
        price_per_spin: campaign.pricePerSpin, 
        is_active: campaign.isActive, 
        animation_type: campaign.animationType, 
        cover_image_url: campaign.coverImageUrl,
        has_adult_content: campaign.hasAdultContent
      }).eq('id', campaign.id);

    for (const p of campaign.prizes) {
      const payload: any = {
        campaign_id: campaign.id, name: p.name, type: p.type, description: p.description, stock: p.stock, probability: p.probability, perceived_value: p.perceivedValue, cost_price: p.costPrice || 0, image_url: p.imageUrl
      };
      if (!p.id.startsWith('temp-')) payload.id = p.id;
      await supabase.from('prizes').upsert(payload);
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await supabase.from('prizes').delete().eq('campaign_id', campaignId);
    await supabase.from('campaigns').delete().eq('id', campaignId);
  }

  async deletePrize(prizeId: string): Promise<void> {
    if (prizeId.startsWith('temp-')) return;
    await supabase.from('prizes').delete().eq('id', prizeId);
  }

  private mapPrize(p: any): Prize {
      return {
        id: p.id, name: p.name, type: p.type as PrizeType, description: p.description, stock: p.stock,
        probability: p.probability, perceivedValue: p.perceived_value, costPrice: p.cost_price || 0, imageUrl: p.image_url
      };
  }

  // --- TRANSACTIONS & CREDITS ---

  async purchaseCredits(fanId: string, campaignId: string, quantity: number, totalPrice: number): Promise<void> {
      // 1. Registrar Transação Financeira (Compra de Pacote)
      const { error: transError } = await supabase.from('transactions').insert({
          campaign_id: campaignId,
          fan_id: fanId,
          prize_won: `Pacote de ${quantity} Aberturas`, // Descritivo
          amount_paid: totalPrice,
          platform_fee: totalPrice * 0.10,
          creator_net: totalPrice * 0.90,
          status: 'PAID',
          transaction_type: 'CREDIT_PURCHASE',
          is_consumed: true // Já entregue como crédito
      });

      if (transError) throw transError;

      // 2. Adicionar Saldo ao Fã
      // Utiliza UPSERT para incrementar
      const { data: existing } = await supabase
          .from('campaign_balances')
          .select('balance')
          .eq('fan_id', fanId)
          .eq('campaign_id', campaignId)
          .single();
      
      const newBalance = (existing?.balance || 0) + quantity;

      const { error: balError } = await supabase.from('campaign_balances').upsert({
          fan_id: fanId,
          campaign_id: campaignId,
          balance: newBalance
      }, { onConflict: 'fan_id,campaign_id' });

      if (balError) throw balError;

      // 3. Atualizar Receita da Campanha
      const { data: camp } = await supabase.from('campaigns').select('total_revenue').eq('id', campaignId).single();
      if (camp) {
          await supabase.from('campaigns').update({
              total_revenue: Number(camp.total_revenue) + totalPrice
          }).eq('id', campaignId);
      }
  }

  async useCreditAndSpin(campaignId: string, prize: Prize, fanId: string): Promise<Transaction> {
      // 1. Decrementar Saldo
      const { data: existing } = await supabase.from('campaign_balances').select('balance').eq('fan_id', fanId).eq('campaign_id', campaignId).single();
      if (!existing || existing.balance < 1) throw new Error("Saldo insuficiente de aberturas.");

      await supabase.from('campaign_balances').update({ balance: existing.balance - 1 }).eq('fan_id', fanId).eq('campaign_id', campaignId);

      // 2. Registrar Transação do Prêmio (Valor 0 pois foi pré-pago)
      return this.recordTransaction(campaignId, prize, fanId, 0, 'SPIN');
  }

  async recordTransaction(campaignId: string, prize: Prize, fanId: string, price: number, type: 'SPIN' | 'CREDIT_PURCHASE' = 'SPIN'): Promise<Transaction> {
    const { data: fanProfile } = await supabase.from('profiles').select('personal_info').eq('id', fanId).single();
    const deliveryAddress = fanProfile?.personal_info?.address;

    const feeRate = 0.10; 
    const fee = price * feeRate;
    const net = price - fee;

    const { data: transData, error: transError } = await supabase.from('transactions').insert({
        campaign_id: campaignId, 
        fan_id: fanId, 
        prize_won: prize.name, 
        amount_paid: price, 
        platform_fee: fee, 
        creator_net: net, 
        status: 'PAID',
        transaction_type: type,
        prize_type: prize.type, 
        prize_content: prize.description, 
        is_consumed: false,
        prize_image_url: prize.imageUrl || null, 
        delivery_status: prize.type === PrizeType.PHYSICAL ? DeliveryStatus.PENDING : null,
        shipping_address: prize.type === PrizeType.PHYSICAL ? deliveryAddress : null
      }).select().single();
      
    if (transError) console.error("Erro transação", transError);

    // Decrement stock only for spins that deliver prizes
    if (type === 'SPIN' && prize.stock > 0) {
       await supabase.rpc('decrement_stock', { prize_uuid: prize.id });
    }

    if (type === 'SPIN') {
        const { data: camp } = await supabase.from('campaigns').select('total_spins').eq('id', campaignId).single();
        if (camp) {
            await supabase.from('campaigns').update({
                total_spins: camp.total_spins + 1
                // Revenue is updated on credit purchase
            }).eq('id', campaignId);
        }
    }

    return this.mapTransaction(transData);
  }

  async getCampaignBalance(fanId: string, campaignId: string): Promise<number> {
      const { data, error } = await supabase
          .from('campaign_balances')
          .select('balance')
          .eq('fan_id', fanId)
          .eq('campaign_id', campaignId)
          .single();
      
      if (error || !data) return 0;
      return data.balance;
  }

  async getAllFanBalances(fanId: string): Promise<CampaignBalance[]> {
      const { data, error } = await supabase
          .from('campaign_balances')
          .select(`
              balance,
              campaigns (
                  id, title, slug, cover_image_url,
                  profiles (name)
              )
          `)
          .eq('fan_id', fanId)
          .gt('balance', 0); // Apenas saldos positivos

      if (error) return [];
      return data.map((item: any) => ({
          campaignId: item.campaigns.id,
          campaignTitle: item.campaigns.title,
          campaignSlug: item.campaigns.slug,
          campaignCover: item.campaigns.cover_image_url,
          creatorName: item.campaigns.profiles.name,
          balance: item.balance
      }));
  }

  async getTransactions(creatorId: string): Promise<Transaction[]> {
    // Optimized single query
    const { data, error } = await supabase
      .from('transactions')
      .select('*, campaigns!inner(creator_id), profiles!transactions_fan_id_fkey(name)')
      .eq('campaigns.creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar transações otimizadas:", error);
        return [];
    }

    return data.map((t: any) => ({
      ...this.mapTransaction(t),
      fanName: t.profiles?.name || 'Anônimo'
    }));
  }

  async getFanTransactions(fanId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        campaigns (
            title,
            creator_id,
            profiles (
               name
            )
        )
      `)
      .eq('fan_id', fanId)
      .neq('transaction_type', 'CREDIT_PURCHASE') // Mostrar apenas prêmios ganhos
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro buscar prêmios fã:", JSON.stringify(error));
        return [];
    }

    return data.map((t: any) => ({
      ...this.mapTransaction(t),
      fanName: 'Você',
      creatorName: t.campaigns?.profiles?.name || 'Creator Desconhecido',
      creatorId: t.campaigns?.creator_id,
      campaignTitle: t.campaigns?.title || 'Campanha'
    }));
  }

  async consumePrize(transactionId: string): Promise<void> {
      await supabase.from('transactions').update({ is_consumed: true }).eq('id', transactionId);
  }

  // --- Mapeamento Seguro ---
  private mapTransaction(t: any): Transaction {
      if (!t) return {} as Transaction;
      return {
          id: t.id, campaignId: t.campaign_id, date: t.created_at, fanName: 'Fan', prizeWon: t.prize_won,
          amountPaid: t.amount_paid, platformFee: t.platform_fee, creatorNet: t.creator_net, status: t.status,
          transactionType: t.transaction_type || 'SPIN',
          prizeType: t.prize_type as PrizeType, prizeContent: t.prize_content, isConsumed: t.is_consumed,
          prizeImageUrl: t.prize_image_url,
          deliveryStatus: t.delivery_status as DeliveryStatus, trackingCode: t.tracking_code, trackingUrl: t.tracking_url,
          shippingAddress: t.shipping_address
      };
  }

  // --- DELIVERY MANAGEMENT ---

  async getDeliveries(creatorId: string): Promise<Transaction[]> {
      return (await this.getTransactions(creatorId)).filter(t => t.prizeType === PrizeType.PHYSICAL);
  }

  async updateDelivery(transactionId: string, status: DeliveryStatus, trackingCode?: string, trackingUrl?: string): Promise<void> {
      await supabase.from('transactions').update({
          delivery_status: status,
          tracking_code: trackingCode,
          tracking_url: trackingUrl
      }).eq('id', transactionId);
  }

  // --- SUPPORT TICKETS ---

  async createSupportTicket(fanId: string, creatorId: string, transactionId: string, issueType: string, description: string, email: string, phone: string): Promise<SupportTicket> {
      const { data, error } = await supabase.from('support_tickets').insert({
          fan_id: fanId, creator_id: creatorId, transaction_id: transactionId,
          issue_type: issueType, description, status: TicketStatus.PENDING,
          contact_email: email, contact_phone: phone
      }).select().single();

      if (error) throw error;
      return this.mapTicket(data);
  }

  async getTicketsByCreator(creatorId: string): Promise<SupportTicket[]> {
      const { data, error } = await supabase.from('support_tickets')
        .select(`*, profiles!support_tickets_fan_id_fkey(name), transactions(prize_won)`)
        .eq('creator_id', creatorId).order('created_at', {ascending: false});
      
      if(error) return [];
      return data.map((t: any) => ({
          ...this.mapTicket(t),
          fanName: t.profiles?.name || 'Fã',
          transactionPrizeName: t.transactions?.prize_won || 'Prêmio'
      }));
  }

  async getTicketsByFan(fanId: string): Promise<SupportTicket[]> {
      const { data, error } = await supabase.from('support_tickets')
        .select(`*, profiles!support_tickets_creator_id_fkey(name), transactions(prize_won)`)
        .eq('fan_id', fanId).order('created_at', {ascending: false});

      if(error) return [];
      return data.map((t: any) => ({
          ...this.mapTicket(t),
          creatorName: t.profiles?.name || 'Creator',
          transactionPrizeName: t.transactions?.prize_won || 'Prêmio'
      }));
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
      await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  }

  async escalateTicket(ticketId: string): Promise<void> {
      await supabase.from('support_tickets').update({ is_risk: true }).eq('id', ticketId);
  }

  private mapTicket(t: any): SupportTicket {
      return {
          id: t.id, fanId: t.fan_id, creatorId: t.creator_id, transactionId: t.transaction_id,
          issueType: t.issue_type, description: t.description, status: t.status as TicketStatus,
          contactEmail: t.contact_email, contactPhone: t.contact_phone, createdAt: t.created_at, isRisk: t.is_risk
      };
  }

  // --- CHAT SYSTEM (Polymorphic) ---

  async getChatMessages(contextId: string, contextType: 'DELIVERY' | 'TICKET'): Promise<ChatMessage[]> {
      const { data, error } = await supabase.from('chat_messages')
        .select(`*, profiles(name, role)`)
        .eq('context_id', contextId)
        .eq('context_type', contextType)
        .order('created_at', { ascending: true });

      if (error) return [];
      return data.map((m: any) => ({
          id: m.id, contextId: m.context_id, contextType: m.context_type,
          senderId: m.sender_id, content: m.content, createdAt: m.created_at, isRead: m.is_read,
          senderName: m.profiles?.name, senderRole: m.profiles?.role
      }));
  }

  async sendChatMessage(contextId: string, contextType: 'DELIVERY' | 'TICKET', senderId: string, content: string): Promise<ChatMessage> {
      const user = await this.getUserProfile(senderId);
      if (user?.role === UserRole.FAN) {
          const messages = await this.getChatMessages(contextId, contextType);
          if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              if (lastMsg.senderId === senderId) {
                  throw new Error("Aguarde a resposta do Creator antes de enviar outra mensagem.");
              }
          } else {
             if (contextType === 'DELIVERY') throw new Error("Aguarde o Creator iniciar o contato.");
          }
      }

      const { data, error } = await supabase.from('chat_messages').insert({
          context_id: contextId, context_type: contextType, sender_id: senderId, content
      }).select().single();

      if (error) throw error;
      return {
          id: data.id, contextId: data.context_id, contextType: data.context_type,
          senderId: data.sender_id, content: data.content, createdAt: data.created_at, isRead: data.is_read
      };
  }

  // --- GESTÃO FINANCEIRA FÃ (MOCK VAULT) ---

  async getPaymentMethods(fanId: string): Promise<PaymentMethod[]> {
      const { data, error } = await supabase.from('payment_methods').select('*').eq('fan_id', fanId);
      if (error) return [];
      return data.map((p: any) => ({
          id: p.id, fanId: p.fan_id, brand: p.brand, last4: p.last4, isDefault: p.is_default
      }));
  }

  async addPaymentMethod(fanId: string, cardNumber: string, expiry: string, cvc: string): Promise<PaymentMethod> {
      // Mock de Tokenização
      const brand = cardNumber.startsWith('4') ? 'visa' : 'mastercard';
      const last4 = cardNumber.slice(-4);
      const token = `tok_${Math.random().toString(36).substring(7)}`;

      const { data, error } = await supabase.from('payment_methods').insert({
          fan_id: fanId, brand, last4, token
      }).select().single();

      if (error) throw error;
      return { id: data.id, fanId: data.fan_id, brand: data.brand, last4: data.last4, isDefault: data.is_default };
  }

  async deletePaymentMethod(methodId: string): Promise<void> {
      await supabase.from('payment_methods').delete().eq('id', methodId);
  }
}

export const dbService = new DbService();
