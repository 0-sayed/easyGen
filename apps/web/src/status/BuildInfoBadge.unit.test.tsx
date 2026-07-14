import { act, render, screen } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as statusApi from "./api";
import { BuildInfoBadge } from "./BuildInfoBadge";
import { BuildInfoProvider, resetBuildInfoForTests } from "./BuildInfoProvider";

const buildInfo = {
  service: "easygen-api",
  version: "0.1.0",
  environment: "test",
} as const;

const healthInfo = {
  status: "ok",
  service: "easygen-api",
  scope: "process",
  uptimeSeconds: 125,
} as const;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function renderWithBuildInfoProvider(element: ReactElement) {
  return render(<BuildInfoProvider>{element}</BuildInfoProvider>);
}

describe("BuildInfoBadge", () => {
  afterEach(() => {
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("renders a persistent polite live region before build information resolves", () => {
    vi.spyOn(statusApi, "getBuildInfo").mockImplementationOnce(() => new Promise(() => undefined));
    vi.spyOn(statusApi, "getHealthInfo").mockImplementationOnce(() => new Promise(() => undefined));

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    const liveRegion = screen.getByRole("status", {
      name: "API build and liveness information",
    });

    expect(liveRegion).toHaveTextContent("Checking API status...");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("renders build information while liveness is still loading", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockImplementationOnce(() => new Promise(() => undefined));

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("checking liveness")).toBeInTheDocument();
  });

  it("keeps the same live region mounted as diagnostics resolve", async () => {
    const buildInfoRequest = createDeferred<typeof buildInfo>();
    const healthInfoRequest = createDeferred<typeof healthInfo>();
    vi.spyOn(statusApi, "getBuildInfo").mockReturnValueOnce(buildInfoRequest.promise);
    vi.spyOn(statusApi, "getHealthInfo").mockReturnValueOnce(healthInfoRequest.promise);

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    const liveRegion = screen.getByRole("status", {
      name: "API build and liveness information",
    });
    expect(liveRegion).toHaveTextContent("Checking API status...");

    act(() => {
      buildInfoRequest.resolve(buildInfo);
    });

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "API build and liveness information" })).toBe(
      liveRegion
    );
    expect(liveRegion).toHaveTextContent("checking liveness");

    act(() => {
      healthInfoRequest.resolve(healthInfo);
    });

    expect(await screen.findByText("up 2 minutes")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "API build and liveness information" })).toBe(
      liveRegion
    );
  });

  it("renders API build and liveness information after loading", async () => {
    const getBuildInfo = vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    const getHealthInfo = vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("process")).toBeInTheDocument();
    expect(screen.getByText("up 2 minutes")).toBeInTheDocument();
    expect(screen.queryByText("125")).not.toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledOnce();
    expect(getHealthInfo).toHaveBeenCalledOnce();
  });

  it("preserves the public diagnostics landmark after loading", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    const liveRegion = await screen.findByRole("status", {
      name: "API build and liveness information",
    });
    expect(liveRegion).toHaveTextContent("easygen-api");
    expect(
      screen.getByRole("complementary", { name: "API build and liveness information" })
    ).toBeVisible();
  });

  it("preserves build information when liveness is unavailable", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("offline"));

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("liveness unavailable")).toBeInTheDocument();
  });

  it("shares in-flight status requests across StrictMode remounts", async () => {
    const getBuildInfo = vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    const getHealthInfo = vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    render(
      <StrictMode>
        <BuildInfoProvider>
          <BuildInfoBadge />
        </BuildInfoProvider>
      </StrictMode>
    );

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledOnce();
    expect(getHealthInfo).toHaveBeenCalledOnce();
  });

  it("renders a non-blocking unavailable message when build information fails", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    const status = await screen.findByRole("status", {
      name: "API build and liveness information",
    });
    expect(status).toHaveTextContent("API status unavailable");
    expect(status.tagName).toBe("DIV");
  });

  it("retries failed requests after a failed provider mount", async () => {
    const getBuildInfo = vi
      .spyOn(statusApi, "getBuildInfo")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(buildInfo);
    const getHealthInfo = vi
      .spyOn(statusApi, "getHealthInfo")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(healthInfo);

    const { unmount } = renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(
      await screen.findByRole("status", { name: "API build and liveness information" })
    ).toBeInTheDocument();

    unmount();
    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("up 2 minutes")).toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledTimes(2);
    expect(getHealthInfo).toHaveBeenCalledTimes(2);
  });
});
