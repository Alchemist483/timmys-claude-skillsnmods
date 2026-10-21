export type Gist = string | null
export type Files = readonly string[]

declare module 'claude-code' {
  interface PluginState {
    gistit: { gist: Gist; percent: number | null; files: Files; startedAt: number | null }
  }
}
