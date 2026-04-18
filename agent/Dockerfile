FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO
ENV SIM_BASE_URL=http://simulation-server:3000
ENV WEBHOOK_URL=https://hooks.example.com/ipma

CMD ["python", "main.py"]
