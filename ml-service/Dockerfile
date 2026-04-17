FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python -m app.train.synthetic_generator && \
    python -m app.train.train_premium && \
    python -m app.train.train_fraud && \
    python -m app.train.train_forecast
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
