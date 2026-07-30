import { ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from "./firebase-config.js";

// 1. Generar Código QR Dinámico
let currentUrl = window.location.href.split('?')[0].split('#')[0]; // Limpiar la URL
if (currentUrl.endsWith(".html")) {
  currentUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/"));
}
if (!currentUrl.endsWith("/")) {
  currentUrl += "/";
}
const formUrl = currentUrl + "form.html";
const qrImg = document.getElementById("qr-image");

if (qrImg) {
  qrImg.src = `https://quickchart.io/qr?text=${encodeURIComponent(formUrl)}&size=150&margin=1`;
}

// 2. Elementos de la interfaz extra
const participantCountEl = document.getElementById('participant-count');
const clearBtn = document.getElementById('clear-btn');
const faintBg = document.getElementById('faint-bg');

// Lógica del botón limpiar
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas eliminar todas las palabras y empezar de cero?")) {
      remove(ref(db, "words")).then(() => {
        currentWords = [];
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log("Base de datos limpia.");
      });
    }
  });
}

// 3. Preparar el Canvas para la Nube de Palabras
const canvas = document.getElementById("wordcloud-canvas");
const wrapper = document.querySelector(".wordcloud-wrapper");

let currentWords = [];
let isCloudRendering = false;
let totalParticipants = 0;

// Ajustar tamaño del canvas
const updateCanvasSize = () => {
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  if (currentWords.length > 0) {
      // Forzar redraw si se redimensiona (opcional, para mantener responsive)
      isCloudRendering = false;
      drawWordCloud();
  }
};
updateCanvasSize();
window.addEventListener('resize', updateCanvasSize);

// 4. Cargar la imagen de la máscara (huellas)
const maskImg = new Image();
maskImg.src = "./mask.png";

maskImg.onload = () => {
  // 5. Escuchar cambios en Firebase
  const wordsRef = ref(db, "words");
  onValue(wordsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Procesar las palabras y agrupar por frecuencia
      const wordCounts = {};
      let rawCount = 0;
      Object.values(data).forEach(entry => {
        rawCount++;
        const text = entry.text.trim().toUpperCase();
        if (text) {
          wordCounts[text] = (wordCounts[text] || 0) + 1;
        }
      });
      
      // Actualizar contador
      totalParticipants = rawCount;
      if (participantCountEl) {
        participantCountEl.textContent = `${totalParticipants} aporte${totalParticipants !== 1 ? 's' : ''}`;
      }

      const uniqueWords = Object.keys(wordCounts).length;
      
      // Ajustar multiplicador: si hay pocas palabras, hacerlas mucho más grandes para llenar
      const multiplier = uniqueWords < 15 ? 40 : (uniqueWords < 30 ? 25 : 15);

      // Convertir a formato que requiere wordcloud2.js: [[palabra, peso], ...]
      const newList = Object.entries(wordCounts).map(([word, count]) => {
        return [word, count * multiplier]; 
      });

      // Solo re-dibujar si hay cambios
      if (JSON.stringify(newList) !== JSON.stringify(currentWords)) {
        currentWords = newList;
        drawWordCloud();
      }
    } else {
      console.log("No hay datos en Firebase aún.");
      totalParticipants = 0;
      if (participantCountEl) participantCountEl.textContent = "0 aportes";
      
      // Dibujar solo la máscara vacía si no hay palabras
      currentWords = [];
      drawWordCloud();
    }
  }, (error) => {
    console.error("Error escuchando Firebase:", error);
  });
};

maskImg.onerror = () => {
  console.error("No se pudo cargar la imagen de la máscara (mask.png).");
}

function drawWordCloud() {
  if (isCloudRendering) return;
  isCloudRendering = true;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // a. Dibujar la imagen de la máscara en el centro del canvas
  const imgRatio = maskImg.width / maskImg.height;
  const canvasRatio = canvas.width / canvas.height;

  let drawWidth, drawHeight;
  if (canvasRatio > imgRatio) {
    drawHeight = canvas.height * 0.9;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = canvas.width * 0.9;
    drawHeight = drawWidth / imgRatio;
  }

  const startX = (canvas.width - drawWidth) / 2;
  const startY = (canvas.height - drawHeight) / 2;

  // Posicionar la imagen de fondo tenue para que coincida exactamente con la máscara del canvas
  if (faintBg) {
    faintBg.style.width = drawWidth + "px";
    faintBg.style.height = drawHeight + "px";
    faintBg.style.left = startX + "px";
    faintBg.style.top = startY + "px";
  }

  // Llenar el fondo temporalmente de blanco para los bordes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(maskImg, startX, startY, drawWidth, drawHeight);

  // b. Modificar los píxeles
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Si el píxel es oscuro (parte de la huella)
    if (r < 100 && g < 100 && b < 100) {
      data[i + 3] = 0; // Transparente
    } else {
      data[i] = 15; // Mismo color de fondo sin gradiente (borde exterior)
      data[i + 1] = 23;
      data[i + 2] = 42;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  if (currentWords.length === 0) {
    isCloudRendering = false;
    return;
  }

  // c. Dibujar la Nube de Palabras
  WordCloud(canvas, {
    list: currentWords,
    clearCanvas: false,
    backgroundColor: "transparent",
    fontFamily: "'Outfit', sans-serif",
    color: function () {
      const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#f8fafc'];
      return colors[Math.floor(Math.random() * colors.length)];
    },
    rotateRatio: 0.3,
    rotationSteps: 2,
    gridSize: 8,
    weightFactor: function (size) {
      // Ajustar dinámicamente el tamaño máximo para llenar mejor el espacio
      const maxSize = totalParticipants < 10 ? 120 : 80;
      return Math.min(size, maxSize);
    }
  });

  // Evento cuando termina de renderizar
  canvas.addEventListener('wordcloudstop', function onStop() {
    isCloudRendering = false;
    canvas.removeEventListener('wordcloudstop', onStop);
  });
}
