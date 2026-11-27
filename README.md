# Сканер корреспонденции

Веб-приложение: фотографируешь письмо (корреспонденцию) — получаешь машиночитаемый текст.
Распознавание (OCR) идёт прямо в браузере через Tesseract.js — фото никуда не отправляется.

## Открыть с телефона
После включения GitHub Pages сайт доступен по адресу:
`https://<твой-логин>.github.io/<имя-репозитория>/`

## Как выложить на GitHub Pages (один раз)
1. Зайди на https://github.com/new
2. Repository name: например `correspondence-scanner`. Public. Нажми **Create repository**.
3. В терминале в папке проекта:
   ```
   git remote add origin https://github.com/<твой-логин>/correspondence-scanner.git
   git push -u origin main
   ```
4. На сайте репозитория: **Settings → Pages → Branch: main, папка / (root) → Save**.
5. Через 1–2 минуты сайт откроется по ссылке из пункта выше.

## Как обновлять сайт
```
git add -A
git commit -m "что изменил"
git push
```
После `git push` изменения на сайте появятся через 1–2 минуты.

## Локальный запуск
- На компьютере: двойной клик по `index.html`.
- На телефоне до выкладки: `python -m http.server 8000`, затем открыть
  `http://<IP-компьютера>:8000` (телефон в той же Wi-Fi сети).
