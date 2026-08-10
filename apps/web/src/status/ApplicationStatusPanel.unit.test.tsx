import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationStatusPanel } from "./ApplicationStatusPanel";
import * as statusApi from "./api";
import { BuildInfoProvider, resetBuildInfoForTests } from "./BuildInfoProvider";

const buildInfo = {
  service: "easygen-api",
  version: "0.1.0",
  environment: "test",
  source: "runtime",
} as const;

const healthInfo = {
  status: "ok",
  service: "easygen-api",
  scope: "process",
  uptimeSeconds: 125,
} as const;

function renderWithBuildInfoProvider(element: ReactElement) {
  return render(<BuildInfoProvider>{element}</BuildInfoProvider>);
}

describe("ApplicationStatusPanel", () => {
  afterEach(() => {
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("renders ready API status with build and liveness information", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    expect(screen.getByRole("heading", { name: "API status" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "API connection" })).not.toBeInTheDocument();

    const status = await screen.findByRole("status", { name: "API connection" });
    expect(status).toHaveTextContent("API connected");
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("Build version")).toBeInTheDocument();
    expect(screen.queryByText("Version", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(within(status).getByText("Runtime")).toBeInTheDocument();
    expect(within(status).queryByText("runtime")).not.toBeInTheDocument();
    expect(screen.getByText("Liveness scope")).toBeInTheDocument();
    expect(screen.queryByText("Liveness", { exact: true })).not.toBeInTheDocument();
    expect(within(status).getByText("Process")).toBeInTheDocument();
    expect(within(status).queryByText("process")).not.toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
    expect(screen.getByText("2 minutes")).toBeInTheDocument();
    expect(screen.queryByText("125")).not.toBeInTheDocument();
  });

  it("renders build information while liveness is unavailable", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("offline"));

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    const status = await screen.findByRole("status", { name: "API connection" });
    expect(status).toHaveTextContent("API connected");
    expect(screen.getByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("Liveness scope")).toBeInTheDocument();
    expect(screen.queryByText("Liveness", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });

  it("renders the liveness scope label while liveness is loading", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockImplementationOnce(() => new Promise(() => undefined));

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    const status = await screen.findByRole("status", { name: "API connection" });
    expect(status).toHaveTextContent("API connected");
    expect(screen.getByText("Liveness scope")).toBeInTheDocument();
    expect(screen.queryByText("Liveness", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("checking")).toBeInTheDocument();
  });

  it("renders loading API status while checking the API connection", () => {
    vi.spyOn(statusApi, "getBuildInfo").mockImplementationOnce(() => new Promise(() => undefined));
    vi.spyOn(statusApi, "getHealthInfo").mockImplementationOnce(() => new Promise(() => undefined));

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    expect(screen.getByRole("status", { name: "Checking API connection" })).toHaveTextContent(
      "Checking API connection..."
    );
  });

  it("renders failed API status without blocking account details", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

    renderWithBuildInfoProvider(<ApplicationStatusPanel />);

    const status = await screen.findByRole("status", { name: "API connection unavailable" });
    expect(status).toHaveTextContent("API status unavailable");
    expect(screen.getByText("Account details remain available.")).toBeInTheDocument();
  });
});
