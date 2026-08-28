export type GameProxyMode = 'inherit' | 'smart' | 'full'

export interface Game {
  id: string
  name: string
  url: string
  icon?: string
  proxy_mode?: GameProxyMode | null
  created_at: number
}

export interface SmartProxySettings {
  smartProxyEnabled: boolean
}

export interface Environment {
  id: string
  name: string
  partition: string
  proxy?: string | null
  account_hint?: string | null
  created_at: number
}

export interface ProxyMetadata {
  id: string
  label: string
  protocol: 'socks5' | 'socks4' | 'http'
  host: string
  port: string
  color: string
  authenticated: boolean
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}
