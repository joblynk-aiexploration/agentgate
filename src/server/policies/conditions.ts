import type { ToolType } from "@/generated/prisma/client";
import type {
  LegacyCondition,
  PolicyConditions,
  PolicyEvaluationInput,
  PolicyRuleForEvaluation,
} from "@/server/policies/types";

function normalizeString(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeTool(value: unknown) {
  return normalizeString(value).replaceAll("-", "_");
}

function asNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function getObjectValue(value: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

function getFieldValue(input: PolicyEvaluationInput, field: string) {
  const normalizedField = field.trim();

  if (normalizedField.startsWith("payload.")) {
    return getObjectValue(input.payload, normalizedField.replace(/^payload\./, ""));
  }

  if (normalizedField.startsWith("metadata.")) {
    return getObjectValue(input.metadata, normalizedField.replace(/^metadata\./, ""));
  }

  switch (normalizedField) {
    case "agentId":
      return input.agent.id;
    case "department":
      return input.agent.department;
    case "agentRiskTier":
      return input.agent.riskTier;
    case "tool":
      return input.tool;
    case "action":
      return input.action;
    case "environment":
      return input.environment;
    case "amount":
    case "amountCents":
      return input.amount;
    case "currency":
      return input.currency;
    case "customerTier":
      return input.customerTier ?? getObjectValue(input.metadata, "customerTier");
    case "dataSensitivity":
      return input.dataSensitivity;
    case "reversible":
      return input.reversible;
    case "externalCommunication":
      return input.externalCommunication;
    case "productionEnvironment":
      return input.productionEnvironment;
    default:
      return getObjectValue(input.metadata, normalizedField);
  }
}

function compareLegacyCondition(
  input: PolicyEvaluationInput,
  condition: LegacyCondition,
) {
  const actual = getFieldValue(input, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "equals":
      return normalizeString(actual) === normalizeString(expected);
    case "notEquals":
      return normalizeString(actual) !== normalizeString(expected);
    case "gt":
      return (asNumber(actual) ?? 0) > (asNumber(expected) ?? 0);
    case "gte":
      return (asNumber(actual) ?? 0) >= (asNumber(expected) ?? 0);
    case "lt":
      return (asNumber(actual) ?? 0) < (asNumber(expected) ?? 0);
    case "lte":
      return (asNumber(actual) ?? 0) <= (asNumber(expected) ?? 0);
    case "contains":
      return normalizeString(actual).includes(normalizeString(expected));
    case "notContains":
      return !normalizeString(actual).includes(normalizeString(expected));
    case "endsWith":
      return normalizeString(actual).endsWith(normalizeString(expected));
    case "notEndsWith":
      return !normalizeString(actual).endsWith(normalizeString(expected));
    case "in":
      return Array.isArray(expected)
        ? expected.some((item) => normalizeString(item) === normalizeString(actual))
        : false;
    default:
      return false;
  }
}

function matchesTool(expected: PolicyConditions["tool"], actual: ToolType | string) {
  if (!expected) {
    return true;
  }

  const actualTool = normalizeTool(actual);
  const expectedTools = Array.isArray(expected) ? expected : [expected];

  return expectedTools.some((tool) => normalizeTool(tool) === actualTool);
}

function matchesActionContains(expected: string | string[], action: string) {
  const expectedItems = Array.isArray(expected) ? expected : [expected];
  const normalizedAction = normalizeString(action);

  return expectedItems.some((item) => normalizedAction.includes(normalizeString(item)));
}

function matchesAction(expected: string | undefined | null, actual: string) {
  if (!expected) {
    return true;
  }

  const normalizedExpected = normalizeString(expected);
  const normalizedActual = normalizeString(actual);

  if (!normalizedExpected.includes("*")) {
    return normalizedExpected === normalizedActual;
  }

  const escaped = normalizedExpected
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  const pattern = new RegExp(`^${escaped}$`);

  return pattern.test(normalizedActual);
}

function matchesMetadata(
  expected: Record<string, unknown> | undefined,
  metadata: unknown,
) {
  if (!expected) {
    return true;
  }

  return Object.entries(expected).every(
    ([key, value]) => normalizeString(getObjectValue(metadata, key)) === normalizeString(value),
  );
}

export function parsePolicyConditions(value: unknown): PolicyConditions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as PolicyConditions;
}

export function policyRuleMatchesContext(
  rule: PolicyRuleForEvaluation,
  input: PolicyEvaluationInput,
) {
  if (rule.tool && normalizeTool(rule.tool) !== normalizeTool(input.tool)) {
    return false;
  }

  if (!matchesAction(rule.action, input.action)) {
    return false;
  }

  return evaluateConditions(parsePolicyConditions(rule.conditionsJson), input);
}

export function evaluateConditions(
  conditions: PolicyConditions,
  input: PolicyEvaluationInput,
) {
  if (conditions.all?.length) {
    return conditions.all.every((condition) => compareLegacyCondition(input, condition));
  }

  if (conditions.any?.length) {
    return conditions.any.some((condition) => compareLegacyCondition(input, condition));
  }

  if (conditions.agentId && conditions.agentId !== input.agent.id) {
    return false;
  }

  if (
    conditions.department &&
    normalizeString(conditions.department) !== normalizeString(input.agent.department)
  ) {
    return false;
  }

  if (
    conditions.agentRiskTier &&
    normalizeString(conditions.agentRiskTier) !== normalizeString(input.agent.riskTier)
  ) {
    return false;
  }

  if (!matchesTool(conditions.tool, input.tool)) {
    return false;
  }

  if (conditions.action && normalizeString(conditions.action) !== normalizeString(input.action)) {
    return false;
  }

  if (
    conditions.environment &&
    normalizeString(conditions.environment) !== normalizeString(input.environment)
  ) {
    return false;
  }

  if (
    conditions.amountGreaterThan != null &&
    (input.amount == null || input.amount <= conditions.amountGreaterThan)
  ) {
    return false;
  }

  if (
    conditions.amountLessThan != null &&
    (input.amount == null || input.amount >= conditions.amountLessThan)
  ) {
    return false;
  }

  if (conditions.currency && normalizeString(conditions.currency) !== normalizeString(input.currency)) {
    return false;
  }

  if (
    conditions.customerTier &&
    normalizeString(conditions.customerTier) !== normalizeString(input.customerTier)
  ) {
    return false;
  }

  if (
    conditions.dataSensitivity &&
    normalizeString(conditions.dataSensitivity) !== normalizeString(input.dataSensitivity)
  ) {
    return false;
  }

  if (
    conditions.reversible != null &&
    conditions.reversible !== input.reversible
  ) {
    return false;
  }

  if (
    conditions.externalCommunication != null &&
    conditions.externalCommunication !== input.externalCommunication
  ) {
    return false;
  }

  if (
    conditions.productionEnvironment != null &&
    conditions.productionEnvironment !== input.productionEnvironment
  ) {
    return false;
  }

  if (
    conditions.actionContains &&
    !matchesActionContains(conditions.actionContains, input.action)
  ) {
    return false;
  }

  if (!matchesMetadata(conditions.metadata, input.metadata)) {
    return false;
  }

  if (conditions.metadataFieldMatch) {
    const actual = getObjectValue(input.metadata, conditions.metadataFieldMatch.field);

    if (normalizeString(actual) !== normalizeString(conditions.metadataFieldMatch.value)) {
      return false;
    }
  }

  return true;
}
