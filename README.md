# AEGIS Video Evaluator

AI-Generated Video Quality Analysis. Multi-agent evaluation powered by Google Gemini. Detects object permanence violations, physics errors, and temporal inconsistencies.

## Features

- **Multi-Agent Evaluation**: Visionary, Critic, Executor, and Writer agents working together.
- **Visual Artifact Detection**: Identifies flickering, morphing, and physical implausibility.
- **Regeneration with Veo**: Integrated video generation to fix detected issues.
- **Premium UI**: Modern, responsive dashboard with interactive charts and overlays.

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React
- **Evaluation**: Google Gemini API
- **Generation**: Google Veo API

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd reality-check-engine
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure Environment:
   Create a `.env` file or use the in-app settings (⚙️) to provide your Google Gemini API Key.

4. Start Development Server:
   ```sh
   npm run dev
   ```

## License

MIT
