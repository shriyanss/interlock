FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir c104
COPY server.py ./
EXPOSE 2404
CMD ["python3", "server.py"]
