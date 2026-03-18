# GenAI Video Evaluator


High-fidelity quality assurance for AI-generated video. Multi-agent evaluation powered by Google Gemini (ADK Agents). Detects object permanence violations, physics errors, and temporal inconsistencies.

## Features

- **ADK Multi-Agent Evaluation**: Specialized Physics, Object Permanence, and Temporal Consistency agents.
- **Negative Bias Prompting**: Engineered to be professionally suspicious of AI artifacts.
- **Prompt-to-Prompt Regeneration**: Analyzes failures to generate corrective prompts for Google Veo.
- **Visual Artifact Detection**: Identifies flickering, morphing, and physical implausibility.
- **Premium UI**: Modern, responsive dashboard with interactive timelines and coherence scoring.

## Tech Stack

- **Intelligence**: Google Gemini 1.5 Pro & 2.0 Flash
- **Video Generation**: Google Veo 3.x
- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd genai-video-evaluator
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure Environment:
   Use the in-app settings (⚙️) to provide your **Google Gemini API Key**.

4. Start Development Server:
   ```sh
   npm run dev
   ```

## Documentation

For a deep dive into the architecture and ADK agent logic, see:
- [Developer Guide (HTML)](./developer_guide.html)
- [AI Engineering & Prompt Architecture](./ai_engineering_guide.html)
- [Project Documentation (HTML)](./documentation.html)

## License

MIT
