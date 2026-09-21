import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { GoogleGenAI } from '@google/genai';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });
const STORAGE_KEY = '@solo_invoices_history_v1';

const PRESETS = [
  {
    label: '🎨 Дизайн',
    text: 'Клиент OOO Студия. Разработать UI-кит за 250$ и 3 иконки по 20$. Срок до пятницы.'
  },
  {
    label: '💻 Разработка',
    text: 'Заказчик ИП Смирнов. Верстка лендинга 400$ и интеграция формы заявок 120$. Дедлайн 10 октября.'
  },
  {
    label: '✍️ Копирайтинг',
    text: 'Для проекта FinTech App: 4 статьи для блога по 50$ каждая. Срок сдачи — вторник.'
  }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Ошибка загрузки истории:', e);
    }
  };

  const saveInvoiceToHistory = async (newInvoice) => {
    try {
      const itemWithId = {
        ...newInvoice,
        id: Date.now().toString(),
        createdAt: new Date().toLocaleDateString('ru-RU')
      };
      const updated = [itemWithId, ...history.slice(0, 9)];
      setHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  const generateInvoice = async (textToProcess = inputText) => {
    const query = textToProcess.trim();
    if (!query) return;
    setLoading(true);
    setCopied(false);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: query,
        config: {
          systemInstruction: `Ты — финансовый ассистент для фрилансеров. 
Извлеки из текста переписки детали заказа и верни СТРОГО чистый JSON без markdown.

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
      await saveInvoiceToHistory(parsed);
    } catch (error) {
      console.error(error);
      alert('Ошибка генерации. Проверь текст или API-ключ.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetText) => {
    setInputText(presetText);
    generateInvoice(presetText);
  };

  const copyToClipboard = () => {
    if (!invoiceData) return;
    const lines = [
      `Счет для: ${invoiceData.client_name}`,
      `Дедлайн: ${invoiceData.deadline || 'По договоренности'}`,
      '---',
      ...invoiceData.items.map(i => `${i.description} x${i.quantity} = ${i.total} ${invoiceData.currency}`),
      '---',
      `Итого к оплате: ${invoiceData.total_amount} ${invoiceData.currency}`
    ].join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Скопировано:\n\n' + lines);
    }
  };

  const generatePdf = async (customInvoice = invoiceData) => {
    const target = customInvoice || invoiceData;
    if (!target) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Инвойс - ${target.client_name}</title>
          <style>
            @page { margin: 20mm; size: auto; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              color: #0f172a; 
              margin: 0;
              padding: 24px;
              background: #ffffff;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: baseline;
              border-bottom: 2px solid #0f172a; 
              padding-bottom: 16px; 
              margin-bottom: 24px;
            }
            .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
            .deadline { font-size: 14px; font-weight: 600; color: #475569; }
            .section { margin-bottom: 24px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .client-name { font-size: 18px; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { 
              text-align: left; 
              padding: 10px 8px; 
              font-size: 11px; 
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b; 
              border-bottom: 1px solid #cbd5e1; 
            }
            td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; }
            .right { text-align: right; }
            .total-container { margin-top: 32px; display: flex; justify-content: flex-end; }
            .total-box { min-width: 200px; text-align: right; border-top: 2px solid #0f172a; padding-top: 12px; }
            .total-label { font-size: 13px; color: #64748b; font-weight: 600; }
            .total-amount { font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">INVOICE</div>
            <div class="deadline">Срок оплаты: ${target.deadline || 'По согласованию'}</div>
          </div>

          <div class="section">
            <div class="label">Получатель счёта:</div>
            <div class="client-name">${target.client_name}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Наименование услуги</th>
                <th class="right">Кол-во</th>
                <th class="right">Цена</th>
                <th class="right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${target.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="right">${item.quantity}</td>
                  <td class="right">${item.unit_price}${target.currency}</td>
                  <td class="right"><b>${item.total}${target.currency}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-container">
            <div class="total-box">
              <div class="total-label">Итого к оплате:</div>
              <div class="total-amount">${target.total_amount} ${target.currency}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    if (typeof window !== 'undefined' && window.document) {
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 300);
        return;
      }
    }

    try {
      await Print.printAsync({ html: htmlContent });
    } catch (e) {
      console.error(e);
      alert('Не удалось сформировать PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Хедер */}
        <View style={styles.headerBox}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>AI Utility</Text>
          </View>
          <Text style={styles.title}>SoloInvoice</Text>
          <Text style={styles.subtitle}>
            Превращай переписку из чатов в аккуратный счет за секунды.
          </Text>
        </View>

        {/* Быстрые пресеты */}
        <Text style={styles.presetsTitle}>Быстрые примеры:</Text>
        <View style={styles.presetsRow}>
          {PRESETS.map((p, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.presetChip}
              onPress={() => handleSelectPreset(p.text)}
            >
              <Text style={styles.presetChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Поле ввода */}
        <View style={styles.cardInputContainer}>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Вставь сюда сырое сообщение от заказчика..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]} 
            onPress={() => generateInvoice()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Сформировать счет →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Результат текущей генерации */}
        {invoiceData && (
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View>
                <Text style={styles.invoiceLabel}>ТЕКУЩИЙ СЧЕТ</Text>
                <Text style={styles.clientName}>{invoiceData.client_name}</Text>
              </View>
              {invoiceData.deadline && (
                <View style={styles.deadlineContainer}>
                  <Text style={styles.deadlineLabel}>Срок: {invoiceData.deadline}</Text>
                </View>
              )}
            </View>

            <View style={styles.line} />

            <View style={styles.itemsList}>
              {invoiceData.items?.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemTitle}>{item.description}</Text>
                    <Text style={styles.itemQty}>{item.quantity} × {item.unit_price} {invoiceData.currency}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{item.total} {invoiceData.currency}</Text>
                </View>
              ))}
            </View>

            <View style={styles.line} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого к оплате</Text>
              <Text style={styles.totalSum}>
                {invoiceData.total_amount} {invoiceData.currency}
              </Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.pdfBtn]}
                onPress={() => generatePdf(invoiceData)}
              >
                <Text style={styles.pdfBtnText}>📄 Сохранить PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.copyBtn, copied && styles.copyBtnActive]}
                onPress={copyToClipboard}
              >
                <Text style={[styles.copyBtnText, copied && styles.copyBtnTextActive]}>
                  {copied ? '✓ Скопировано' : '📋 Копировать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Блок сохраненной истории */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>История счетов ({history.length})</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Очистить</Text>
              </TouchableOpacity>
            </View>

            {history.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.historyItem}
                onPress={() => setInvoiceData(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyClient}>{item.client_name}</Text>
                  <Text style={styles.historyMeta}>
                    {item.createdAt} • {item.items?.length || 0} поз.
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyTotal}>{item.total_amount} {item.currency}</Text>
                  <Text style={styles.historyOpenHint}>Открыть →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 20, paddingBottom: 60, maxWidth: 640, alignSelf: 'center', width: '100%' },
  headerBox: { marginBottom: 14, marginTop: 10 },
  tag: {
    backgroundColor: '#e0e7ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  tagText: { color: '#4338ca', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 4, lineHeight: 22 },
  
  presetsTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  presetChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipText: { fontSize: 13, color: '#334155', fontWeight: '500' },

  cardInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    height: 100,
    fontSize: 15,
    color: '#1e293b',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 28,
  },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  clientName: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  deadlineContainer: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deadlineLabel: { fontSize: 12, fontWeight: '600', color: '#b45309' },
  line: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  itemsList: { gap: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemMeta: { flex: 1, paddingRight: 10 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
  itemQty: { fontSize: 13, color: '#64748b', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#475569' },
  totalSum: { fontSize: 24, fontWeight: '800', color: '#0f172a' },

  actionsContainer: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  pdfBtn: { backgroundColor: '#2563eb' },
  pdfBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  copyBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  copyBtnActive: { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' },
  copyBtnText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  copyBtnTextActive: { color: '#065f46' },

  historySection: { marginTop: 8 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  clearHistoryText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  historyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyClient: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  historyMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  historyTotal: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  historyOpenHint: { fontSize: 11, color: '#2563eb', marginTop: 2 },
});