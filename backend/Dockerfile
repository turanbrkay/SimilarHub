FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# zlib1g-dev is required for zlib-state
# libjpeg-dev is required for image processing
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    zlib1g-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download NLTK data
RUN python -m nltk.downloader stopwords punkt

# Expose port
EXPOSE 5000

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "app:app"]
