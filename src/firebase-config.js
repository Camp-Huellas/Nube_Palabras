import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Para leer y escribir sin autenticación temporalmente en un evento en vivo, 
// solo necesitamos el databaseURL, asumiendo que las reglas de Firebase 
// están en true para read/write.
const firebaseConfig = {
  databaseURL: "https://nube-palabras-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
