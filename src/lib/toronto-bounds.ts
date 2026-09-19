export const TORONTO_BOUNDS = { west: -79.6393, south: 43.581, east: -79.1152, north: 43.8555 } as const;

export type Coordinates = { latitude: number; longitude: number };

export function isInToronto({ latitude, longitude }: Coordinates): boolean {
  return (
    latitude >= TORONTO_BOUNDS.south &&
    latitude <= TORONTO_BOUNDS.north &&
    longitude >= TORONTO_BOUNDS.west &&
    longitude <= TORONTO_BOUNDS.east
  );
}
