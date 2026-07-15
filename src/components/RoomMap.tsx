import type { Space, SpaceId } from '../types'
import { Icon } from './Icon'

const coordinates: Record<SpaceId, { left: string; top: string; width: string; height: string }> = {
  IB101: { left: '35.7%', top: '31.4%', width: '10.2%', height: '12.2%' },
  IB102: { left: '45.8%', top: '31.4%', width: '10.2%', height: '12.2%' },
  IB103: { left: '45.8%', top: '43.5%', width: '10.2%', height: '11.3%' },
  IB104: { left: '45.8%', top: '54.5%', width: '10.2%', height: '11.3%' },
  IB105: { left: '46%', top: '68.3%', width: '10.4%', height: '11.8%' },
  IB106: { left: '46%', top: '79.7%', width: '10.4%', height: '11.6%' },
  IB107: { left: '35.7%', top: '79.7%', width: '10.4%', height: '11.6%' },
  IB108: { left: '35.7%', top: '68.3%', width: '10.4%', height: '11.8%' },
  IB111: { left: '15.2%', top: '42.4%', width: '15.6%', height: '18.1%' },
}

interface RoomMapProps {
  spaces: Space[]
  selected: SpaceId
  closedSpaces: Set<SpaceId>
  onSelect: (spaceId: SpaceId) => void
}

export function RoomMap({ spaces, selected, closedSpaces, onSelect }: RoomMapProps) {
  return (
    <section className="map-card" aria-labelledby="map-title">
      <div className="section-heading map-heading">
        <div>
          <span className="eyebrow"><Icon name="map" size={15} /> INTERACTIVE MAP</span>
          <h2 id="map-title">상상베이스 공간을 선택하세요</h2>
        </div>
        <div className="map-legend"><span><i className="dot available" />예약 가능</span><span><i className="dot selected" />선택됨</span><span><i className="dot closed" />이용 중지</span></div>
      </div>
      <div className="map-frame">
        <img src="/sangsang-base-map.png" alt="상상베이스 IB101부터 IB111까지의 공간 배치도" />
        {spaces.map((space) => {
          const isClosed = closedSpaces.has(space.id)
          return (
            <button
              key={space.id}
              className={`room-hotspot ${selected === space.id ? 'selected' : ''} ${isClosed ? 'closed' : ''}`}
              style={coordinates[space.id]}
              onClick={() => !isClosed && onSelect(space.id)}
              disabled={isClosed}
              aria-label={`${space.id} ${space.type}${isClosed ? ', 이용 중지' : ', 예약 공간 선택'}`}
            >
              <span>{space.id}</span>
              {selected === space.id && <i className="hotspot-check"><Icon name="check" size={11} /></i>}
            </button>
          )
        })}
      </div>
      <p className="map-help"><Icon name="info" size={15} /> 연두색 예약 공간을 클릭하면 해당 공간의 예약 가능 시간을 확인할 수 있습니다.</p>
    </section>
  )
}

