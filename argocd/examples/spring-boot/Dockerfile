# Multi-stage Dockerfile for Spring Boot Application
# Optimized for production use with security best practices

# ====================================
# Build Stage
# ====================================
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app

# Copy gradle configuration
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Download dependencies (cached layer)
RUN gradle dependencies --no-daemon

# Copy source code
COPY src ./src

# Build application
RUN gradle bootJar --no-daemon

# ====================================
# Runtime Stage
# ====================================
FROM eclipse-temurin:17-jre-alpine

# Metadata
LABEL maintainer="your-email@example.com"
LABEL description="Spring Boot Application"
LABEL version="1.0.0"

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Copy JAR from builder
COPY --from=builder --chown=spring:spring /app/build/libs/*.jar app.jar

# Switch to non-root user
USER spring:spring

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Environment variables
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC" \
    SPRING_PROFILES_ACTIVE=default

# Expose port
EXPOSE 8080

# Run application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
