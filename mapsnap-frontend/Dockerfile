# MapSnap Frontend — lightweight static server
# Usage: docker build -t mapsnap-frontend . && docker run -p 8080:8080 mapsnap-frontend

FROM python:3.12-slim

WORKDIR /app

COPY index.html style.css app.js config.js serve.py ./

EXPOSE 8080

CMD ["python3", "serve.py"]
