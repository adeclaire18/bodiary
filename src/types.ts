export type Tag = 'good' | 'bad' | 'confused'

export type XY = [number, number]

export type RecordItem = {
  id: string
  date: string // YYYY-MM-DD
  hour: number // 0..23
  tag: Tag
  note: string
  polygon: XY[]
  snapshot: string // base64 dataURL
}

