// ===== Настройки (можно крутить без правки логики) =====
const APP_VERSION = 'v0.012'; // версия — поднимаем на +1 при каждом обновлении
const MAX_SIDE = 1600; // длинная сторона фото уменьшается до этого размера, px

// AI-распознавание: запрос идёт через наш прокси (Cloudflare Worker),
// модель и ключ настраиваются в worker.js
const AI_PROXY_URL = 'https://sdo.artem-yakudza.workers.dev'; // наш прокси на Cloudflare

// Версия на главном экране — видно, что сайт обновился
document.getElementById('app-version').textContent = APP_VERSION;

// ===== Элементы страницы =====
const inputCamera = document.getElementById('input-camera');
const inputGallery = document.getElementById('input-gallery');
const previewSection = document.getElementById('preview-section');
const previewImg = document.getElementById('preview-img');
const btnRetake = document.getElementById('btn-retake');
const recognizeSection = document.getElementById('recognize-section');
const btnRecognize = document.getElementById('btn-recognize');
const progressBox = document.getElementById('progress-box');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');

let currentCanvas = null; // уменьшенное фото для распознавания

// ===== Шаг 1: фото =====
inputCamera.addEventListener('change', () => handleFile(inputCamera.files[0]));
inputGallery.addEventListener('change', () => handleFile(inputGallery.files[0]));

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Это не картинка. Выберите фото.');
    return;
  }
  try {
    currentCanvas = await fileToCanvas(file);
  } catch (err) {
    alert('Не удалось открыть фото: ' + err.message);
    return;
  }
  previewImg.src = currentCanvas.toDataURL('image/jpeg', 0.85);
  previewSection.hidden = false;
  recognizeSection.hidden = false;
  hideResult();
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Читаем файл и уменьшаем до MAX_SIDE — так распознавание заметно быстрее
function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('файл не читается как изображение'));
    };
    img.src = url;
  });
}

btnRetake.addEventListener('click', () => {
  currentCanvas = null;
  previewSection.hidden = true;
  recognizeSection.hidden = true;
  hideResult();
  inputCamera.value = '';
  inputGallery.value = '';
});

// ===== Шаг 2: распознавание (OCR) =====
btnRecognize.addEventListener('click', () => recognize().catch(showOcrError));

async function recognize() {
  if (!currentCanvas) return;
  btnRecognize.disabled = true;
  progressBox.hidden = false;
  resultSection.hidden = true;
  setProgress(0, 'Подготовка…');

  await aiRecognize();

  stopIndeterminate();
  progressBox.hidden = true;
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth' }); // само прокручиваем к тексту
  btnRecognize.disabled = false;
}

// AI-распознавание: сайт → наш прокси на Cloudflare → OpenRouter
async function aiRecognize() {
  if (!AI_PROXY_URL) {
    throw new Error('AI-прокси ещё не настроен: адрес Worker не прописан в app.js');
  }
  startIndeterminate('Обработка');
  const image = currentCanvas.toDataURL('image/jpeg', 0.9);
  const resp = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = json && json.error ? json.error : 'HTTP ' + resp.status;
    throw new Error('Ошибка AI: ' + msg);
  }
  const text = json && json.choices && json.choices[0] && json.choices[0].message
    ? json.choices[0].message.content
    : '';
  if (!text || !text.trim()) {
    throw new Error('AI вернул пустой ответ');
  }
  resultText.value = text.trim();
}

function showOcrError(err) {
  console.error(err); // подробности — в консоли браузера (F12)
  stopIndeterminate();
  progressBox.hidden = false;
  setProgress(0, 'Ошибка: ' + err.message);
  btnRecognize.disabled = false;
}

function setProgress(value, text) {
  progressFill.style.width = Math.round(value * 100) + '%';
  progressText.textContent = text;
}

// Полоса «идёт работа»: заполнена целиком и анимирована (когда процентов нет — как у AI)
function startIndeterminate(text) {
  progressBar.classList.add('running');
  progressFill.style.width = '100%';
  progressText.textContent = text;
}

function stopIndeterminate() {
  progressBar.classList.remove('running');
  progressFill.style.width = '0';
}

function hideResult() {
  resultSection.hidden = true;
  resultText.value = '';
  progressBox.hidden = true;
}
