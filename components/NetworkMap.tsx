'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface Collaborator {
  name: string;
  affiliation: string;
  location: string;
  lat: number;
  lng: number;
  project?: string;
  url: string;
}

interface NetworkMapProps {
  collaborators: Collaborator[];
}

const MIMIC_LAB = { lat: 45.4785, lng: 9.2320, name: 'MiMic Lab', affiliation: 'Politecnico di Milano' };

export default function NetworkMap({ collaborators }: NetworkMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      const map = L.map(mapRef.current!, {
        center: [46.5, 10],
        zoom: 4,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const mimicIcon = L.divIcon({
        html: `<div style="background:#4DC9FF;width:18px;height:18px;border-radius:50%;border:3px solid #102C53;box-shadow:0 0 8px rgba(77,201,255,0.6);"></div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const collabIcon = L.divIcon({
        html: `<div style="background:#102C53;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      L.marker([MIMIC_LAB.lat, MIMIC_LAB.lng], { icon: mimicIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <strong style="color:#102C53;font-size:14px;">MiMic Lab</strong><br/>
            <span style="color:#666;font-size:12px;">Politecnico di Milano</span><br/>
            <span style="color:#999;font-size:11px;">Milan, Italy</span>
          </div>`,
          { closeButton: false }
        );

      const grouped: Record<string, Collaborator[]> = {};
      collaborators.forEach((c) => {
        if (!c.lat || !c.lng) return;
        const key = `${c.lat.toFixed(3)},${c.lng.toFixed(3)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      });

      Object.values(grouped).forEach((group) => {
        const { lat, lng } = group[0];

        const line = L.polyline(
          [[MIMIC_LAB.lat, MIMIC_LAB.lng], [lat, lng]],
          { color: '#4DC9FF', weight: 1.5, opacity: 0.4, dashArray: '6,4' }
        ).addTo(map);

        const popupContent = group
          .map(
            (c) =>
              `<div style="margin-bottom:6px;">
                <a href="${c.url}" target="_blank" rel="noopener" style="color:#102C53;font-weight:600;font-size:13px;text-decoration:none;">${c.name}</a>
                ${c.project ? `<span style="background:#e8f4fd;color:#4DC9FF;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;">${c.project}</span>` : ''}
                <br/><span style="color:#666;font-size:11px;">${c.affiliation}</span>
              </div>`
          )
          .join('');

        L.marker([lat, lng], { icon: collabIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:system-ui;min-width:180px;max-width:280px;">
              ${popupContent}
              <span style="color:#999;font-size:11px;">${group[0].location}</span>
            </div>`,
            { closeButton: false }
          )
          .on('mouseover', function (this: any) {
            this.openPopup();
            line.setStyle({ opacity: 0.8, weight: 2.5 });
          })
          .on('mouseout', function (this: any) {
            this.closePopup();
            line.setStyle({ opacity: 0.4, weight: 1.5 });
          })
          .on('click', function (this: any) {
            this.openPopup();
          });
      });

      mapInstanceRef.current = map;
      setIsLoaded(true);

      setTimeout(() => map.invalidateSize(), 100);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [collaborators]);

  return (
    <div className="relative">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl z-10">
          <div className="text-gray-400 text-sm font-manrope">Loading map...</div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: '500px' }}
      />
    </div>
  );
}
