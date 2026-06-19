import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as statusApi from "./api";
import { BuildInfoBadge } from "./BuildInfoBadge";

describe("BuildInfoBadge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders API service, version, and environment after loading", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });

    render(<BuildInfoBadge />);

    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("renders nothing when the status request fails", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("offline"));

    const { container } = render(<BuildInfoBadge />);

    await waitFor(() => {
      expect(statusApi.getBuildInfo).toHaveBeenCalled();
    });
    await act(async () => {});

    expect(container).toBeEmptyDOMElement();
  });
});
