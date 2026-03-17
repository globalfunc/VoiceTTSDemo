#!/bin/bash
set -e

echo "==> VoiceTTS entrypoint starting"

if [ -z "$APP_KEY" ]; then
    echo "ERROR: APP_KEY is not set. Generate one with: php artisan key:generate --show"
    exit 1
fi

cd /var/www/html

echo "==> Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Running migrations..."
php artisan migrate --force --no-interaction

echo "==> Creating storage symlink..."
php artisan storage:link --force 2>/dev/null || true

echo "==> Fixing permissions..."
chown -R www-data:www-data storage bootstrap/cache

echo "==> Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/voicetts.conf
