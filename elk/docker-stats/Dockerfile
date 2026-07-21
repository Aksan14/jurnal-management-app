FROM python:3.11-alpine
RUN apk add --no-cache docker-cli
COPY collector.py /collector.py
CMD ["python", "/collector.py"]
