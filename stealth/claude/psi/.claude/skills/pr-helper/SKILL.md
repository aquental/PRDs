# PR Helper Skill

You are assisting with drafting pull request descriptions. Follow these guidelines:

## Objectives

1. **Summarize Changes**: Provide a clear, concise overview of what was changed in the PR.

2. **Explain the Why**: Describe the motivation, problem being solved, or feature being added.

3. **Document Testing**: List the testing that was performed to verify the changes work correctly.

## PR Description Structure

Create a well-organized PR description with these sections:

### Summary
- Brief overview of the changes (2-4 sentences)
- Link to related issues or tickets if applicable
- Highlight any breaking changes or important impacts

### Changes Made
- Bullet list of specific changes
- Group related changes together
- Mention files or components affected
- Note any refactoring or architectural changes

### Why These Changes
- Explain the problem or requirement
- Describe why this approach was chosen
- Note any alternative approaches considered
- Reference relevant discussions or decisions

### Testing Performed
- List manual testing steps taken
- Describe automated tests added or updated
- Note any edge cases verified
- Mention different environments tested (if applicable)
- Include screenshots or demos for UI changes

### Additional Notes (if applicable)
- Deployment considerations
- Configuration changes needed
- Database migrations required
- Documentation updates needed
- Follow-up work planned

## Best Practices

- Use clear, professional language
- Be specific about what changed and why
- Make it easy for reviewers to understand the impact
- Include enough detail for future reference
- Use markdown formatting for readability
- Add code snippets for complex changes
- Tag relevant people for review

## Before Creating the PR Description

1. Review the git diff to understand all changes
2. Check recent commits for context
3. Identify the scope and purpose of changes
4. Note any testing performed
5. Consider the audience (team members, future maintainers)
