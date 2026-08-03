FROM wordpress:6-php8.3-apache

RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
    chmod +x wp-cli.phar && \
    mv wp-cli.phar /usr/local/bin/wp

COPY conf/forwarded-https.conf /etc/apache2/conf-available/forwarded-https.conf
COPY conf/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY docker-entrypoint-custom.sh /usr/local/bin/docker-entrypoint-custom.sh
RUN a2enconf forwarded-https && \
    chmod +x /usr/local/bin/docker-entrypoint-custom.sh && \
    mkdir -p /var/www/html/wp-content/uploads && \
    chown -R www-data:www-data /var/www/html/wp-content

ENTRYPOINT ["docker-entrypoint-custom.sh"]
CMD ["apache2-foreground"]
