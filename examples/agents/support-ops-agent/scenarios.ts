import type { ScenarioName, TicketScenario } from "./types";

export const supportScenarios: Record<ScenarioName, TicketScenario> = {
  "small-refund": {
    name: "small-refund",
    title: "Small duplicate charge refund",
    ticketId: "SUP-1001",
    ticket: "Customer was double charged $45.",
  },
  "large-refund": {
    name: "large-refund",
    title: "Large VIP duplicate charge refund",
    ticketId: "SUP-1002",
    ticket: "VIP customer was double charged $1,200.",
    customerTier: "vip",
  },
  "blocked-delete": {
    name: "blocked-delete",
    title: "Production customer deletion request",
    ticketId: "SUP-1003",
    ticket: "Customer asks to delete their customer record from production.",
  },
  "external-email": {
    name: "external-email",
    title: "External apology email",
    ticketId: "SUP-1004",
    ticket: "Customer needs an external apology email.",
  },
  "database-write": {
    name: "database-write",
    title: "Production customer status correction",
    ticketId: "SUP-1005",
    ticket: "Support needs to update a production customer record.",
  },
};

export function getScenario(name: ScenarioName) {
  return supportScenarios[name];
}

export function getScenarioNames() {
  return Object.keys(supportScenarios) as ScenarioName[];
}
