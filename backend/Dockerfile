FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# libgomp1 is often needed for faiss/numpy optimizations
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
# Add missing dependencies manually for now to ensure they are installed
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir \
    flask \
    gunicorn \
    numpy \
    faiss-cpu \
    rank_bm25 \
    nltk

# Copy application code
COPY . .

# Download NLTK data
RUN python -m nltk.downloader stopwords punkt

# Expose port
EXPOSE 5000

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "app:app"]
