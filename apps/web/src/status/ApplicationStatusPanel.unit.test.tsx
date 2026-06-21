import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationStatusPanel } from "./ApplicationStatusPanel";
import * as statusApi from "./api";
import { BuildInfoProvider, resetBuildInfoForTests } from "./BuildInfoProvider";

function renderWithBuildInfoProvider(element: ReactElement) {
  return render(<BuildInfoProvider>{element}</BuildInfoProvider>);
}

describe("ApplicationStatusPanel", () => {
  afterEach(() => {
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("renders ready API status with service, version, and environment", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    const status = await screen.findByRole("status", { name: "API connection" });
    expect(status).toHaveTextContent("API connected");
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("renders loading API status while checking the API connection", () => {
    vi.spyOn(statusApi, "getBuildInfo").mockImplementationOnce(() => new Promise(() => undefined));

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    expect(screen.getByRole("status", { name: "Checking API connection" })).toHaveTextContent(
      "Checking API connection..."
    );
  });

  it("renders failed API status without blocking account details", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("offline"));

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    const status = await screen.findByRole("status", { name: "API connection unavailable" });
    expect(status).toHaveTextContent("API status unavailable");
    expect(screen.getByText("Account details remain available.")).toBeInTheDocument();
  });
});
