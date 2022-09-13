const world = "cdk8s";

export function hello(who: string = world): string {
  return `Hello ${who}! `;
}
