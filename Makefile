.PHONY: help install dev pull up test build clean reset version

# ─── Defaults ─────────────────────────────────────────────────────────────
PYTHON ?= python3
PNPM ?= pnpm

help:
	@echo "PoseLab — quick commands"
	@echo
	@echo "  make install     create venv + install all deps (one-time)"
	@echo "  make dev         start both servers (http://localhost:3030)"
	@echo "  make pull        git pull → reinstall deps if changed"
	@echo "  make up          shorthand for: pull + dev (stay on latest)"
	@echo "  make version     show the running git commit"
	@echo "  make build       production build (web side)"
	@echo "  make test        run the FastAPI import sanity check + web build"
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

# ─── Stay on latest ───────────────────────────────────────────────────────
pull:
	@echo "→ pulling latest"
	git pull
	@echo "→ syncing API deps (no-op if unchanged)"
	@if [ -d api/.venv ]; then api/.venv/bin/pip install --quiet -r api/requirements.txt; fi
	@echo "→ syncing web deps (no-op if unchanged)"
	@if [ -d web/node_modules ]; then cd web && $(PNPM) install --silent; fi
	@echo "✓ on $$(git rev-parse --short HEAD) — '$(git log -1 --pretty=%s)'"

up: pull dev

version:
	@echo "git: $$(git rev-parse --short HEAD) — $$(git log -1 --pretty=%s)"
	@if curl -s http://localhost:8000/version > /dev/null 2>&1; then \
		echo "running server: $$(curl -s http://localhost:8000/version | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"{d[\\\"version\\\"]} @ {d[\\\"git_rev\\\"]}\")')"; \
	else \
		echo "running server: (not running — start with 'make dev')"; \
	fi

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
