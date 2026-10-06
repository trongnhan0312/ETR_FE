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

import { parseApiError } from "../utils/api";

describe("parseApiError specific error preservation", () => {
  it("preserves specific Error message instead of swallowing with fallback", () => {
    localStorage.setItem("app_language", "vi");
    const err = new Error("Không thể điểm danh trước cho buổi học trong tương lai.");
    const result = parseApiError(err, "Lưu điểm danh thất bại!");
    expect(result).toBe("Không thể điểm danh trước cho buổi học trong tương lai.");
  });

  it("extracts detail from ProblemDetails JSON string", () => {
    localStorage.setItem("app_language", "vi");
    const rawJson = JSON.stringify({
      title: "Business rule violation",
      status: 400,
      detail: "Không thể điểm danh trước cho buổi học trong tương lai.",
    });
    const result = parseApiError(rawJson, "Thao tác thất bại!");
    expect(result).toBe("Không thể điểm danh trước cho buổi học trong tương lai.");
  });

  it("uses fallback when error is generic or empty", () => {
    const err = new Error("Request failed with status 500");
    const result = parseApiError(err, "Thao tác thất bại. Vui lòng thử lại.");
    expect(result).toBe("Operation failed. Please try again.");
  });
});
