# SoloInvoice AI ⚡️

A minimalist mobile utility built with **React Native (Expo)** that transforms unstructured client chat messages into structured, ready-to-send invoices using the **Google Gemini API** (`gemini-3.6-flash`).

Designed for freelancers, independent contractors, and solo founders who manage deals directly in messengers.

---

## 📱 Features

- **Messy Chat to Structured Invoice:** Parses raw client messages (tasks, quantities, hourly rates, currencies, deadlines) in seconds.
- **LLM-Powered Data Extraction:** Uses Gemini 3.6 Flash with strict structured JSON output to eliminate manual data entry errors.
- **Clean Fintech UI:** Built with mobile-first usability, live calculations, and dark/light contrast badges.
- **One-Tap Export:** Quick-copy plain text format directly ready to paste back into Telegram, WhatsApp, or Slack.

---

## 🛠️ Tech Stack

- **Framework:** React Native / Expo
- **AI Model:** Google Gemini 3.6 Flash (`@google/genai`)
- **Language:** JavaScript (ES6+)
- **Styling:** React Native StyleSheet (custom design system)
- **Version Control:** Git & GitHub Desktop

---

## 🚀 Getting Started

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/loiousia/solo-invoice-ai.git
cd solo-invoice-ai
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
\`\`\`text
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`

### 4. Run the project
\`\`\`bash
# Web preview
npx expo start --web

# Mobile preview (Expo Go)
npx expo start
\`\`\`

---

## 📐 Architecture & Prompt Strategy

The application passes the raw text input directly to Gemini 3.6 Flash using a specialized system instruction. The model enforces strict JSON schema generation, bypassing unnecessary conversational markdown wrappers for deterministic client-side parsing.

---

## 📄 License
MIT