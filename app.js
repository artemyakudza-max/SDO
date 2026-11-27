// Шаг 1: каркас — выбор/съёмка фото и предпросмотр.
// Распознавание текста (OCR) добавим на следующем шаге.

const inputCamera = document.getElementById('input-camera');
const inputGallery = document.getElementById('input-gallery');
const previewSection = document.getElementById('preview-section');
const previewImg = document.getElementById('preview-img');
const btnRetake = document.getElementById('btn-retake');

// Показать выбранное фото
function showPhoto(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Это не картинка. Выберите фото.');
    return;
  }
  previewImg.src = URL.createObjectURL(file);
  previewSection.hidden = false;
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

inputCamera.addEventListener('change', () => {
  showPhoto(inputCamera.files[0]);
});

inputGallery.addEventListener('change', () => {
  showPhoto(inputGallery.files[0]);
});

// Сброс: спрятать превью и очистить выбор
btnRetake.addEventListener('click', () => {
  previewSection.hidden = true;
  previewImg.src = '';
  inputCamera.value = '';
  inputGallery.value = '';
});
