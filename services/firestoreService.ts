import { db } from "../firebase";
import {
  doc,
  runTransaction,
  arrayUnion,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  FirestoreError,
} from "firebase/firestore";

export type OccupancyUpdateType = "IN" | "OUT";

export type HistoryEntry = {
  id: string;
  gymId: string;
  userId: string;
  type: OccupancyUpdateType;
  timestamp: Date;
};
export function applyOccupancyLocally(
  currentActive: string[],
  type: OccupancyUpdateType,
  userId: string
): string[] {
  const activeMemberIds = [...currentActive];

  if (type === "IN") {
    if (activeMemberIds.includes(userId)) {
      return activeMemberIds;
    }
    return [...activeMemberIds, userId];
  } else {
    if (!activeMemberIds.includes(userId)) {
      return activeMemberIds;
    }
    return activeMemberIds.filter((id) => id !== userId);
  }
}

export function canScanAgain(
  lastScanAt: Date | null,
  now: Date,
  cooldownMs = 2 * 60 * 1000
): boolean {
  if (!lastScanAt) return true;

  const diff = now.getTime() - lastScanAt.getTime();
  return diff >= cooldownMs;
}

export async function updateOccupancy(
  gymId: string,
  type: OccupancyUpdateType,
  userId: string
): Promise<void> {
  const gymRef = doc(db, "gyms", gymId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gymRef);
    if (!snap.exists()) {
      throw new Error("Salon bulunamadı. QR bağlantısı eski veya hatalı olabilir.");
    }

    const data = snap.data() as any;

    const activeMemberIds: string[] = Array.isArray(data.activeMemberIds)
      ? data.activeMemberIds
      : [];

    const capacity: number =
      typeof data.capacity === "number" ? data.capacity : 0;

    let newActive: string[] = activeMemberIds;

    if (type === "IN") {
      if (activeMemberIds.includes(userId)) {
        throw new Error(
          "Zaten bu salonda içeride görünüyorsunuz. İkinci kez giriş kaydedilmedi."
        );
      }

      newActive = [...activeMemberIds, userId];

      if (capacity && newActive.length > capacity) {
        throw new Error("Salon kapasitesi dolu. Giriş kaydedilemedi.");
      }

      tx.update(gymRef, {
        activeMemberIds: newActive,
        currentCount: newActive.length,
        memberIds: arrayUnion(userId),
      });
    } else {
      if (!activeMemberIds.includes(userId)) {
        throw new Error(
          "Bu salondan zaten çıkış yapmış görünüyorsunuz. Tekrar çıkış kaydedilmedi."
        );
      }

      newActive = activeMemberIds.filter((id) => id !== userId);
      const newCount = Math.max(0, newActive.length);

      tx.update(gymRef, {
        activeMemberIds: newActive,
        currentCount: newCount,
      });
    }

    const logRef = doc(collection(db, "gymLogs"));
    tx.set(logRef, {
      gymId,
      userId,
      type,
      timestamp: serverTimestamp(),
    });
  });
}

export function getOccupancy(
  gymId: string,
  onChange: (value: number) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  const gymRef = doc(db, "gyms", gymId);

  const unsubscribe = onSnapshot(
    gymRef,
    (snap) => {
      if (!snap.exists()) {
        onChange(0);
        return;
      }
      const data = snap.data() as any;
      const count =
        typeof data.currentCount === "number" ? data.currentCount : 0;
      onChange(count);
    },
    (error) => {
      console.error("getOccupancy error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

export function getHistory(
  gymId: string,
  onChange: (entries: HistoryEntry[]) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  const logsRef = collection(db, "gymLogs");
  const q = query(
    logsRef,
    where("gymId", "==", gymId),
    orderBy("timestamp", "desc"),
    limit(100)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries: HistoryEntry[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        const ts =
          d.timestamp && typeof d.timestamp.toDate === "function"
            ? d.timestamp.toDate()
            : new Date();

        return {
          id: docSnap.id,
          gymId: d.gymId,
          userId: d.userId,
          type: d.type,
          timestamp: ts,
        };
      });

      onChange(entries);
    },
    (error) => {
      console.error("getHistory error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;

}

export type GymWithLocation = {
  id: string;
  name: string;
  capacity: number;
  currentCount: number;
  lat: number;
  lng: number;
};

export function getOccupancyColor(gym: {
  currentCount: number;
  capacity: number;
}): string {
  if (!gym.capacity || gym.capacity <= 0) return "gray";

  const ratio = gym.currentCount / gym.capacity;

  if (ratio <= 0.3) return "green";   // %0 - %30
  if (ratio <= 0.6) return "yellow";  // %30 - %60
  if (ratio <= 0.8) return "orange";  // %60 - %80
  return "red";                       // %80+
}

export function subscribeGymsWithLocation(
  onChange: (gyms: GymWithLocation[]) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  const gymsRef = collection(db, "gyms");

  const unsubscribe = onSnapshot(
    gymsRef,
    (snapshot) => {
      const gyms: GymWithLocation[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data() as any;

          if (typeof d.lat !== "number" || typeof d.lng !== "number") {
            return null;
          }

          return {
            id: docSnap.id,
            name: typeof d.name === "string" ? d.name : "İsimsiz Salon",
            capacity:
              typeof d.capacity === "number" ? d.capacity : 0,
            currentCount:
              typeof d.currentCount === "number" ? d.currentCount : 0,
            lat: d.lat,
            lng: d.lng,
          };
        })
        .filter((g): g is GymWithLocation => g !== null);

      onChange(gyms);
    },
    (error) => {
      console.error("subscribeGymsWithLocation error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}
