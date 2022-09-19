import { sync } from 'cross-spawn';
import fs from 'fs';
import path from 'path';

import type {
  Validation,
  ValidationContext,
  ValidationViolatingResource,
  ValidationViolation,
} from 'cdk8s-cli/lib/plugins';

import {
  DatreeRawJsonOutputType,
  RuleResultType,
  ViolationType,
  PrepViolationType,
  OccurrencesDetail,
} from './types';

export interface DatreeValidationProps {
  readonly policy?: string;
}

export type DatreeAddViolation = {
  readonly ruleName: string;
  readonly recommendation: string;
  readonly fix: string;
  readonly violatingResources: ValidationViolatingResource[];
};

export class DatreeValidation implements Validation {
  private readonly props: DatreeValidationProps;
  private policy: string = 'cdk8s';
  private loginUrl: string = 'https://app.datree.io/login';

  constructor(props: DatreeValidationProps = {}) {
    this.props = props;
    if (props.policy) {
      this.policy = props.policy;
    }
  }

  public async validate(context: ValidationContext) {
    const policyValidationResult: Map<string, ViolationType[]> = new Map();

    const binFilePath = path.resolve(__dirname, '..', 'bin', 'datree');

    if (!fs.existsSync(binFilePath)) {
      throw new Error(`🌳 Datree binary not found at ${binFilePath}`);
    }

    for (const manifest of context.manifests) {
      context.logger.log(
        `🌳 Datree validating ${manifest} with policy ${this.policy}`
      );
      const datreeFlags = [
        'test',
        manifest,
        '-p',
        this.policy,
        '-o',
        'json',
        '--verbose',
        '--skip-validation',
        'schema',
      ];

      const { status, output } = sync(binFilePath, datreeFlags, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      if (status === 2) {
        output.forEach((o: string | null) => {
          try {
            if (!!o) {
              const parsed: DatreeRawJsonOutputType = JSON.parse(o);
              const fileName = parsed.policyValidationResults[0].fileName;
              const ruleResults = parsed.policyValidationResults[0].ruleResults;
              this.loginUrl = parsed.loginUrl;
              ruleResults.forEach((ruleResult: RuleResultType) => {
                const violation: ViolationType = {
                  fileName: fileName,
                  ruleName: ruleResult.identifier,
                  name: ruleResult.name,
                  recommendation: ruleResult.messageOnFailure,
                  fix: ruleResult.documentationUrl,
                  occurrences: ruleResult.occurrencesDetails,
                };
                if (policyValidationResult.has(violation.ruleName)) {
                  policyValidationResult
                    .get(violation.ruleName)
                    ?.push(violation);
                } else {
                  policyValidationResult.set(violation.ruleName, [violation]);
                }
              });
            }
          } catch (error) {
            context.logger.log(`🌳 Datree validation failed: ${error}`);
          }
        });
      }
    }

    if (policyValidationResult.size > 0) {
      const violationsMap: Map<string, PrepViolationType[]> = new Map();
      policyValidationResult.forEach((violations: any) => {
        violations.forEach((violation: any) => {
          const violatingResources: ValidationViolatingResource[] = [];
          const fileName = violation.fileName;
          const ruleName = violation.ruleName;
          violation.occurrences.forEach((occurrence: OccurrencesDetail) => {
            violatingResources.push({
              resourceName: occurrence.metadataName,
              locations: occurrence.failureLocations.map(
                (l: any) =>
                  `${l.schemaPath.substring(1)} (line: ${l.failedErrorLine}:${
                    l.failedErrorColumn
                  })`
              ),
              manifestPath: fileName,
            });
          });

          let prepViolation: PrepViolationType = {
            uniqueRuleName: ruleName,
            name: fileName,
            ruleName: violation.name,
            recommendation: violation.recommendation,
            fix: violation.fix,
            violatingResources: violatingResources,
          };

          if (violationsMap.get(prepViolation.uniqueRuleName)) {
            violationsMap
              .get(prepViolation.uniqueRuleName)
              ?.push(prepViolation);
          } else {
            violationsMap.set(prepViolation.uniqueRuleName, [prepViolation]);
          }
        });
      });

      violationsMap.forEach((e: PrepViolationType[]) => {
        const mergeViolatingResources = e.reduce(
          (acc, curr) =>
            acc.concat(curr.violatingResources as ConcatArray<never>),
          []
        );

        context.report.addViolation({
          ruleName: e[0].ruleName,
          recommendation: e[0].recommendation,
          fix: e[0].fix,
          violatingResources: mergeViolatingResources,
        } as ValidationViolation);
      });
    }

    context.report.submit(
      policyValidationResult.size > 0 ? 'failure' : 'success',
      {
        'Customize\npolicy': this.loginUrl,
      }
    );
  }
}
