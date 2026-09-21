import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { GoogleGenAI } from '@google/genai';

// Инициализация Gemini API с ключом из окружения
const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

export default function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const generateInvoice = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: inputText,
        config: {
          systemInstruction: `Ты — финансовый ассистент для фрилансеров. 
Извлеки из сырого текста переписки детали заказа и верни СТРОГО чистый JSON без markdown (без \`\`\`json).

Схема:
{
  "client_name": string,
  "currency": string,
  "items": [
    { "description": string, "quantity": number, "unit_price": number, "total": number }
  ],
  "total_amount": number,
  "deadline": string or null
}`,
        }
      });

      const rawText = response.text.trim();
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      setInvoiceData(parsed);
    } catch (error) {
      console.error(error);
      alert('Ошибка парсинга. Проверь API ключ или текст.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>SoloInvoice AI ⚡️</Text>
      <Text style={styles.subtitle}>Вставь переписку с клиентом — получи счет</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Например: Клиент ООО Ромашка, нужно сделать дизайн лендинга за 200$ до пятницы..."
        value={inputText}
        onChangeText={setInputText}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={generateInvoice}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Сгенерировать инвойс ✨</Text>
        )}
      </TouchableOpacity>

      {invoiceData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Клиент: {invoiceData.client_name}</Text>
          <Text style={styles.meta}>Дедлайн: {invoiceData.deadline || 'Не указан'}</Text>
          <View style={styles.divider} />

          {invoiceData.items?.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.itemDesc}>{item.description} (x{item.quantity})</Text>
              <Text style={styles.itemPrice}>{item.total} {invoiceData.currency}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Итого к оплате:</Text>
            <Text style={styles.totalAmount}>{invoiceData.total_amount} {invoiceData.currency}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: '#f8fafc', minHeight: '100%' },
  header: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemDesc: { fontSize: 14, color: '#334155', flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#16a34a' },
});