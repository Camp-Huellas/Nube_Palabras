import { ref, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from "./firebase-config.js";

const form = document.getElementById('word-form');
const input = document.getElementById('word-input');
const submitBtn = document.getElementById('submit-btn');
const successMsg = document.getElementById('success-msg');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const word = input.value.trim();
    if (!word) return;

    // Validación básica: máximo 3 palabras
    const wordsCount = word.split(/\s+/).length;
    if (wordsCount > 3) {
      alert('Por favor, ingresa un máximo de 3 palabras.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      const wordsRef = ref(db, 'words');
      await push(wordsRef, {
        text: word,
        timestamp: Date.now()
      });

      // Mostrar éxito
      input.value = '';
      successMsg.classList.remove('hidden');
      
      setTimeout(() => {
        successMsg.classList.add('hidden');
      }, 3000);

    } catch (error) {
      console.error("Error al guardar la palabra:", error);
      alert('Hubo un error al enviar la palabra. Inténtalo de nuevo. Asegúrate de que las reglas de Firebase estén en true.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
    }
  });
}
