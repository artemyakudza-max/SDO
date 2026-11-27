// Cloudflare Worker: прокси между сайтом-сканером и OpenRouter.
// Задача: спрятать ключ API от посетителей и пересылать фото в AI.
// Ключ лежит в секрете воркера (OPENROUTER_API_KEY) — в коде его нет.

// Пускаем запросы только с нашего сайта на GitHub Pages
const ALLOWED_ORIGIN = 'https://artemyakudza-max.github.io';

// Модель распознавания на OpenRouter — меняем в одну строчку
const MODEL = 'google/gemini-2.5-pro';

// Промпт: что именно просим у AI.
// Русский промпт с чёткими правилами улучшает чтение русского текста (в т.ч. рукописного)
const PROMPT =
  'Ты — точный транскрибатор текстов. Извлеки ВЕСЬ текст с изображения ' +
  'максимально точно, буква в букву, как написано. Текст может быть ' +
  'рукописным — старайся прочитать каждое слово. Сохрани разбиение на ' +
  'строки и абзацы. Неразборчивые места помечай как [неразборчиво]. ' +
  'Отвечай сразу результатом: без рассуждений, без вступлений вроде ' +
  '«Вот текст» — только сам текст письма, без комментариев и перевода.';

// Ограничение размера фото (base64), чтобы не жгли токены гигантскими картинками
const MAX_IMAGE_LENGTH = 12 * 1024 * 1024; // ~12 МБ base64

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Браузер сначала спрашивает разрешение (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Только наш сайт может дёргать воркер — защита от чужих сайтов
    const origin = request.headers.get('Origin');
    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: 'Доступ только с сайта сканера' }, 403, cors);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Только POST' }, 405, cors);
    }

    const key = env.OPENROUTER_API_KEY;
    if (!key) {
      return json({ error: 'Ключ OPENROUTER_API_KEY не задан в секретах воркера' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Некорректный JSON' }, 400, cors);
    }

    const image = body && body.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return json({ error: 'Ожидалось поле image (data URL)' }, 400, cors);
    }
    if (image.length > MAX_IMAGE_LENGTH) {
      return json({ error: 'Фото слишком большое' }, 413, cors);
    }

    // Запрос к OpenRouter (API совместим с OpenAI chat completions)
    const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': ALLOWED_ORIGIN, // OpenRouter просит указывать сайт
        'X-Title': 'Сканер корреспонденции',
      },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { exclude: true }, // не возвращать размышления модели
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });

    const orJson = await orResp.json().catch(() => null);
    if (!orResp.ok || !orJson) {
      const msg = orJson && orJson.error
        ? (orJson.error.message || JSON.stringify(orJson.error))
        : 'нет ответа';
      return json({ error: 'OpenRouter: ' + msg }, orResp.status || 502, cors);
    }

    return json(orJson, 200, cors);
  },
};

// Ответ в JSON с CORS-заголовками
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
