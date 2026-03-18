# =============================================================
# Stage 1: builder — needs BOTH PHP (Wayfinder) and Node (Vite)
# The Wayfinder Vite plugin calls PHP internally during npm run build
# to generate TypeScript route types (which are git-ignored).
# =============================================================
FROM php:8.2-bookworm AS builder

# ---- System dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    curl \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libfreetype6-dev \
    libicu-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    libexif-dev \
    libavif-dev \
    libxpm-dev \
    && rm -rf /var/lib/apt/lists/*

# ---- Node.js 22 via NodeSource ----
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---- PHP extensions ----
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions \
    /usr/local/bin/install-php-extensions
RUN chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions \
        pdo \
        pdo_pgsql \
        pdo_sqlite \
        gd \
        zip \
        bcmath \
        pcntl \
        intl \
        mbstring \
        xml \
        curl \
        fileinfo \
        exif \
        opcache

# ---- Composer 2 ----
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# ---- PHP dependencies ----
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --classmap-authoritative \
    --no-scripts

# Copy full app source
COPY . .

# Rebuild classmap now that app classes (App\Providers\*, etc.) are present.
# The initial composer install built the classmap without them.
RUN composer dump-autoload --optimize --classmap-authoritative --no-interaction

# Clear any locally-generated bootstrap cache (may reference dev packages like Pail
# that aren't installed with --no-dev, causing package:discover to fail)
RUN rm -f bootstrap/cache/packages.php bootstrap/cache/services.php

# Run post-autoload-dump scripts manually (skipped above with --no-scripts)
RUN php artisan package:discover --ansi

# ---- Node dependencies ----
RUN npm ci --no-audit --prefer-offline

# ---- Build frontend assets ----
# Wayfinder Vite plugin runs php artisan wayfinder:generate during this step.
# VITE_* vars are embedded into the JS bundle at build time.
ARG VITE_APP_NAME=VoiceTTS
ARG VITE_REVERB_APP_KEY=voicetts-key
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8080
ARG VITE_REVERB_SCHEME=http

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build

# =============================================================
# Stage 2: final — lean runtime image
# =============================================================
FROM php:8.2-fpm-bookworm AS final

LABEL org.opencontainers.image.source="https://github.com/globalfunc/VoiceTTSDemo"
LABEL org.opencontainers.image.description="VoiceTTS Laravel application"

# ---- Runtime system dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    ffmpeg \
    libpq5 \
    libzip4 \
    libpng16-16 \
    libjpeg62-turbo \
    libwebp7 \
    libfreetype6 \
    libxpm4 \
    libavif15 \
    libicu72 \
    libxml2 \
    libcurl4 \
    libexif12 \
    && rm -rf /var/lib/apt/lists/*

# ---- Copy PHP extensions from builder ----
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

# ---- PHP production config ----
RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini

# OPcache tuning for production (timestamps disabled — files are immutable in container)
RUN { \
    echo "opcache.enable=1"; \
    echo "opcache.memory_consumption=256"; \
    echo "opcache.max_accelerated_files=20000"; \
    echo "opcache.validate_timestamps=0"; \
    echo "opcache.save_comments=1"; \
} > /usr/local/etc/php/conf.d/opcache-prod.ini

WORKDIR /var/www/html

# ---- Copy application from builder ----
COPY --from=builder --chown=www-data:www-data /app /var/www/html

# ---- Copy built frontend assets ----
COPY --from=builder --chown=www-data:www-data /app/public/build /var/www/html/public/build

# ---- Docker support files ----
COPY docker/nginx.conf /etc/nginx/sites-available/voicetts
COPY docker/supervisord.conf /etc/supervisor/conf.d/voicetts.conf
COPY docker/entrypoint.sh /entrypoint.sh

RUN ln -sf /etc/nginx/sites-available/voicetts /etc/nginx/sites-enabled/voicetts \
    && rm -f /etc/nginx/sites-enabled/default \
    && chmod +x /entrypoint.sh

# ---- Storage directories ----
RUN mkdir -p \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# ---- Runtime environment defaults ----
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning

EXPOSE 80 8080

ENTRYPOINT ["/entrypoint.sh"]
