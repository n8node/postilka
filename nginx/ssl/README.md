# SSL certificates (production)

Положите сюда сертификаты Let's Encrypt **перед** `make prod`:

```
fullchain.pem
privkey.pem
```

Получение (на сервере, первый раз):

```bash
# Остановить nginx если занят 80
docker compose stop nginx

sudo certbot certonly --standalone -d postilka.ru -d www.postilka.ru

sudo cp /etc/letsencrypt/live/postilka.ru/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/postilka.ru/privkey.pem ./nginx/ssl/
sudo chown $USER:$USER ./nginx/ssl/*.pem
chmod 600 ./nginx/ssl/privkey.pem
```

Renewal (webroot, nginx работает):

```bash
certbot renew --webroot -w ./nginx/certbot/www
cp /etc/letsencrypt/live/postilka.ru/*.pem ./nginx/ssl/
docker compose restart nginx
```

**Не коммитьте** `.pem` в git.
