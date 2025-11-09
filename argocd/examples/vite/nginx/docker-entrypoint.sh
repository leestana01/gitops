#!/bin/sh
set -e

echo "Starting Vite application..."

# Environment variable substitution (if needed)
# envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
# mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx
echo "Starting nginx..."
exec "$@"
