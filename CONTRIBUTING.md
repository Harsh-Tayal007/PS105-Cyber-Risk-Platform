# Contributing to PS105

Thank you for your interest in contributing to the **PS105 Cyber Risk Quantification & Security Investment Optimization Platform**.

This document outlines the development workflow, branching policy, commit message conventions, and testing requirements for contributors.

---

## 1. Code of Conduct & Principles

* **Maintain Mathematical & Empirical Rigor:** Never alter quantitative equations or statistical assumptions without theoretical justification, peer review, and updated unit test assertions.
* **Preserve Architectural Modularity:** Adhere to the separation of concerns:
  * Engines (`backend/app/engines/`) must remain pure calculation libraries free from database and HTTP coupling.
  * Services (`backend/app/services/`) coordinate orchestration, persistence, and external data pipelines.
  * API routers (`backend/app/api/routes/`) handle HTTP request validation and status codes.
  * Frontend components (`frontend/src/components/`) maintain semantic UI tokens and accessibility.
* **No Unsubstantiated Claims:** PS105 uses a **FAIR-inspired quantitative methodology** and deterministic/stochastic engines. Never claim "FAIR certified", "ISO 27005 compliant", or "active network scanning".

---

## 2. Development Setup

### Backend (Python 3.13)
```bash
# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install production and development dependencies
pip install -r backend/requirements.txt
pip install -r backend/requirements-dev.txt

# Seed synthetic demonstration data
python -m backend.app.database.seed

# Run local development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (Node 22.x, React 19, Vite, Tailwind v4)
```bash
cd frontend

# Install exact dependencies
npm ci

# Launch Vite development server
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## 3. Git Branching Model

* `main`: Protected production release branch. All commits arrive via tested Pull Requests.
* Branch naming conventions:
  * `feature/<short-description>` (e.g., `feature/monte-carlo-gpu-acceleration`)
  * `fix/<bug-identifier>` (e.g., `fix/exceedance-curve-tick-formatting`)
  * `docs/<topic>` (e.g., `docs/mathematical-specification-update`)
  * `refactor/<scope>` (e.g., `refactor/pulp-solver-isolation`)
  * `test/<scope>` (e.g., `test/multi-tenant-isolation-boundary`)

---

## 4. Conventional Commit Messages

Every commit must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and changes]

[optional footer(s)]
```

### Approved Types
* `feat`: A new user-facing capability or analytical engine
* `fix`: A bug fix in calculation, API, or UI presentation
* `docs`: Documentation updates, README improvements, docstrings
* `test`: Adding missing tests or refactoring test suites
* `chore`: Build scripts, dependency updates, configuration
* `refactor`: Code changes that neither fix a bug nor add a feature
* `perf`: Performance improvements (e.g., vectorization, caching)

### Examples
* `feat(optimization): implement multi-scenario budget frontier calculation`
* `fix(report): prevent token overflow in vulnerability findings table`
* `test(backend): add coverage for 2^8 exhaustive optimization validator`
* `docs(readme): add academic context and viva walkthrough guide`

---

## 5. Pre-Submission Checklist

Before submitting a Pull Request, ensure all local verification checks pass:

```bash
# 1. Run all backend pytest suites (must pass 100%)
pytest backend/tests/ -v

# 2. Run frontend linting (must report 0 errors)
cd frontend
npm run lint

# 3. Run frontend test suite (must pass 100%)
npm test

# 4. Run frontend production build (must succeed without syntax errors)
npm run build
```

---

## 6. Submitting a Pull Request

1. Fork the repository and create your branch from `main`.
2. Follow coding standards and formatting.
3. Ensure commit messages are descriptive and structured.
4. Open a Pull Request referencing relevant issues or milestones.
5. Provide a summary of changes, motivation, and test evidence in the PR description.
