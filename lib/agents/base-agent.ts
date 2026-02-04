/**
 * Base Agent class for LLM-powered agents
 * Uses LLM provider abstraction (Vertex AI or Mistral) with retry logic and JSON parsing
 */

import { generateCompletion } from '../llm-provider'

export interface AgentResponse<T> {
    success: boolean
    data?: T
    error?: string
    rawResponse?: string
}

export interface AgentConfig {
    name: string
    model?: string
    temperature?: number
    maxTokens?: number
    maxRetries?: number
}

export abstract class BaseAgent<TInput, TOutput> {
    protected config: Required<AgentConfig>

    constructor(config: AgentConfig) {
        this.config = {
            name: config.name,
            model: config.model || 'gemini-1.5-flash',
            temperature: config.temperature ?? 0.5,
            maxTokens: config.maxTokens || 2000,
            maxRetries: config.maxRetries || 2,
        }
    }

    /**
     * Build the prompt for this agent - must be implemented by subclasses
     */
    protected abstract buildPrompt(input: TInput): string

    /**
     * Validate and parse the response - must be implemented by subclasses
     */
    protected abstract parseResponse(content: string): TOutput

    /**
     * Execute the agent with the given input
     */
    async execute(input: TInput): Promise<AgentResponse<TOutput>> {
        const prompt = this.buildPrompt(input)

        let lastError: Error | null = null

        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const content = await generateCompletion(
                    [{ role: 'user', content: prompt }],
                    {
                        model: this.config.model,
                        temperature: this.config.temperature,
                        maxTokens: this.config.maxTokens,
                    }
                )

                if (!content) {
                    throw new Error('No content in response')
                }

                // Clean and parse JSON
                const cleanedContent = this.cleanJsonResponse(content)
                const parsed = this.parseResponse(cleanedContent)

                console.log(`[${this.config.name}] Success on attempt ${attempt + 1}`)

                return { success: true, data: parsed, rawResponse: content }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`[${this.config.name}] Attempt ${attempt + 1} failed:`, lastError.message)

                if (attempt < this.config.maxRetries - 1) {
                    await this.delay(1000 * (attempt + 1))
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'All attempts failed',
        }
    }

    /**
     * Clean JSON response from LLM (remove comments, trailing commas, markdown)
     */
    protected cleanJsonResponse(content: string): string {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/)
        let json = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content

        // Remove comments
        json = json
            .replace(/,\s*\/\/[^\n]*/g, ',')
            .replace(/:\s*([^",\[\{][^,\n]*?)\s*\/\/[^\n]*/g, ': $1')
            .replace(/\/\/[^\n]*\n/g, '\n')
            // Remove trailing commas
            .replace(/,\s*([}\]])/g, '$1')

        return json.trim()
    }

    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
