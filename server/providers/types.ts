export type ProviderInput = { instructions: string; context: string; signal: AbortSignal }
export interface DialogueAdapter {
  mode: 'openai' | 'mock'
  ready: boolean
  generate(input: ProviderInput): Promise<string>
}
