## Description

Provide a clear and concise summary of the changes proposed in this Pull Request.

Fixes #(issue)

---

## Type of Change

Please delete options that are not relevant:

- [ ] `bugfix`: Bug fix (non-breaking change which fixes an issue)
- [ ] `feature`: New feature (non-breaking change which adds analytical capability)
- [ ] `refactor`: Code restructuring without modifying functionality
- [ ] `perf`: Performance or memory efficiency improvement
- [ ] `docs`: Documentation update or addition
- [ ] `test`: New or modified tests

---

## Pre-Submission Verification Checklist

Verify that all checks pass locally before requesting a review:

- [ ] Backend tests passing (`pytest backend/tests/ -v`)
- [ ] Frontend linting passing (`npm run lint` with 0 errors)
- [ ] Frontend tests passing (`npm test`)
- [ ] Frontend production build succeeds (`npm run build`)
- [ ] No hardcoded secrets, personal passwords, or local `.db` files included
- [ ] Verified that formulas, assumptions, and mathematical logic remain rigorous
