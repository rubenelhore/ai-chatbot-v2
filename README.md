# AI Document Chat - V2 (PostgreSQL + OpenAI + Vercel)

A modern AI-powered document chat application built with the latest tech stack. Upload documents (PDF, DOCX, TXT) and ask questions about their content using OpenAI's GPT-4.

## 🚀 Tech Stack

### V2 (This Version)
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (Vercel Postgres)
- **Auth**: Auth0
- **File Storage**: Vercel Blob Storage
- **AI**: OpenAI (GPT-4 Turbo + text-embedding-3-small)
- **Vector DB**: Pinecone
- **State Management**: Zustand
- **Deployment**: Vercel

### V1 (Previous Version - Firebase)
- Firebase Firestore, Firebase Auth, Firebase Storage, Firebase Functions
- Gemini AI

## 🎯 Features

- 🔐 Auth0 authentication with multiple providers
- 📄 Upload PDF, DOCX, and TXT files
- 🤖 Chat with your documents using OpenAI GPT-4
- 🔍 Semantic search with Pinecone vector database
- 💾 User-isolated data storage in PostgreSQL
- 🎨 Beautiful glassmorphism UI
- 📱 Responsive design
- ⚡ Real-time document processing status

## 📋 Prerequisites

1. **Vercel Account** - [vercel.com](https://vercel.com)
2. **Auth0 Account** - [auth0.com](https://auth0.com)
3. **OpenAI API Key** - [platform.openai.com](https://platform.openai.com)
4. **Pinecone Account** - [pinecone.io](https://pinecone.io)

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
cd ai-chatbot-v2
npm install
```

### 2. Set Up Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application or select existing
3. Choose **Regular Web Application**
4. Go to **Settings** tab
5. Configure the following:
   - **Allowed Callback URLs**:
     - `http://localhost:3000/api/auth/callback` (local)
     - `https://your-domain.vercel.app/api/auth/callback` (production)
   - **Allowed Logout URLs**:
     - `http://localhost:3000` (local)
     - `https://your-domain.vercel.app` (production)
6. Copy the following values:
   - **Domain** (e.g., `your-tenant.auth0.com`)
   - **Client ID**
   - **Client Secret**
7. (Optional) Enable additional social connections (Google, GitHub, etc.) in **Authentication** → **Social**

### 3. Generate Auth0 Secret

Generate a secure random string for `AUTH0_SECRET`:

```bash
openssl rand -hex 32
```

### 4. Set Up OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy the key (starts with `sk-`)

### 5. Set Up Pinecone

1. Go to [Pinecone](https://app.pinecone.io/)
2. Create a new index:
   - **Name**: `document-chatbot`
   - **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
   - **Metric**: `cosine`
3. Copy your API key

### 6. Set Up Vercel Postgres

#### Option A: Using Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. In project settings, go to **Storage**
4. Create **Postgres** database
5. Vercel will automatically set environment variables
6. Run the schema:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Pull environment variables
vercel env pull

# Connect to your database and run schema
vercel env pull .env.local
# Then use a Postgres client to run lib/db/schema.sql
```

#### Option B: Local Development

```bash
# Install PostgreSQL locally
brew install postgresql # macOS
# or download from postgresql.org

# Create database
createdb ai_chatbot_v2

# Run schema
psql ai_chatbot_v2 < lib/db/schema.sql
```

### 7. Set Up Vercel Blob Storage

1. In Vercel project, go to **Storage**
2. Create **Blob** storage
3. Vercel will automatically set `BLOB_READ_WRITE_TOKEN`

### 8. Configure Environment Variables

Create `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all the values from previous steps.

### 9. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment to Vercel

1. Push code to GitHub
2. Import to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically:
- Provide PostgreSQL database
- Provide Blob storage
- Set up environment variables
- Deploy your app

## 📁 Project Structure

```
ai-chatbot-v2/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth.js routes
│   │   ├── chat/                # Chat API
│   │   └── documents/           # Document CRUD APIs
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   └── providers.tsx            # Context providers
├── lib/
│   ├── db/
│   │   ├── schema.sql           # PostgreSQL schema
│   │   └── index.ts             # Database functions
│   ├── hooks/
│   │   └── useDocuments.ts      # Document management hook
│   ├── stores/
│   │   └── chatStore.ts         # Chat state management
│   ├── ai.ts                    # OpenAI & Pinecone integration
│   ├── auth.ts                  # NextAuth configuration
│   └── document-processor.ts    # Text extraction utilities
├── types/
│   └── next-auth.d.ts           # TypeScript definitions
└── .env.example                 # Environment variables template
```

## 🔑 Key Differences from V1 (Firebase)

| Feature | V1 (Firebase) | V2 (Vercel Stack) |
|---------|---------------|-------------------|
| Database | Firestore | PostgreSQL |
| Auth | Firebase Auth | Auth0 |
| Storage | Firebase Storage | Vercel Blob |
| Backend | Cloud Functions | API Routes |
| AI | Gemini | OpenAI GPT-4 |
| Deployment | Firebase Hosting | Vercel |

## 💡 How It Works

1. **Authentication**: Users sign in through Auth0 (supports multiple providers like Google, GitHub, email/password, etc.)
2. **Document Upload**:
   - File uploaded to Vercel Blob Storage
   - Metadata saved to PostgreSQL
   - Document queued for processing
3. **Document Processing**:
   - Text extracted from PDF/DOCX/TXT
   - Text split into chunks
   - OpenAI generates embeddings for each chunk
   - Embeddings stored in Pinecone (user-isolated namespace)
4. **Chat**:
   - User selects documents and asks question
   - Question embedded with OpenAI
   - Semantic search in Pinecone finds relevant chunks
   - GPT-4 generates answer based on context
   - Response saved to PostgreSQL

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Build
npm run build
```

## 📝 Environment Variables

See `.env.example` for all required variables.

## 🤝 Contributing

This is a learning project showcasing modern full-stack development with:
- PostgreSQL for relational data
- Vercel's serverless infrastructure
- OpenAI's latest models
- Production-ready authentication

## 📄 License

MIT

## 🙏 Acknowledgments

- Built as a migration from Firebase to Vercel stack
- Demonstrates real-world full-stack development
- Great portfolio piece for junior/mid-level developers
