# Breakitdown

A web application that helps you break down ideas into actionable concepts using AI. Type or speak your idea, and Breakitdown will decompose it into high-level concepts that you can further refine, organize, and export.

## Features

- **AI-Powered Breakdown**: Uses OpenAI to intelligently break down ideas into structured concepts
- **Voice Input**: Speak your ideas using browser's built-in speech recognition
- **Interactive CRUD**: Create, read, update, and delete concepts
- **Recursive Breakdown**: Break down concepts into sub-concepts at any level
- **Completion Tracking**: Mark concepts as complete to track progress
- **Document Generation**: Export your breakdowns as Markdown, JSON, or YAML
- **Persistent Storage**: Projects are saved locally using IndexedDB

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- One of:
  - OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
  - An OpenAI-compatible endpoint (self-hosted / vLLM / litellm / etc.)
  - Ollama (local)

### Installation

1. Clone or navigate to the project directory:
```bash
cd breakitdown
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your LLM in `.env` (choose one):

OpenAI:
```bash
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o
```

OpenAI-compatible (self-hosted):
```bash
# Example:
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_MODEL=gpt-4o-mini
```

Ollama (local):
```bash
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b
```

Mock (no network; great for demos/tests):
```bash
USE_MOCK_LLM=true
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Optional smoke test (app must be running):
```bash
node scripts/smoke.mjs
```

### Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Testing

Run tests:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Usage

1. **Start a Project**: Enter a project name and your idea
2. **Break It Down**: Click the "Break It Down" button to generate concepts
3. **Refine Concepts**: Edit, delete, or mark concepts as complete
4. **Go Deeper**: Click "Break Down" on any concept to decompose it further
5. **Generate Documents**: Once all concepts are complete, generate Markdown, JSON, or YAML exports

## Project Structure

```
breakitdown/
├── components/          # Vue components
│   ├── IdeaInput.vue
│   ├── BreakItDownButton.vue
│   ├── ConceptCard.vue
│   ├── ConceptTree.vue
│   └── DocumentGenerator.vue
├── composables/        # Vue composables
│   ├── useAI.ts
│   ├── useStorage.ts
│   └── useSpeech.ts
├── stores/             # Pinia stores
│   └── project.ts
├── server/             # Server API routes
│   └── api/
│       └── breakdown.post.ts
├── types/              # TypeScript types
│   └── index.ts
├── assets/             # Static assets
│   └── css/
│       └── main.css
└── app.vue             # Main app component
```

## Tech Stack

- **Framework**: Nuxt 3
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Storage**: IndexedDB (via idb)
- **AI**: OpenAI API
- **Testing**: Vitest + Vue Test Utils

## License

MIT
