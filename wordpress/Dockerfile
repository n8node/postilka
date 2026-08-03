FROM wordpress:6-php8.3-apache

# raw.githubusercontent.com часто недоступен с RU VPS — несколько зеркал + retry
RUN set -eux; \
    installed=0; \
    for url in \
      "https://cdn.jsdelivr.net/gh/wp-cli/builds@gh-pages/phar/wp-cli.phar" \
      "https://github.com/wp-cli/wp-cli/releases/download/v2.11.0/wp-cli-2.11.0.phar" \
      "https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar"; \
    do \
      echo "Trying wp-cli from: $url"; \
      if curl -fsSL --connect-timeout 30 --max-time 180 --retry 3 --retry-delay 5 \
          -o /usr/local/bin/wp "$url"; then \
        chmod +x /usr/local/bin/wp; \
        wp --info --allow-root; \
        installed=1; \
        break; \
      fi; \
    done; \
    if [ "$installed" -ne 1 ]; then \
      echo "ERROR: could not download wp-cli from any mirror"; \
      exit 1; \
    fi

COPY conf/forwarded-https.conf /etc/apache2/conf-available/forwarded-https.conf
COPY conf/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY docker-entrypoint-custom.sh /usr/local/bin/docker-entrypoint-custom.sh
RUN a2enconf forwarded-https && \
    chmod +x /usr/local/bin/docker-entrypoint-custom.sh && \
    mkdir -p /var/www/html/wp-content/uploads && \
    chown -R www-data:www-data /var/www/html/wp-content

ENTRYPOINT ["docker-entrypoint-custom.sh"]
CMD ["apache2-foreground"]
