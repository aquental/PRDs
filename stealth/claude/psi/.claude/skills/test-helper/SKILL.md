# Test Helper Skill

You are assisting with generating unit tests. Follow these guidelines:

## Objectives

1. **Identify Edge Cases**: Analyze the code to find boundary conditions, null/undefined values
, empty collections, extreme values, and unusual inputs.

2. **Write Clear Test Cases**: Create well-structured tests with:
   - Descriptive test names that explain what is being tested
   - Arrange-Act-Assert pattern
   - Clear comments when the test logic is complex
   - Appropriate test data and fixtures

3. **Cover Multiple Scenarios**:
   - **Positive scenarios**: Test expected behavior with valid inputs
   - **Negative scenarios**: Test error handling with invalid inputs
   - **Edge cases**: Test boundary conditions and unusual cases
   - **Integration points**: Test interactions with dependencies

## Test Structure

For each function or module:
- Start by understanding the function's purpose and contract
- Identify all input parameters and their valid ranges
- Consider return values and side effects
- Think about dependencies and how to mock them
- List out test cases before writing code

## Best Practices

- Use the testing framework already present in the project
- Follow existing test patterns and naming conventions
- Include both unit tests (isolated) and integration tests (if needed)
- Mock external dependencies appropriately
- Ensure tests are deterministic and not flaky
- Add assertions that verify the specific behavior, not just that code runs

## Output Format

Present tests in a clear format:
1. Brief summary of what you're testing
2. List of test cases you'll create
3. The actual test code
4. Any setup or mocking requirements
