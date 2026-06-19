import { luggageCarouselSuite } from "./luggage-carousel.js";
import type { QaSuite, RunTestCaseMatch } from "./types.js";

export * from "./types.js";
export { luggageCarouselSuite } from "./luggage-carousel.js";

const suites: QaSuite[] = [luggageCarouselSuite];

export function getAllSuites(): QaSuite[] {
  return suites;
}

export function getSuiteById(id: string): QaSuite | undefined {
  return suites.find((suite) => suite.id === id);
}

export function matchRunToTestCase(
  headRef: string | null | undefined,
  owner: string,
  repo: string,
): RunTestCaseMatch | null {
  if (!headRef) return null;

  for (const suite of suites) {
    if (
      suite.repository.owner !== owner ||
      suite.repository.name !== repo
    ) {
      continue;
    }

    for (const testCase of suite.cases) {
      if (headRef.startsWith(testCase.branchPrefix)) {
        return {
          suiteId: suite.id,
          testCaseId: testCase.id,
          testCase,
        };
      }
    }
  }

  return null;
}
