import { spawnSync } from 'child_process';
import type {
  Validation,
  ValidationContext,
  ValidationViolatingResource,
} from 'cdk8s-cli/lib/plugins';

export interface DatreeValidationProps {
  readonly policy?: string;
}

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
      context.logger.log(`validating manifest: ${manifest}`);
      // TODO: after installing datree, we need to run binary from absolute path
      const datreeOutput = spawnSync(
        `datree`,
        ['test', manifest, '-o', 'json', '-p', this.policy, '--verbose'],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      let parseOutput = datreeOutput.output?.map((output) => {
        if (output) {
          return JSON.parse(decodeURIComponent(output));
        }
      });

      // TODO: parse data to match the ouput https://github.com/cdk8s-team/cdk8s/blob/epolon/manifest-validation/docs/cli/synth.md#private-validation-plugins
      // TODO: report violations example:
      // context.report.addViolation({
      //   ruleName:
      //     'Ensure deployment-like resource is using a valid restart policy',
      //   recommendation:
      //     'Incorrect value for key `restartPolicy` - any other value than `Always` is not supported by this resource',
      //   violatingResources: violatingResources,
      //   fix: 'https://hub.datree.io/built-in-rules/ensure-valid-restart-policy',
      // });
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
