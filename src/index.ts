import { sync } from 'cross-spawn';
import fs from 'fs';
import path from 'path';

import type {
  Validation,
  ValidationContext,
  ValidationViolatingResource,
  ValidationViolation,
} from 'cdk8s-cli/lib/plugins';

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
    const policyValidationResult: Map<string, any[]> = new Map();

    const binFilePath = path.resolve(__dirname, '..', 'bin', 'datree');
    if (!fs.existsSync(binFilePath)) {
      throw new Error(`Datree binary not found at ${binFilePath}`);
    }

    for (const manifest of context.manifests) {
      context.logger.log(`🌳 Datree validating ${manifest}`);

      const { status, output } = sync(
        binFilePath,
        [
          'test',
          manifest,
          '-p',
          this.policy,
          '-o',
          'json',
          '--verbose',
          '--skip-validation',
          'schema',
        ],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      if (status === 2) {
        output.forEach((o) => {
          if (!!o) {
            const parsed = JSON.parse(o);
            const fileName = parsed.policyValidationResults[0].fileName;
            const ruleResults = parsed.policyValidationResults[0].ruleResults;
            this.loginUrl = parsed.loginUrl;
            ruleResults.forEach((ruleResult: any) => {
              const violation = {
                fileName: fileName,
                ruleName: ruleResult.identifier,
                name: ruleResult.name,
                recommendation: ruleResult.messageOnFailure,
                fix: ruleResult.documentationUrl,
                occurrences: ruleResult.occurrencesDetails,
              };
              if (policyValidationResult.has(violation.ruleName)) {
                policyValidationResult.get(violation.ruleName)?.push(violation);
              } else {
                policyValidationResult.set(violation.ruleName, [violation]);
              }
            });
          }
        });
      }
    }

    if (policyValidationResult.size > 0) {
      let violationsMap: Map<string, any[]> = new Map();
      policyValidationResult.forEach((violations: any) => {
        violations.forEach((violation: any) => {
          const violatingResources: ValidationViolatingResource[] = [];
          const fileName = violation.fileName;
          const ruleName = violation.ruleName;
          violation.occurrences.forEach((occurrence: any) => {
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

          let prepViolation = {
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

      violationsMap.forEach((e) => {
        const mergeViolatingResources = e.reduce(
          (acc, curr) => acc.concat(curr.violatingResources),
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
