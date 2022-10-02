import { ValidationViolatingResource } from 'cdk8s-cli/lib/plugins';

export interface DatreeRawJsonOutputType {
  policyValidationResults: PolicyValidationResult[];
  policySummary: PolicySummary;
  evaluationSummary: EvaluationSummary;
  yamlValidationResults?: any;
  k8sValidationResults?: any;
  loginUrl: string;
}

export interface EvaluationSummary {
  configsCount: number;
  filesCount: number;
  passedYamlValidationCount: number;
  k8sValidation: string;
  passedPolicyValidationCount: number;
}

export interface PolicySummary {
  policyName: string;
  totalRulesInPolicy: number;
  totalSkippedRules: number;
  totalRulesFailed: number;
  totalPassedCount: number;
}

export interface PolicyValidationResult {
  fileName: string;
  ruleResults: RuleResultType[];
}

export interface RuleResultType {
  identifier: string;
  name: string;
  messageOnFailure: string;
  occurrencesDetails: OccurrencesDetail[];
  documentationUrl: string;
}

export interface OccurrencesDetail {
  metadataName: string;
  kind: string;
  skipMessage: string;
  occurrences: number;
  isSkipped: boolean;
  failureLocations: FailureLocation[];
}

export interface FailureLocation {
  schemaPath: string;
  failedErrorLine: number;
  failedErrorColumn: number;
}

export interface ViolationType {
  fileName: string;
  ruleName: string;
  name: string;
  recommendation: string;
  fix: string;
  occurrences: OccurrencesDetail[];
}

export interface PrepViolationType {
  uniqueRuleName: string;
  name: string;
  ruleName: string;
  recommendation: string;
  fix: string;
  violatingResources: ValidationViolatingResource[] | ConcatArray<never>;
}
