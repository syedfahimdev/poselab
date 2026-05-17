.PHONY: help install dev test build clean reset

# ─── Defaults ─────────────────────────────────────────────────────────────
PYTHON ?= python3
PNPM ?= pnpm

help:
	@echo "PoseLab — quick commands"
	@echo
	@echo "  make install     create venv + install all deps (one-time)"
	@echo "  make dev         start both servers (http://localhost:3030)"
	@echo "  make build       production build (web side)"
	@echo "  make test        run the FastAPI import sanity check"
	@echo "  make clean       remove .venv, node_modules, .next, runtime data"
	@echo "  make reset       wipe local data (uploads + db) but keep deps"
	@echo

# ─── One-time setup ───────────────────────────────────────────────────────
install: api/.venv web/node_modules
	@echo "✓ install complete — run 'make dev'"

api/.venv:
	$(PYTHON) -m venv api/.venv
	api/.venv/bin/pip install --upgrade pip
	api/.venv/bin/pip install -r api/requirements.txt

web/node_modules:
	cd web && $(PNPM) install

# ─── Run both servers ─────────────────────────────────────────────────────
dev:
	./scripts/dev.sh

# ─── Build / test ─────────────────────────────────────────────────────────
build:
	cd web && $(PNPM) build

test:
	@echo "→ FastAPI import sanity"
	cd api && .venv/bin/python -c "from main import app; print(f'✓ {app.title} v{app.version} imports cleanly')"
	@echo "→ Next.js production build"
	cd web && $(PNPM) build

# ─── Cleanup ──────────────────────────────────────────────────────────────
clean:
	rm -rf api/.venv api/__pycache__ api/data
	rm -rf web/.next web/node_modules
	@echo "✓ clean — run 'make install' to rebuild"

reset:
	rm -rf api/data
	@echo "✓ runtime data wiped — uploads, db, daily counters all gone"
