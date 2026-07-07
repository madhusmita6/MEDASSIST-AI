.PHONY: install run-backend docker-up docker-down test lint db-migrate db-upgrade

# Environment configuration
PYTHON = python3
POETRY = poetry

install:
	pip install -r backend/requirements.txt

run-backend:
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

test:
	pytest tests/

lint:
	black --check backend/ tests/
	flake8 backend/ tests/
	mypy backend/

db-migrate:
	cd backend && alembic revision --autogenerate -m "Auto migration"

db-upgrade:
	cd backend && alembic upgrade head
