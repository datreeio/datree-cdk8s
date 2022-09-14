import { spawnSync } from 'child_process';

export interface DatreeValidationProps {
  readonly policy?: string;
}

export class DatreeValidation {
  private readonly props: DatreeValidationProps;
  private policy: string = 'Default';

  constructor(props: DatreeValidationProps = {}) {
    this.props = props;
    if (props.policy) {
      this.policy = props.policy;
    }
  }

  public async validate(context: any) {
    const violatingResources: any[] = [];

    for (const manifest of context.manifests) {
      context.logger.log(`validating manifestt: ${manifest}`);
      const datreeOutput = spawnSync(
        `./bin/datree`,
        ['test', manifest, '-o', 'json'],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      context.logger.log(JSON.stringify(datreeOutput));

      let parseOutput = datreeOutput.output?.map((output) => {
        if (output === '' || output === null) return;
        else return JSON.parse(output);
      });

      context.logger.log(JSON.stringify(parseOutput));
    }

    // if any violating resources are found, add a violation
    // to the report.

    context.report.addViolation({
      ruleName:
        'Ensure deployment-like resource is using a valid restart policy',
      recommendation:
        'Incorrect value for key `restartPolicy` - any other value than `Always` is not supported by this resource',
      violatingResources: violatingResources,
      fix: 'https://hub.datree.io/built-in-rules/ensure-valid-restart-policy',
    });

    context.report.submit(
      violatingResources.length > 0 ? 'failure' : 'success',
      {
        Signup: 'https://app.datree.io/login?t=h49sD9cAHvyhxVzEJ3oajb&p=cdk8s',
      }
    );
  }
}
