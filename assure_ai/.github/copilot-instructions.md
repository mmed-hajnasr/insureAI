# AI Agent Instructions for insta_dash_agents

## Project Overview
FastAPI-based agent service that helps users design management systems through multi-step AI-guided workflows. The service validates user inputs, suggests features, and generates data model graphs using Pydantic AI agents with Mistral models.

## Architecture

### Multi-Step Workflow
The service implements a sequential 3-step workflow where each step validates input before generating the next step's output:
- **Step 1** (`/step1`): Validates user's system description → generates feature suggestions
- **Step 2** (`/step2`): Validates selected features → generates data model graph
- Each step has a dedicated agent pair: validator + generator

### Agent Pattern (Pydantic AI)
All AI agents follow this structure (`agents/step*.py`):
```python
agent: Agent[Deps, OutputType] = Agent(
    model=small_model,  # or medium_model (Mistral)
    output_type=Step2Setup,  # Pydantic model
    deps_type=Deps,  # Contains ProjectDataFetcher + step number
    system_prompt=PROMPT,
    model_settings={"temperature": 0.25, "top_p": 1},
    instrument=True,  # Auto-enables Langfuse tracing
)
```
- Use `@agent.output_validator` for post-generation validation (see `step3_agents.py:validate_graph_entities`)
- Use `@agent.system_prompt` decorators for dynamic prompts based on deps (see `validator.py:system_prompt`)
- Always set `instrument=True` for Langfuse tracing

### Token Budget Management
Critical pattern in all endpoints (`web/steps/*.py`):
```python
# Validate first, track tokens used
validation_response, validation_tokens = await validate_step1(payload, deps, token_limit)
# Calculate remaining tokens for next agent
remaining_tokens = token_limit - validation_tokens
# Run generator with remaining budget
step2_setup, gen_tokens = await gen_step2(payload, deps, remaining_tokens)
```

### Dependencies & Data Access
- `Deps` dataclass: Contains `ProjectDataFetcher` (DB accessor) + `step` (int for dynamic prompts)
- Update `deps.step` between validation and generation: `deps.step = 2` after step1 validation
- Database: PostgreSQL via async psycopg pool (`app.state.db_pool`)

## Development Workflow

### Running the Application
```bash
# Install dependencies (uses uv, NOT pip)
uv sync --locked

# Start infrastructure (Postgres + Jaeger for tracing)
docker compose up -d

# Run locally
uv run -m insta_dash_agents
```

### Testing
```bash
# Run tests (pytest with specific env vars - see pyproject.toml)
uv run pytest

# Tests use mock deps - see tests/test_step3_agents.py for pattern
```

### Environment Configuration
Settings use prefix `AGENTS_` (not `INSTA_DASH_AGENTS_`):
- `AGENTS_DATABASE_HOST`, `AGENTS_MISTRAL_API_KEY`, etc.
- See `settings.py:SettingsConfigDict(env_prefix="AGENTS_")`

## Critical Patterns

### Observability Stack
Three integrated tracing systems initialized in `web/lifespan.py`:
1. **OpenTelemetry** (`tracing/config.py`): W3C TraceContext propagation for distributed tracing with Rust backend. MUST call `set_global_textmap(TraceContextTextMapPropagator())` before creating spans.
2. **Langfuse**: Auto-instruments Pydantic AI agents via `Agent.instrument_all()` when `instrument=True`
3. **Structlog** (`tracing/logging.py`): Auto-adds trace_id/span_id to logs for correlation

Use `@trace_span()` decorator for custom spans:
```python
@trace_span("Custom operation")
async def my_function():
    set_span_attributes(project_id="123", custom_field="value")
```

**Span naming**: Use descriptive business operation names for `@trace_span()` on business-heavy functions:
- ✅ `@trace_span("Generating features")` on `gen_step2()`
- ✅ `@trace_span("Validating user input")` on `validate_step1()`
- ❌ `@trace_span("step2")` or `@trace_span("function_name")`

### Logging Guidelines
**Critical**: Follow strict logging level discipline:
- `logger.warn()`: Use when something unexpected happens but does NOT cause errors (e.g., missing optional data, fallback behavior triggered)
- `logger.error()`: Use when an unexpected error occurs (exceptions, failures)
- `logger.info()`: **NEVER use in code** - reserved for human operators only (error responses auto-log via `__init__`)

### Response Types
All endpoints return `SuccessResponse | ErrorResponse` where `ErrorResponse` is:
- `ContextError`: Validation failures (unclear/not_feasible)
- `TokenExceededError`: Budget exceeded
Both auto-log via `__init__` using structlog

### Pydantic Model Validation
For runtime validation with retries, use `@field_validator` with `ModelRetry`:
```python
@field_validator("name")
@classmethod
def validate_snake_case(cls, v: str) -> str:
    if not re.match(r"^[a-z][a-z0-9_]*$", v):
        raise ModelRetry(f"Must be snake_case (got: '{v}')")
    return v
```

### Prompts Organization
All prompts in `agents/prompts.py` use modular composition:
- Shared components: `SYSTEM_CAPABILITIES`, `VALIDATOR_RULES`
- Build functions: `build_validator_prompt(task_and_goal)`
- Step-specific tasks combined with shared rules

## Code Quality

### Type Checking
Strict mypy enabled (`pyproject.toml`):
- `python_version = "3.13"`, `strict = true`
- Use explicit type annotations on all functions
- Async functions: `async def func() -> Type:`

### Linting
Ruff with extensive ruleset (E, F, W, D, ANN, S, B, etc.):
- Docstrings required (D rules)
- Type annotations required (ANN)
- Security checks enabled (S - Bandit)

### Imports
Use absolute imports from package root: `from insta_dash_agents.agents.llm_model import Deps`
