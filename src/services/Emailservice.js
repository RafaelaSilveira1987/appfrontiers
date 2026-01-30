// ============================================
// HELPER: emailService.js
// ============================================
// Coloque este arquivo em: src/services/emailService.js
//
// IMPORTANTE: Esta é uma solução TEMPORÁRIA para desenvolvimento
// Em produção, use Edge Functions (mais seguro)

import { supabase } from '../lib/supabase';

// CONFIGURAÇÃO
const RESEND_API_KEY = 're_6reVp3M1_LoWqMMv9ruGm6WowSkDVFdbw'; // Pegue em https://resend.com

/**
 * Gera um código de 6 dígitos
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envia código de verificação via email
 * @param {string} email - Email do destinatário
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export async function sendVerificationCode(email) {
  try {
    console.log('📧 Enviando código para:', email);

    // 1. Gerar código
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // 2. Salvar no banco de dados
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (dbError) {
      console.error('❌ Erro ao salvar código:', dbError);
      throw new Error('Erro ao salvar código no banco de dados');
    }

    console.log('✅ Código salvo no banco:', code);

    // 3. Enviar email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Comunidade Frontiers <onboarding@resend.dev>',
        to: [email],
        subject: 'Seu código de verificação - Comunidade Frontiers',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #000000; margin-bottom: 20px;">🔐 Código de Verificação</h2>
              <p style="color: #333; font-size: 16px;">Olá!</p>
              <p style="color: #333; font-size: 16px;">Use o código abaixo para completar seu login:</p>
              
              <div style="background-color: #fcd030; padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <h1 style="margin: 0; font-size: 42px; letter-spacing: 10px; color: #000;">${code}</h1>
              </div>
              
              <p style="color: #666; font-size: 14px;">Este código expira em <strong>10 minutos</strong>.</p>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 13px;">
                  ⚠️ Se você não solicitou este código, ignore este email e mantenha sua senha segura.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999; font-size: 12px;">
                Comunidade Frontiers - Juntos para alcançar os primos
              </p>
              <p style="color: #ccc; font-size: 11px;">
                © 2026 Todos os direitos reservados
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao enviar email:', errorText);
      throw new Error(`Falha ao enviar email: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Email enviado com sucesso:', data);

    return {
      success: true,
      code, // ATENÇÃO: Remova isso em produção!
      message: 'Código enviado com sucesso'
    };

  } catch (error) {
    console.error('❌ Erro completo:', error);
    return {
      success: false,
      error: error.message || 'Erro ao enviar código'
    };
  }
}

/**
 * Valida código de verificação
 * @param {string} email - Email do usuário
 * @param {string} code - Código informado
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateVerificationCode(email, code) {
  try {
    console.log('🔍 Validando código para:', email);

    // Buscar código no banco
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('❌ Código inválido ou expirado');
      return {
        valid: false,
        error: 'Código inválido ou expirado'
      };
    }

    // Marcar código como usado
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', data.id);

    console.log('✅ Código validado com sucesso');
    return { valid: true };

  } catch (error) {
    console.error('❌ Erro ao validar código:', error);
    return {
      valid: false,
      error: error.message || 'Erro ao validar código'
    };
  }
}

/* ============================================
   INSTRUÇÕES DE USO:
   ============================================
   
   1. CRIAR CONTA RESEND (GRÁTIS):
      - Acesse: https://resend.com
      - Crie conta (100 emails grátis por dia)
      - Vá em "API Keys"
      - Clique em "Create API Key"
      - Copie a chave
   
   2. CONFIGURAR NO CÓDIGO:
      - Cole sua chave em RESEND_API_KEY acima
   
   3. USAR NO SEU APP:
      import { sendVerificationCode, validateVerificationCode } from './services/emailService';
      
      // Enviar código
      const result = await sendVerificationCode('user@example.com');
      
      // Validar código
      const validation = await validateVerificationCode('user@example.com', '123456');
   
   ⚠️ IMPORTANTE PARA PRODUÇÃO:
   - Mova RESEND_API_KEY para variáveis de ambiente
   - Use Edge Functions ao invés de chamar direto do app
   - Remova o retorno do 'code' na função sendVerificationCode
   - Adicione rate limiting
   
   ============================================
*/