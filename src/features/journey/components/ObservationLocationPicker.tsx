import { useEffect, useRef, useState } from 'react';
import { AMAP_API_KEY } from '../../../app/config';
import { CAMPUS_SEARCH, distanceFromCampus } from '../../../app/config/map';
import type { GeoCoordinates } from '../../../types';
import { loadAmap } from './AmapCampusMap';

export function isValidObservationLocation(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

interface Props {
  coordinates: GeoCoordinates;
  onConfirm: (coordinates: GeoCoordinates) => void;
  onPlaceSelect?: (place: { name: string; amapPoiId?: string }) => void;
  onChange?: () => void;
  isConfirmed?: boolean;
}

/** 编辑的是本条观察的位置，不写入公共地点坐标；数值输入同时提供键盘/断网入口。 */
export function ObservationLocationPicker({ coordinates, onConfirm, onPlaceSelect, onChange, isConfirmed = false }: Props) {
  const [lng, setLng] = useState(coordinates.lng?.toString() ?? '');
  const [lat, setLat] = useState(coordinates.lat?.toString() ?? '');
  const [status, setStatus] = useState(AMAP_API_KEY ? '正在加载选点地图…' : '未配置地图 Key，可手动输入 GCJ-02 经纬度。');
  const [saved, setSaved] = useState(isConfirmed);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; id?: string; address?: string; lng: number; lat: number; distance: number }>>([]);
  const [searchStatus, setSearchStatus] = useState('');
  const requestRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const initial = useRef(coordinates);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valid = lng.trim() !== '' && lat.trim() !== '' && isValidObservationLocation(Number(lng), Number(lat));

  useEffect(() => {
    if (!AMAP_API_KEY) return;
    let cancelled = false;
    let map: any;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      map?.destroy();
      mapRef.current = null; markerRef.current = null;
      setStatus('选点地图加载超时，可手动输入 GCJ-02 经纬度。');
    }, 8000);
    loadAmap().then((AMap) => {
      if (cancelled || !containerRef.current) return;
      const center = [initial.current.lng ?? CAMPUS_SEARCH.center[0], initial.current.lat ?? CAMPUS_SEARCH.center[1]];
      map = new AMap.Map(containerRef.current, { center, zoom: 19, viewMode: '2D' });
      const marker = new AMap.Marker({ position: center, draggable: true });
      map.add(marker); mapRef.current = map; markerRef.current = marker;
      const pick = (event: any) => {
        if (cancelled) return;
        const position = event.lnglat ?? marker.getPosition();
        const nextLng = Number(position?.getLng?.() ?? position?.lng);
        const nextLat = Number(position?.getLat?.() ?? position?.lat);
        if (!isValidObservationLocation(nextLng, nextLat)) return;
        marker.setPosition([nextLng, nextLat]);
        setLng(nextLng.toFixed(6)); setLat(nextLat.toFixed(6)); setSaved(false);
        onChangeRef.current?.();
      };
      map.on('click', pick); marker.on('dragend', pick);
      map.on('complete', () => {
        if (cancelled) return;
        window.clearTimeout(timer);
        setStatus('点击地图或拖动图钉，定位到具体入口或设施，再确认位置。');
      });
    }).catch(() => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setStatus('选点地图加载失败，可手动输入 GCJ-02 经纬度。');
    });
    return () => {
      requestRef.current += 1;
      cancelled = true; window.clearTimeout(timer); map?.destroy();
      mapRef.current = null; markerRef.current = null;
    };
  }, []);

  async function search() {
    if (!query.trim() || !AMAP_API_KEY) return;
    const request = ++requestRef.current;
    setResults([]); setSearchStatus(`正在搜索${CAMPUS_SEARCH.label}…`);
    try {
      const AMap = await loadAmap();
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('timeout')), 6000);
        AMap.plugin('AMap.PlaceSearch', () => { window.clearTimeout(timer); resolve(); });
      });
      const pois = await new Promise<any[]>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('timeout')), 6000);
        new AMap.PlaceSearch({ pageSize: 6, extensions: 'base', city: CAMPUS_SEARCH.city, citylimit: true }).searchNearBy(query.trim(), CAMPUS_SEARCH.center, CAMPUS_SEARCH.radiusMeters, (status: string, result: any) => {
          window.clearTimeout(timer);
          resolve(status === 'complete' ? result?.poiList?.pois ?? [] : []);
        });
      });
      if (request !== requestRef.current) return;
      const matches = pois.map((poi) => ({ name: poi.name, id: poi.id, address: [poi.cityname, poi.adname, poi.address].filter((part) => typeof part === 'string' && part).join(' · '),
        lng: Number(poi.location?.getLng?.() ?? poi.location?.lng), lat: Number(poi.location?.getLat?.() ?? poi.location?.lat) }))
        .filter((poi) => isValidObservationLocation(poi.lng, poi.lat))
        .map((poi) => ({ ...poi, distance: distanceFromCampus(poi.lng, poi.lat) }))
        .filter((poi) => poi.distance <= CAMPUS_SEARCH.radiusMeters)
        .sort((a, b) => a.distance - b.distance);
      setResults(matches); setSearchStatus(matches.length ? `找到 ${matches.length} 个附近地点，请选择后微调位置并确认。` : `${CAMPUS_SEARCH.label}内未找到结果，可直接地图选点并填写地点名称。`);
    } catch { if (request === requestRef.current) setSearchStatus('搜索暂不可用，可直接地图选点或输入坐标。'); }
  }

  return <div className="observation-location-picker">
    {onPlaceSelect && <><label className="publish-field">搜索校园附近地点<input value={query} placeholder="例如：瑞幸咖啡、第二学生餐厅" onChange={(event) => { setQuery(event.target.value); requestRef.current += 1; setResults([]); setSearchStatus(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} /></label>
      <p className="publish-muted">搜索范围：深圳 · {CAMPUS_SEARCH.label}，按距校园中心的距离排序。</p>
      <button type="button" className="ghost-button" disabled={!query.trim() || !AMAP_API_KEY} onClick={() => void search()}>搜索地点</button>
      <p role="status">{searchStatus || (!AMAP_API_KEY ? '未配置地图 Key，仍可填写名称和坐标。' : '')}</p>
      <ul className="observation-location-results">{results.map((poi, index) => <li key={poi.id ?? index}><button type="button" className="ghost-button" onClick={() => {
        setLng(poi.lng.toFixed(6)); setLat(poi.lat.toFixed(6)); setSaved(false);
        onChangeRef.current?.();
        markerRef.current?.setPosition([poi.lng, poi.lat]); mapRef.current?.setCenter([poi.lng, poi.lat]);
        onPlaceSelect({ name: poi.name, amapPoiId: poi.id });
      }}>{poi.name}{poi.address ? ` · ${poi.address}` : ''} · 距校园中心 {poi.distance < 1000 ? `${Math.round(poi.distance)} 米` : `${(poi.distance / 1000).toFixed(1)} 公里`}</button></li>)}</ul></>}
    <p role="status">{status}</p>
    {AMAP_API_KEY && <div ref={containerRef} className="observation-location-picker__map" role="region" aria-label="观察位置选点地图，可使用下方经纬度输入完成键盘选点" />}
    <div className="publish-row">
      <label className="publish-field">观察经度（GCJ-02）<input type="number" step="0.000001" min="-180" max="180" value={lng} onChange={(e) => { setLng(e.target.value); setSaved(false); onChange?.(); }} /></label>
      <label className="publish-field">观察纬度（GCJ-02）<input type="number" step="0.000001" min="-90" max="90" value={lat} onChange={(e) => { setLat(e.target.value); setSaved(false); onChange?.(); }} /></label>
    </div>
    <button type="button" className="ghost-button" disabled={!valid} onClick={() => {
      if (!valid) return;
      const next = { ...coordinates, lng: Number(lng), lat: Number(lat) };
      markerRef.current?.setPosition([next.lng, next.lat]);
      mapRef.current?.setCenter([next.lng, next.lat]);
      onConfirm(next); setSaved(true);
    }}>确认观察位置</button>
    <p className="publish-muted" role="status">{saved ? '已确认，本次观察将使用此位置。' : '未确认的调整不会写入观察。'}公共地点大头针不会移动；这不是照片 GPS 或自动定位。</p>
  </div>;
}
