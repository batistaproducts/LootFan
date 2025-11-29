import { createClient } from '@supabase/supabase-js';

// Antonio Batista - LootFan - 2024-05-23
// Cliente de conexão com o Supabase
// Utiliza Variáveis de Ambiente (Vite) para segurança, com fallback para dev.

// Acesso seguro ao import.meta.env para evitar crash em runtime se undefined
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://rzkczoljhuzranxftzzo.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6a2N6b2xqaHV6cmFueGZ0enpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTQ3NjAsImV4cCI6MjA3OTQ5MDc2MH0.9NWfAsYkKd4yBp4bSCTXGRz1uJK4zwjS61UAQ3PyV7c';

export const supabase = createClient(supabaseUrl, supabaseKey);