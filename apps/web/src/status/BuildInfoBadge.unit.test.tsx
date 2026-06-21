import { render, screen } from "@testing-library/react";
import { StrictMode, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as statusApi from "./api";
import { BuildInfoBadge } from "./BuildInfoBadge";
import { BuildInfoProvider, resetBuildInfoForTests } from "./BuildInfoProvider";

function renderWithBuildInfoProvider(element: ReactElement) {
  return render(<BuildInfoProvider>{element}</BuildInfoProvider>);
}

describe("BuildInfoBadge", () => {
  afterEach(() => {
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("renders API service, version, and environment after loading", async () => {
    const getBuildInfo = vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledOnce();
  });

  it("shares the in-flight status request across StrictMode remounts", async () => {
    const getBuildInfo = vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });

    render(
      <StrictMode>
        <BuildInfoProvider>
          <BuildInfoBadge />
        </BuildInfoProvider>
      </StrictMode>
    );

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledOnce();
  });

  it("renders a non-blocking unavailable message when the status request fails", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("offline"));

    renderWithBuildInfoProvider(<BuildInfoBadge />);

    const status = await screen.findByRole("status", { name: "API status unavailable" });
    expect(status).toHaveTextContent("API status unavailable");
    expect(status.tagName).toBe("DIV");
  });

  it("retries the status request after a failed provider mount", async () => {
    const getBuildInfo = vi
      .spyOn(statusApi, "getBuildInfo")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        service: "easygen-api",
        version: "0.1.0",
        environment: "test",
      });

    const { unmount } = renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(
      await screen.findByRole("status", { name: "API status unavailable" })
    ).toBeInTheDocument();

    unmount();
    renderWithBuildInfoProvider(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(getBuildInfo).toHaveBeenCalledTimes(2);
  });
});
