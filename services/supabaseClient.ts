import { createClient } from '@supabase/supabase-js';

// Antonio Batista - LootFan - 2024-05-23
// Cliente de conexão com o Supabase

const supabaseUrl = 'https://rzkczoljhuzranxftzzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6a2N6b2xqaHV6cmFueGZ0enpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTQ3NjAsImV4cCI6MjA3OTQ5MDc2MH0.9NWfAsYkKd4yBp4bSCTXGRz1uJK4zwjS61UAQ3PyV7c';

export const supabase = createClient(supabaseUrl, supabaseKey);