import { describe, expect, it } from "vitest";
import { extractPlaceNames, extractStreetNames, intersectionKeys, normalizeStreetName } from "./street-names";

describe("extractStreetNames", () => {
  it("finds both streets in an intersection description", () => {
    expect(extractStreetNames("Yonge Street near Eglinton Avenue")).toEqual(["Yonge Street", "Eglinton Avenue"]);
    expect(extractStreetNames("College Street and Spadina Avenue")).toEqual(["College Street", "Spadina Avenue"]);
    expect(extractStreetNames("Bloor Street West near Dufferin Street")).toEqual([
      "Bloor Street West",
      "Dufferin Street",
    ]);
  });

  it("drops filler words", () => {
    expect(extractStreetNames("laneway off Queen Street East near Logan Avenue")).toEqual([
      "Queen Street East",
      "Logan Avenue",
    ]);
    expect(extractStreetNames("St. Clair Ave W and Bathurst St")).toEqual(["St. Clair Ave W", "Bathurst St"]);
  });

  it("returns a single street for a plain address", () => {
    expect(extractStreetNames("250 King Street")).toEqual(["King Street"]);
    expect(extractStreetNames("downtown Toronto")).toEqual([]);
  });
});

describe("extractPlaceNames", () => {
  it("keeps capitalised names that are not suffixed streets", () => {
    expect(extractPlaceNames("Queens Park on Wellesley Street West")).toEqual(["Queens Park"]);
    expect(extractPlaceNames("Queen's Park, right outside of Hart House")).toEqual(["Queen's Park", "Hart House"]);
    expect(extractPlaceNames("The Esplanade near Church Street")).toEqual(["The Esplanade"]);
  });

  it("ignores suffixed streets and the city name", () => {
    expect(extractPlaceNames("Yonge Street near Eglinton Avenue")).toEqual([]);
    expect(extractPlaceNames("downtown Toronto")).toEqual([]);
  });
});

describe("normalizeStreetName", () => {
  it("makes caller phrasing and city abbreviations agree", () => {
    expect(normalizeStreetName("Eglinton Avenue East")).toBe("eglinton ave e");
    expect(normalizeStreetName("Eglinton Ave E")).toBe("eglinton ave e");
    expect(normalizeStreetName("Queen Street East")).toBe(normalizeStreetName("Queen St E"));
    expect(normalizeStreetName("Saint Clair Avenue West")).toBe("st clair ave w");
    expect(normalizeStreetName("St. Clair Ave W")).toBe("st clair ave w");
  });

  it("only rewrites the suffix and direction positions", () => {
    expect(normalizeStreetName("Avenue Road")).toBe("avenue rd");
    expect(normalizeStreetName("East Avenue")).toBe("east ave");
  });
});

describe("intersectionKeys", () => {
  it("lists order-independent keys, most specific first", () => {
    expect(intersectionKeys("yonge st", "eglinton ave e")).toEqual(["eglinton ave e&yonge st", "eglinton ave&yonge st"]);
    expect(intersectionKeys("eglinton ave e", "yonge st")).toEqual(["eglinton ave e&yonge st", "eglinton ave&yonge st"]);
  });

  it("skips pairs that are the same street", () => {
    expect(intersectionKeys("eglinton ave e", "eglinton ave w")).toEqual([]);
  });
});
