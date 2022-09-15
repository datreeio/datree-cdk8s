import { sync } from 'cross-spawn';
import fs from 'fs';

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

  constructor(props: DatreeValidationProps = {}) {
    this.props = props;
    if (props.policy) {
      this.policy = props.policy;
    }
  }

  public async validate(context: ValidationContext) {
    const violatingResources: ValidationViolatingResource[] = [];

    for (const manifest of context.manifests) {
      context.logger.log(`🌳 Datree validating ${manifest}`);
      // TODO: after installing datree, we need to run binary from absolute path
      const { status, output } = sync(
        `datree`,
        ['test', manifest, '-p', this.policy, '-o', 'json', '--verbose'],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      if (status === 2) {
        const policyValidationResult: any = {};
        output.forEach((o) => {
          if (!!o) {
            const parsed = JSON.parse(o);
            const fileName = parsed.policyValidationResults[0].fileName;
            const ruleResults = parsed.policyValidationResults[0].ruleResults;
            policyValidationResult[fileName] = ruleResults;
          }
        });
        let newDatreeViolations: DatreeAddViolation[] = [];
        for (const [fileName, ruleResults] of Object.entries(
          policyValidationResult
        )) {
          newDatreeViolations = newDatreeViolations.concat(
            (ruleResults as any).map((ruleResult: any) => {
              let prepViolation: ValidationViolation = {
                ruleName: ruleResult.name,
                recommendation: ruleResult.messageOnFailure,
                fix: ruleResult.documentationUrl,
                violatingResources: [] as any,
              };

              ruleResult.occurrencesDetails.forEach((occurrence: any) => {
                const { schemaPath, failedErrorLine, failedErrorColumn } =
                  occurrence.failureLocations[0];
                console.log(occurrence.metadataName);
                prepViolation.violatingResources.push({
                  resourceName: occurrence.metadataName,
                  locations: [
                    `key: ${schemaPath} (line: ${failedErrorLine}:${failedErrorColumn})`,
                  ],
                  manifestPath: fileName,
                });
              });
              context.report.addViolation(prepViolation);
            })
          );
        }
      }
    }

    context.report.submit(
      violatingResources.length > 0 ? 'failure' : 'success',
      {
        'Customize\npolicy\n':
          'https://app.datree.io/login?t=h49sD9cAHvyhxVzEJ3oajb&p=cdk8s',
      }
    );
  }
}
