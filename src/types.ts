export type SpaceId =
  | 'IB101'
  | 'IB102'
  | 'IB103'
  | 'IB104'
  | 'IB105'
  | 'IB106'
  | 'IB107'
  | 'IB108'
  | 'IB111'

export type Page = 'spaces' | 'reservations' | 'admin' | 'login'

export interface Space {
  id: SpaceId
  name: string
  type: string
  capacity: number
  amenity: string
}

export interface Reservation {
  id: string
  spaceId: SpaceId
  date: string
  start: string
  end: string
  purpose: string
  status: 'upcoming' | 'completed' | 'cancelled'
  userName: string
  userEmail: string
}

