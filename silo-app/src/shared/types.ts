export interface Game {
  id: string
  name: string
  url: string
  icon?: string
  created_at: number
}

export interface Environment {
  id: string
  game_id: string
  name: string
  partition: string
  proxy?: string | null
  created_at: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}
