export type Files = readonly string[]

declare module 'claude-code' {
  interface PluginState {
    heatmeter: { percent: number | null; files: Files; startedAt: number | null }
  }
}
