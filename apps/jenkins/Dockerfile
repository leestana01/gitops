FROM docker.io/jenkins/jenkins:lts-jdk21
USER root
RUN apt-get update -q \
    && apt-get install -y --no-install-recommends fontconfig \
    && fc-cache -f \
    && chown -R 1000:1000 /var/cache/fontconfig \
    && rm -rf /var/lib/apt/lists/*
USER jenkins
