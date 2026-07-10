// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDniQcjwmrmd8MjKTbsFuDLq88DcmtI1MM",
  authDomain: "limosalon-55011.firebaseapp.com",
  projectId: "limosalon-55011",
  storageBucket: "limosalon-55011.firebasestorage.app",
  messagingSenderId: "897288050220",
  appId: "1:897288050220:web:ea406a17210e027ddf6389",
  measurementId: "G-03MFDQBWNH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);