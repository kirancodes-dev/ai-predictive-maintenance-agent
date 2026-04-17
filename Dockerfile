FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.8.3

WORKDIR /app

RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"

COPY pyproject.toml ./
RUN poetry config virtualenvs.create false && poetry install --no-root --only main

COPY . .

EXPOSE 8000

CMD ["uvicorn", "predictive_maintenance.api:app", "--host", "0.0.0.0", "--port", "8000"]
