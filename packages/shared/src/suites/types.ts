export type TestCaseDifficulty = "easy" | "medium" | "hard";
export type TestCaseType = "bug" | "feature";
export type ExpectedVerdict = "should-pass" | "should-fail";

export type QaTestCase = {
  id: string;
  branchPrefix: string;
  branchNameHint: string;
  title: string;
  difficulty: TestCaseDifficulty;
  type: TestCaseType;
  expectedVerdict: ExpectedVerdict;
};

export type QaSuite = {
  id: string;
  title: string;
  repository: { owner: string; name: string };
  cases: QaTestCase[];
};

export type RunTestCaseMatch = {
  suiteId: string;
  testCaseId: string;
  testCase: QaTestCase;
};
