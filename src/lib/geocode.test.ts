import { afterEach, describe, expect, it, vi } from "vitest";
import { extractStreetNames, geocodeToronto, withCoordinates } from "./geocode";
import type { StructuredReport } from "./schemas";

function jsonResponse(body: unknown, ok = true) {
  return { ok, headers: new Headers({ "content-type": "application/json" }), json: async () => body };
}

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body, ok));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function report(location: StructuredReport["location"]): StructuredReport {
  return {
    intent: "Report a municipal issue",
    category: "pothole",
    subtype: "service-request",
    summary: "A pothole was reported.",
    actionable: true,
    confidence: 0.9,
    location,
    observations: {},
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractStreetNames", () => {
  it("finds both streets in an intersection description", () => {
    expect(extractStreetNames("Yonge Street near Eglinton Avenue")).toEqual(["Yonge Street", "Eglinton Avenue"]);
    expect(extractStreetNames("College Street and Spadina Avenue")).toEqual(["College Street", "Spadina Avenue"]);
    expect(extractStreetNames("Bloor Street West near Dufferin Street")).toEqual([
      "Bloor Street West",
      "Dufferin Street",
    ]);
  });

  it("drops filler words and expands abbreviations", () => {
    expect(extractStreetNames("laneway off Queen St E near Logan Ave")).toEqual(["Queen Street East", "Logan Avenue"]);
    expect(extractStreetNames("St. Clair Ave W and Bathurst St")).toEqual(["St. Clair Avenue West", "Bathurst Street"]);
  });

  it("returns a single street for a plain address", () => {
    expect(extractStreetNames("250 King Street")).toEqual(["King Street"]);
    expect(extractStreetNames("downtown Toronto")).toEqual([]);
  });
});

describe("geocodeToronto", () => {
  it("returns coordinates for a hit inside Toronto", async () => {
    const fetchMock = mockFetch([{ lat: "43.6468", lon: "-79.3900" }]);
    await expect(geocodeToronto("250 King Street")).resolves.toEqual({ latitude: 43.6468, longitude: -79.39 });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("q")).toBe("250 King Street, Toronto, Ontario");
    expect(url.searchParams.get("bounded")).toBe("1");
  });

  it("rejects hits outside Toronto", async () => {
    mockFetch([{ lat: "45.4215", lon: "-75.6972" }]);
    await expect(geocodeToronto("Parliament Hill")).resolves.toBeNull();
  });

  it("returns null when there is no match or the request fails", async () => {
    mockFetch([]);
    await expect(geocodeToronto("Nowhere Lane")).resolves.toBeNull();

    mockFetch([], false);
    await expect(geocodeToronto("Main Street")).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(geocodeToronto("Main Street")).resolves.toBeNull();
  });

  it("resolves intersections through Overpass", async () => {
    const fetchMock = mockFetch({ elements: [{ type: "node", lat: 43.7067, lon: -79.3983 }] });
    await expect(geocodeToronto("Yonge Street near Eglinton Avenue")).resolves.toEqual({
      latitude: 43.7067,
      longitude: -79.3983,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const query = (fetchMock.mock.calls[0][1].body as URLSearchParams).get("data");
    expect(query).toContain("^Yonge Street( (East|West|North|South))?$");
    expect(query).toContain("node(w.a)(w.b)");
  });

  it("falls back to Nominatim when Overpass finds no intersection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockResolvedValueOnce(jsonResponse([{ lat: "43.6598", lon: "-79.4353" }]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(geocodeToronto("Bloor Street West near Dufferin Street")).resolves.toEqual({
      latitude: 43.6598,
      longitude: -79.4353,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips the lookup for an empty location", async () => {
    const fetchMock = mockFetch([]);
    await expect(geocodeToronto("  ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("withCoordinates", () => {
  it("merges geocoded coordinates into the report location", async () => {
    mockFetch([{ lat: "43.6468", lon: "-79.3900" }]);
    const result = await withCoordinates(report({ raw: "250 King Street" }));
    expect(result.location).toEqual({ raw: "250 King Street", latitude: 43.6468, longitude: -79.39 });
  });

  it("keeps coordinates the caller already provided", async () => {
    const fetchMock = mockFetch([]);
    const original = report({ raw: "here", latitude: 43.7, longitude: -79.4 });
    await expect(withCoordinates(original)).resolves.toBe(original);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
