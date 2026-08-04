import { beforeEach, describe, expect, it } from "vitest";
import {
  getApiBaseUrlCandidates,
  setActiveApiBaseUrl,
  setApiBaseMode,
} from "../utils/api";

describe("API base URL selection", () => {
  beforeEach(() => {
    localStorage.clear();
    setApiBaseMode(null);
    setActiveApiBaseUrl(null);
  });

  it("prefers the local backend first in development", () => {
    const order = getApiBaseUrlCandidates();

    expect(order[0]).toContain("localhost");
    expect(order[1]).toContain("azurewebsites.net");
  });

  it("keeps using the first successful backend for later requests", () => {
    setActiveApiBaseUrl("https://deploy.example/api");

    expect(getApiBaseUrlCandidates()[0]).toBe("https://deploy.example/api");
  });

  it("persists the chosen backend so later requests reuse it", () => {
    setActiveApiBaseUrl("https://deploy.example/api");

    expect(localStorage.getItem("activeApiBaseUrl")).toBe(
      "https://deploy.example/api",
    );
  });
});
