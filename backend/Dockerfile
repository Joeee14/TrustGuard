# Use the official Playwright image — it has ALL system libraries pre-installed
# (libglib, libnss3, libatk, etc.) so we never need --with-deps or root access.
FROM mcr.microsoft.com/playwright/python:v1.51.0-jammy

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright browsers are already installed in the base image — no extra install step needed

# Copy backend source
COPY . .

# Render passes the port via $PORT
ENV PYTHONIOENCODING=utf-8
EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
