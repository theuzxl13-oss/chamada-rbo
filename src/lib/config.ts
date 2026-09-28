/**
 * Configuração pública (disponível no navegador).
 * Quando as variáveis do Supabase estão definidas, o sistema funciona no modo
 * hospedado (link na internet); caso contrário, no modo local.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const MODO_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
