// ===== Настройки (можно крутить без правки логики) =====
const MAX_SIDE = 1600; // длинная сторона фото уменьшается до этого размера, px

// ===== Элементы страницы =====
const inputCamera = document.getElementById('input-camera');
const inputGallery = document.getElementById('input-gallery');
const previewSection = document.getElementById('preview-section');
const previewImg = document.getElementById('preview-img');
const btnRetake = document.getElementById('btn-retake');
const recognizeSection = document.getElementById('recognize-section');
const langSelect = document.getElementById('lang-select');
const btnRecognize = document.getElementById('btn-recognize');
const progressBox = document.getElementById('progress-box');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultSection = document.getElementById('result-section');
const resultText = document.getElementById('result-text');

let currentCanvas = null; // уменьшенное фото для распознавания
let ocrWorker = null;     // движок OCR, переиспользуем между распознаваниями
let workerLang = null;    // язык, на котором создан движок

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

// Движок создаётся один раз и живёт дальше; при смене языка — пересоздаётся
async function getWorker(lang) {
  if (ocrWorker && workerLang === lang) return ocrWorker;
  if (ocrWorker) await ocrWorker.terminate();
  ocrWorker = await Tesseract.createWorker(lang, 1, { logger: onProgress });
  workerLang = lang;
  return ocrWorker;
}

async function recognize() {
  if (!currentCanvas) return;
  if (typeof Tesseract === 'undefined') {
    throw new Error('Движок не загрузился. Проверь интернет и обнови страницу.');
  }
  btnRecognize.disabled = true;
  progressBox.hidden = false;
  resultSection.hidden = true;
  setProgress(0, 'Подготовка…');

  const worker = await getWorker(langSelect.value);
  const { data } = await worker.recognize(currentCanvas);

  resultText.value = data.text.trim();
  progressBox.hidden = true;
  resultSection.hidden = false;
  btnRecognize.disabled = false;
}

function showOcrError(err) {
  console.error(err); // подробности — в консоли браузера (F12)
  progressBox.hidden = false;
  setProgress(0, 'Ошибка: ' + err.message);
  btnRecognize.disabled = false;
}

// Прогресс: Tesseract присылает статусы и долю выполнения 0…1
function onProgress(m) {
  const ru = {
    'loading tesseract core': 'Загружаю движок…',
    'initializing tesseract': 'Запускаю движок…',
    'loading language traineddata': 'Скачиваю языковые данные…',
    'initializing api': 'Подготовка…',
    'recognizing text': 'Распознаю текст…',
  };
  setProgress(m.progress || 0, ru[m.status] || m.status);
}

function setProgress(value, text) {
  progressFill.style.width = Math.round(value * 100) + '%';
  progressText.textContent = text;
}

function hideResult() {
  resultSection.hidden = true;
  resultText.value = '';
  progressBox.hidden = true;
}
