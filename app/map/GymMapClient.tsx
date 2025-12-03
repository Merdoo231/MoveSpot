"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  subscribeGymsWithLocation,
  GymWithLocation,
  getOccupancyColor,
} from "../../services/firestoreService";

import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

export default function GymMapClient() {
  const [gyms, setGyms] = useState<GymWithLocation[]>([]);
  const [selected, setSelected] = useState<GymWithLocation | null>(null);

  const [ready, setReady] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setReady(true); 
  }, []);

  useEffect(() => {
    const unsub = subscribeGymsWithLocation(setGyms);
    return () => unsub();
  }, []);

  const mapCenter: [number, number] = useMemo(() => {
    if (selected) return [selected.lat, selected.lng];
    if (gyms.length > 0) return [gyms[0].lat, gyms[0].lng];
    return [39.92077, 32.85411]; // fallback: Ankara
  }, [gyms, selected]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800">
        <p className="text-white/80 text-sm">Harita yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-4 md:p-6">
      <h1 className="text-white text-2xl font-bold mb-4">
        Salon Doluluk Haritası
      </h1>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Harita */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl bg-slate-900/40 border border-white/10">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", minHeight: "60vh", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {gyms.map((gym) => {
              const color = getOccupancyColor(gym);
              const ratio =
                gym.capacity > 0
                  ? Math.round((gym.currentCount / gym.capacity) * 100)
                  : 0;

              return (
                <CircleMarker
                  key={gym.id}
                  center={[gym.lat, gym.lng]}
                  radius={12}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => setSelected(gym),
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold">{gym.name}</div>
                      <div className="text-sm">
                        Doluluk: {gym.currentCount} / {gym.capacity} ({ratio}
                        %)
                      </div>
                      <div className="text-xs text-gray-600">
                        Renkli dairelere tıklayarak detay kartını görebilirsiniz.
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sağdaki detay kartı */}
        <div className="w-full lg:w-80 bg-white/5 border border-white/10 rounded-2xl p-4 text-white shadow-xl">
          <h2 className="text-lg font-semibold mb-2">Seçili Salon</h2>

          {selected ? (
            <div className="space-y-2">
              <div className="text-base font-bold">{selected.name}</div>
              <div className="text-sm text-white/80">
                Kapasite: {selected.currentCount} / {selected.capacity}
              </div>
              <div className="text-sm text-white/80">
                Konum: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
              </div>

              <div className="mt-3 text-xs text-white/60">
                Haritadaki renkli dairelere tıklayarak farklı salon
                seçebilirsiniz.
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              Harita üzerindeki renkli dairelere tıklayarak salon
              detaylarını görebilirsiniz.
            </p>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </main>
  );
}
