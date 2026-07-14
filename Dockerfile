FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/build ./frontend/build

EXPOSE 8000
CMD ["sh", "-c", "python backend/manage.py migrate && daphne -b 0.0.0.0 -p 8000 comments_backend.asgi:application"]
