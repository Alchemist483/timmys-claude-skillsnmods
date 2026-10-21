export type Gist = string | null

declare module 'claude-code' {
  interface PluginState {
    gistit: { gist: Gist }
  }
}
