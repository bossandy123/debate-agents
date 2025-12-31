<!--
SYNC IMPACT REPORT
==================
Version Change: Initial → 1.1.0
Modified Principles: N/A
Added Sections:
  - Core Principles (4 principles: Code Quality, User Experience Consistency, Performance, Documentation Language)
  - Quality Standards
  - Development Workflow
  - Governance
Removed Sections: N/A
Templates Requiring Updates:
  - .specify/templates/plan-template.md (Constitution Check section) - Updated with new gates
  - .specify/templates/spec-template.md (Requirements section) - Updated with quality/UX/performance constraints
  - .specify/templates/tasks-template.md - Updated with quality/performance task categories
Follow-up TODOs: None
-->

# Debate Agents Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code MUST meet these standards before merging:

- **Type Safety**: All code MUST use strict type checking. Implicit `any` types are forbidden.
- **Linting**: Code MUST pass linting with zero errors. Warnings MUST be justified or fixed.
- **Testing**: Critical paths MUST have tests. Tests MUST be maintained alongside code changes.
- **Documentation**: Public APIs MUST be documented with clear examples. Complex logic MUST be commented.
- **Code Review**: All changes MUST undergo peer review before merging to main branch.
- **Style Consistency**: Code MUST follow project formatting standards (auto-format on save).

**Rationale**: High-quality code prevents bugs, enables maintenance, and reduces technical debt.

### II. User Experience Consistency

User-facing behavior MUST be predictable and consistent:

- **Interface Stability**: Breaking changes to user interfaces require migration paths and version bumps.
- **Error Handling**: Errors MUST provide clear, actionable messages. Never expose stack traces to end users.
- **Response Format**: API responses MUST follow consistent structure across all endpoints.
- **Feedback Loops**: User actions MUST provide feedback (success/error) within 200ms for perceived responsiveness.
- **Accessibility**: User interfaces MUST be accessible (keyboard navigation, screen reader support).
- **Localization**: User-facing text MUST support internationalization; no hardcoded strings in output.

**Rationale**: Consistent UX builds trust, reduces support burden, and ensures reliable user interactions.

### III. Performance Requirements

Performance is a feature, not an afterthought:

- **Response Time**: API endpoints MUST respond within specified SLA (p95 < 500ms for standard requests).
- **Resource Limits**: Memory usage MUST stay within documented bounds. No unbounded growth.
- **Caching**: Frequently accessed data MUST be cached appropriately with proper invalidation.
- **Database Queries**: N+1 queries are forbidden. All queries MUST use proper indexes and limits.
- **Async Operations**: Long-running operations (> 1s) MUST use async patterns with progress feedback.
- **Monitoring**: Performance metrics MUST be logged and monitored for regression detection.

**Rationale**: Performance directly impacts user satisfaction and system scalability.

### IV. Documentation Language (NON-NEGOTIABLE)

All project documentation MUST be written in Chinese:

- **Specification Documents**: Feature specifications (spec.md) MUST be written in Chinese.
- **Implementation Plans**: Project plans (plan.md) MUST be written in Chinese.
- **Task Lists**: Task descriptions (tasks.md) MUST be written in Chinese.
- **Code Comments**: Public API documentation MUST be in Chinese. Inline code comments SHOULD be in Chinese.
- **User Documentation**: README, guides, and help text MUST be in Chinese.
- **Technical Terms**: English technical terms may be used when no appropriate Chinese translation exists.

**Rationale**: Chinese documentation ensures consistent communication within the project team and aligns with stakeholder language preferences.

## Quality Standards

### Static Analysis

- All code MUST pass static analysis tools before merge
- Security vulnerabilities MUST be addressed immediately
- Code coverage reports MUST be generated for changes

### Runtime Quality

- Error rates MUST remain below 0.1% for critical operations
- System uptime MUST meet documented SLA targets
- Degradation MUST trigger alerts and automated rollback

### Documentation Quality

- All documentation MUST pass language and grammar review
- Technical accuracy MUST be verified before publication
- Documentation MUST be kept in sync with code changes

## Development Workflow

### Before Implementation

1. Feature specification MUST be approved (written in Chinese)
2. Impact assessment MUST be completed
3. Performance implications MUST be evaluated

### During Development

1. Tests MUST be written first (TDD for critical paths)
2. Code MUST be peer-reviewed before merge
3. Documentation MUST be updated alongside code (in Chinese)

### After Deployment

1. Performance metrics MUST be monitored
2. User feedback MUST be collected and triaged
3. Issues MUST be prioritized by severity and impact

## Governance

### Amendment Procedure

- Constitution changes require proposal justification
- Changes MUST be reviewed and approved by project maintainers
- Version MUST be incremented according to semantic versioning

### Compliance Review

- All pull requests MUST verify constitution compliance
- Violations MUST be documented with explicit justification
- Recurring violations trigger constitution review

### Versioning Policy

- **MAJOR**: Principle removals or backward-incompatible governance changes
- **MINOR**: New principles or expanded guidance sections
- **PATCH**: Clarifications, wording improvements, non-semantic changes

### Runtime Guidance

For development-specific questions and implementation patterns, refer to project documentation in `docs/` and README.md.

---

**Version**: 1.1.0 | **Ratified**: 2025-12-31 | **Last Amended**: 2025-12-31
