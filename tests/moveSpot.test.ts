import {
  applyOccupancyLocally,
  canScanAgain,
  OccupancyUpdateType,
} from "../services/firestoreService";

describe("Occupancy logic (IN/OUT)", () => {
  const userA = "userA";
  const userB = "userB";

  test("IN: yeni kullanıcı eklenmeli", () => {
    const currentActive: string[] = [];
    const result = applyOccupancyLocally(currentActive, "IN", userA);
    expect(result).toEqual([userA]);
  });

  test("IN: aynı kullanıcı ikinci kez eklenmemeli", () => {
    const currentActive: string[] = [userA];
    const result = applyOccupancyLocally(currentActive, "IN", userA);
    expect(result).toEqual([userA]);
  });

  test("OUT: içeride olan kullanıcı çıkarılmalı", () => {
    const currentActive: string[] = [userA, userB];
    const result = applyOccupancyLocally(currentActive, "OUT", userA);
    expect(result).toEqual([userB]);
  });

  test("OUT: zaten içeride olmayan kullanıcıyı değiştirmemeli", () => {
    const currentActive: string[] = [userB];
    const result = applyOccupancyLocally(currentActive, "OUT", userA);
    expect(result).toEqual([userB]);
  });
});

describe("Cooldown mechanism", () => {
  test("İlk kez okutuyorsa her zaman izin verilmeli", () => {
    const now = new Date();
    const can = canScanAgain(null, now, 2 * 60 * 1000); // 2 dakika
    expect(can).toBe(true);
  });
test("Cool-down süresi dolmadan tekrar okutmaya izin verilmemeli", () => {
    const cooldownMs = 2 * 60 * 1000; // 2 dakika
    const lastScan = new Date("2025-12-01T10:00:00.000Z");
    const now = new Date("2025-12-01T10:01:00.000Z"); // 1 dk sonra

    const can = canScanAgain(lastScan, now, cooldownMs);
    expect(can).toBe(false);
  });

  test("Cool-down süresi geçtikten sonra tekrar okutmaya izin verilmeli", () => {
    const cooldownMs = 2 * 60 * 1000; // 2 dakika
    const lastScan = new Date("2025-12-01T10:00:00.000Z");
    const now = new Date("2025-12-01T10:03:00.000Z"); // 3 dk sonra

    const can = canScanAgain(lastScan, now, cooldownMs);
    expect(can).toBe(true);
  });
});