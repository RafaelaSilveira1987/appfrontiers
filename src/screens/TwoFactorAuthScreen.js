import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// ============================================
// CONFIGURAÇÃO DO RESEND API
// ============================================
// IMPORTANTE: Cole sua API Key do Resend aqui
// Obtenha em: https://resend.com (100 emails grátis/dia)
const RESEND_API_KEY = 're_6reVp3M1_LoWqMMv9ruGm6WowSkDVFdbw'; // ⚠️ ALTERE AQUI!

export default function TwoFactorAuthScreen({ route, navigation }) {
  const { email, phone, password } = route.params;
  const { login } = useAuth();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    // Timer para reenviar código
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    // Enviar código ao montar componente
    sendVerificationCode();
  }, []);

  async function sendVerificationCode() {
    try {
      console.log('📧 Enviando código para:', email);

      // Gerar código de 6 dígitos
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      // Salvar código no banco com expiração de 10 minutos
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: dbError } = await supabase.from("verification_codes").insert({
        email: email,
        code: verificationCode,
        expires_at: expiresAt,
        used: false,
      });

      if (dbError) {
        console.error('❌ Erro ao salvar código no banco:', dbError);
        throw dbError;
      }

      console.log('✅ Código salvo no banco:', verificationCode);

      // Enviar email via Resend
      if (RESEND_API_KEY && RESEND_API_KEY !== 'SEU_RESEND_API_KEY_AQUI') {
        const emailResponse = await fetch('https://api.resend.com/emails', {
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
                    <h1 style="margin: 0; font-size: 42px; letter-spacing: 10px; color: #000;">${verificationCode}</h1>
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

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('❌ Erro ao enviar email:', errorText);
          throw new Error(`Falha ao enviar email: ${errorText}`);
        }

        console.log('✅ Email enviado com sucesso!');

        Alert.alert(
          "Código Enviado! 📧",
          `Um código de verificação foi enviado para ${email}. Verifique sua caixa de entrada (e spam).`
        );
      } else {
        // API Key não configurada - modo desenvolvimento
        console.log('⚠️ RESEND_API_KEY não configurada - Código:', verificationCode);
        Alert.alert(
          "Modo Desenvolvimento",
          `Código de verificação (configure RESEND_API_KEY para enviar por email):\n\n${verificationCode}`,
        );
      }

    } catch (err) {
      console.error("❌ Erro ao enviar código:", err);
      Alert.alert("Erro", "Não foi possível enviar o código de verificação.");
    }
  }

  function handleCodeChange(text, index) {
    // Permitir apenas números
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length > 1) {
      // Se colar código completo
      const codes = numericText.split("").slice(0, 6);
      const newCode = [...code];
      codes.forEach((digit, i) => {
        if (i < 6) newCode[i] = digit;
      });
      setCode(newCode);

      // Focar no último campo preenchido
      const lastIndex = Math.min(codes.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    } else {
      // Digitar normalmente
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);

      // Mover para próximo campo
      if (numericText && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyCode() {
    const fullCode = code.join("");

    if (fullCode.length !== 6) {
      Alert.alert("Erro", "Por favor, digite o código completo.");
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Validando código...');

      // Verificar código no banco
      const { data: verificationData, error: verifyError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", fullCode)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verifyError || !verificationData) {
        console.log('❌ Código inválido ou expirado');
        Alert.alert("Erro", "Código inválido ou expirado.");
        setLoading(false);
        return;
      }

      console.log('✅ Código validado!');

      // Marcar código como usado
      await supabase
        .from("verification_codes")
        .update({ used: true })
        .eq("id", verificationData.id);

      // Fazer login usando o AuthContext e pulando a verificação de 2FA (pois já validamos aqui)
      console.log('🔑 Completando login...');
      const result = await login(phone, password, true);

      if (!result.success) {
        throw new Error(result.message);
      }

      console.log('✅ Login completo!');

      // Verificar se precisa mudar senha
      if (result.requirePasswordChange) {
        navigation.replace("ChangeScreen");
      }
      // Senão, o AuthStack redireciona automaticamente para Main

    } catch (err) {
      console.error("❌ Erro ao verificar:", err);
      Alert.alert("Erro", "Não foi possível verificar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setCode(["", "", "", "", "", ""]);

    await sendVerificationCode();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Ícone */}
        <View style={styles.iconContainer}>
          <Shield size={64} color="#fcd030" />
        </View>

        {/* Título */}
        <Text style={styles.title}>Verificação em 2 Etapas</Text>
        <Text style={styles.subtitle}>
          Digite o código de 6 dígitos enviado para {"\n"}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/* Campos de Código */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Botão Verificar */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={handleVerifyCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.verifyButtonText}>Verificar</Text>
          )}
        </TouchableOpacity>

        {/* Reenviar Código */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode}>
              <Text style={styles.resendText}>Reenviar código</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Reenviar código em {resendTimer}s
            </Text>
          )}
        </View>

        {/* Voltar */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Voltar para o login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  iconContainer: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },

  email: {
    fontWeight: "700",
    color: "#000",
  },

  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 8,
  },

  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
    backgroundColor: "#f9f9f9",
  },

  codeInputFilled: {
    borderColor: "#fcd030",
    backgroundColor: "#fff",
  },

  verifyButton: {
    backgroundColor: "#fcd030",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },

  verifyButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },

  verifyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  resendContainer: {
    alignItems: "center",
    marginBottom: 16,
  },

  resendText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fcd030",
  },

  timerText: {
    fontSize: 14,
    color: "#999",
  },

  backButton: {
    padding: 16,
    alignItems: "center",
  },

  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
});