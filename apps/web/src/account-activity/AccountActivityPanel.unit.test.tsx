import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountActivityPanel } from "./AccountActivityPanel";
import * as authApi from "../auth/api";

const activityTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const activities = [
  {
    id: "activity-1",
    type: "auth.signed_in" as const,
    description: "Signed in",
    occurredAt: "2026-06-24T12:00:00.000Z",
  },
  {
    id: "activity-2",
    type: "account.created" as const,
    description: "Account created",
    occurredAt: "2026-06-23T09:30:00.000Z",
  },
];

describe("AccountActivityPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state while activity is loading", () => {
    vi.spyOn(authApi, "getAccountActivity").mockImplementationOnce(() => new Promise(() => undefined));

    render(<AccountActivityPanel accessToken="token-123" />);

    expect(screen.getByRole("status", { name: "Loading account activity" })).toHaveTextContent(
      "Loading recent account activity..."
    );
  });

  it("renders recent account activity without raw identifiers", async () => {
    vi.spyOn(authApi, "getAccountActivity").mockResolvedValueOnce({
      activities,
      limit: 20,
    });

    render(<AccountActivityPanel accessToken="token-123" />);

    expect(await screen.findByRole("list", { name: "Recent account activity" })).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.getByText("Account created")).toBeInTheDocument();
    expect(
      screen.getByText(activityTimestampFormatter.format(new Date("2026-06-24T12:00:00.000Z")))
    ).toBeInTheDocument();
    expect(
      screen.getByText(activityTimestampFormatter.format(new Date("2026-06-23T09:30:00.000Z")))
    ).toBeInTheDocument();
    expect(screen.queryByText("activity-1")).not.toBeInTheDocument();
    expect(screen.queryByText("auth.signed_in")).not.toBeInTheDocument();
    expect(authApi.getAccountActivity).toHaveBeenCalledWith("token-123");
  });

  it("renders Unknown time for an unparsable activity timestamp", async () => {
    vi.spyOn(authApi, "getAccountActivity").mockResolvedValueOnce({
      activities: [
        {
          id: "activity-3",
          type: "auth.signed_in",
          description: "Signed in",
          occurredAt: "not-a-date",
        },
      ],
      limit: 20,
    });

    render(<AccountActivityPanel accessToken="token-123" />);

    expect(await screen.findByRole("list", { name: "Recent account activity" })).toBeInTheDocument();
    expect(screen.getByText("Unknown time")).toBeInTheDocument();
  });

  it("renders an empty state", async () => {
    vi.spyOn(authApi, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });

    render(<AccountActivityPanel accessToken="token-123" />);

    expect(await screen.findByText("No recent account activity yet.")).toBeInTheDocument();
  });

  it("renders a local failed state", async () => {
    vi.spyOn(authApi, "getAccountActivity").mockRejectedValueOnce(new Error("offline"));

    render(<AccountActivityPanel accessToken="token-123" />);

    const status = await screen.findByRole("status", { name: "Account activity unavailable" });
    expect(status).toHaveTextContent("Recent account activity is unavailable.");
  });

  it("does not call the API without a token", () => {
    const getAccountActivity = vi.spyOn(authApi, "getAccountActivity");

    render(<AccountActivityPanel accessToken={null} />);

    expect(screen.getByRole("status", { name: "Account activity unavailable" })).toHaveTextContent(
      "Recent account activity is unavailable."
    );
    expect(getAccountActivity).not.toHaveBeenCalled();
  });
});
