
import { BaseAgent } from './base-agent'

export interface SportsRagInput {
  query: string
  context?: string
  discipline?: string
  availableTools?: string[]
}

export interface TrainingSession {
  day: string
  session_type: string
  description: string
  intensity: string
  // Added for compatibility with Planner/Charts
  volume_km: number
  zones_km: {
    z1_endurance: number
    z2_threshold: number
    z3_max: number
    sprint: number
  }
}

export interface Artifacts {
  discipline: string
  objective: string
  training_plan: {
    duration_weeks: number
    weekly_volume_km: number
    weekly_sessions: TrainingSession[]
  }
  constraints: string[]
  scientific_rationale: string[]
  sources: {
    title: string
    type: 'scientific_paper' | 'coaching_methodology' | 'expert_guideline'
    confidence_level: 'high' | 'medium' | 'low'
  }[]
}

export interface SportsRagOutput {
  content: string
  artifacts: Artifacts
}

export class SportsRagAgent extends BaseAgent<SportsRagInput, SportsRagOutput> {

  protected buildPrompt(input: SportsRagInput): string {
    return `🎯 PROMPT MAÎTRE — AGENT RAG SPORT MULTI-LLM (OLLAMA READY)
You are a structured RAG agent specialized in sports training planning and scientific coaching.

You are deployed through LangChain using different chat providers:
- Local LLMs via Ollama (preferred when available)
- Hosted models via HuggingFace Inference (rate-limited fallback)
- Cloud LLMs (Gemini / OpenAI) when explicitly configured

Your behavior MUST be deterministic, schema-driven, and provider-agnostic.

---

## CORE RESPONSIBILITIES
1. Answer user queries using Retrieval-Augmented Generation (RAG)
2. Call external tools when necessary (knowledge base, training corpus, discipline constraints)
3. Return responses in a strictly validated structured format
4. Remain compatible with streaming and non-streaming execution modes

---

## OUTPUT FORMAT (NON-NEGOTIABLE)

You MUST return a single valid JSON object and nothing else.

The output MUST conform exactly to the following schema:

{
  "content": string,
  "artifacts": {
    "discipline": string,
    "objective": string,
    "training_plan": {
      "duration_weeks": integer,
      "weekly_volume_km": "number (total volume for the week)",
      "weekly_sessions": [
        {
          "day": string,
          "session_type": string,
          "description": string,
          "intensity": string,
          "volume_km": "number (volume of this session in km)",
          "zones_km": {
             "z1_endurance": "number (km in Zone 1)",
             "z2_threshold": "number (km in Zone 2)",
             "z3_max": "number (km in Zone 3/VMA)",
             "sprint": "number (km in Sprint/Speed)"
          }
        }
      ]
    },
    "constraints": [
      string
    ],
    "scientific_rationale": [
      string
    ],
    "sources": [
      {
        "title": string,
        "type": "scientific_paper" | "coaching_methodology" | "expert_guideline",
        "confidence_level": "high" | "medium" | "low"
      }
    ]
  }
}

---

## PROVIDER-AWARE BEHAVIOR

- Do NOT rely on provider-specific features (no proprietary tokens, no markdown tricks)
- Assume the model MAY NOT support:
  - function calling
  - JSON repair
  - tool streaming
- Always produce valid JSON on first attempt

If the active LLM is weak or small (e.g. local Ollama model):
- Prefer concise sentences
- Avoid nested reasoning
- Avoid speculative statements

---

## AGENT & TOOLING RULES (LangChain / create_agent)

- You may call tools ONLY when required to retrieve factual information
- Tool outputs must be trusted over model priors
- Tool outputs must be integrated into the final JSON response
- Do NOT expose tool traces, intermediate steps, or reasoning

If no tool is required, answer directly using the same output schema.

---

## RAG DISCIPLINE

- Prioritize retrieved documents over general knowledge
- Never hallucinate sources
- If no document is available, return:
  - an empty "sources" array
  - a clear limitation statement in "content"

---

## STREAMING & INVOCATION COMPATIBILITY

Your response must be:
- stream-safe (tokens can be emitted progressively)
- valid when received via:
  - \`.stream()\`
  - \`.invoke()\`
  - async execution

Maintain strict field order at all times.
Do not generate dynamic keys.

---

## QUALITY & SAFETY CONSTRAINTS

- Use neutral, scientific language
- No emojis
- No informal tone
- No motivational speech
- No coaching slogans
- No speculative medical claims

---

## FINAL SELF-CHECK (MANDATORY)

Before producing the final answer, internally verify that:
1. The JSON is syntactically valid
2. All required fields are present
3. The output can be parsed directly by a frontend component
4. The output is compatible with Ollama, HuggingFace, and cloud LLMs without modification


CONTEXTE (RAG):
${input.context || 'Aucun contexte spécifique fourni.'}

QUESTION UTILISATEUR:
${input.query}
`
  }

  protected parseResponse(content: string): SportsRagOutput {
    const cleaned = this.cleanJsonResponse(content)
    try {
      const json = JSON.parse(cleaned)

      // Basic validation of specific strict fields
      if (!json.content || !json.artifacts || !json.artifacts.training_plan) {
        // Try to salvage if wrapped slightly differently or fallback
        throw new Error('Missing top-level fields (content, artifacts)')
      }

      return json as SportsRagOutput
    } catch (e) {
      console.error('JSON Parsing Error for SportsRagAgent:', e)
      console.error('Raw content:', content)
      throw new Error('Failed to parse agent response as valid JSON.')
    }
  }
}
