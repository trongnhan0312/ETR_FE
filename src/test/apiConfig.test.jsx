import { describe, expect, it } from "vitest";
import {
  API_BASE_URLS,
  getActiveApiBaseUrl,
  getApiBaseLabel,
  getApiBaseUrlCandidates,
  setActiveApiBaseUrl,
  setApiBaseMode,
} from "../utils/api";

describe("API base URL selection (deploy-only)", () => {
  it("exposes exactly ONE base URL", () => {
    expect(API_BASE_URLS).toHaveLength(1);
  });

  it("uses the deploy (Azure) backend — never localhost", () => {
    const order = getApiBaseUrlCandidates();

    expect(order).toHaveLength(1);
    expect(order[0]).toContain("azurewebsites.net");
    expect(order[0]).not.toContain("localhost");
  });

  it("ignores any previously persisted deploy/local selection", () => {
    localStorage.setItem(
      "activeApiBaseUrl",
      "https://etrmanagement-be-fwhvagaxf3f3dmf0.southeastasia-01.azurewebsites.net/api",
    );
    localStorage.setItem("apiBaseMode", "local");

    const order = getApiBaseUrlCandidates();

    expect(order).toHaveLength(1);
    expect(order[0]).toContain("azurewebsites.net");
    expect(order[0]).not.toContain("localhost");
  });

  it("keeps returning the deploy URL even after setActiveApiBaseUrl / setApiBaseMode calls", () => {
    setActiveApiBaseUrl("https://deploy.example/api");
    setApiBaseMode("deploy");

    const order = getApiBaseUrlCandidates();

    expect(order).toHaveLength(1);
    expect(order[0]).toContain("azurewebsites.net");
    expect(order[0]).not.toBe("https://deploy.example/api");
  });

  it("getActiveApiBaseUrl always resolves to the deploy URL", () => {
    expect(getActiveApiBaseUrl()).toContain("azurewebsites.net");
  });

  it("labels the base URL as DEPLOY", () => {
    expect(getApiBaseLabel(getActiveApiBaseUrl())).toBe("DEPLOY");
  });
});
