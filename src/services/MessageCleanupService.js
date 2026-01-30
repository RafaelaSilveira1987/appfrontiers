import { supabase } from "../lib/supabase";

/**
 * Serviço para gerenciar a limpeza automática de mensagens antigas.
 */
export const MessageCleanupService = {
  /**
   * Exclui mensagens com mais de 30 dias.
   * Idealmente isso deveria ser um Cron Job no backend (Supabase Edge Functions),
   * mas podemos executar ao iniciar o app para garantir a limpeza.
   */
  async cleanupOldMessages() {
    try {
      console.log('🧹 Iniciando limpeza de mensagens antigas (30 dias)...');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();

      // 1. Limpar mensagens de grupos
      const { count: groupMsgCount, error: groupError } = await supabase
        .from('group_messages')
        .delete({ count: 'exact' })
        .lt('created_at', isoDate);

      if (groupError) throw groupError;

      // 2. Limpar posts do feed (se desejar que posts também expirem)
      const { count: postCount, error: postError } = await supabase
        .from('posts')
        .delete({ count: 'exact' })
        .lt('created_at', isoDate)
        .eq('pinned', false); // Não deletar posts fixados

      if (postError) throw postError;

      console.log(`✅ Limpeza concluída: ${groupMsgCount || 0} mensagens e ${postCount || 0} posts removidos.`);
      
      return {
        success: true,
        deletedMessages: groupMsgCount || 0,
        deletedPosts: postCount || 0
      };
    } catch (error) {
      console.error('❌ Erro na limpeza de mensagens:', error);
      return { success: false, error };
    }
  }
};
