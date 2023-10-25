// Import the functions you need from the SDKs you need
import firebase from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import "firebase/auth";
import { getAuth } from "firebase/auth";
// Your web app's Firebase configuration
const auth = firebase.initializeApp({
  apiKey: "AIzaSyCCC7xRf0xYNeVR7Elemy49YUhxHKzE5LM",
  authDomain: "socialweb-ce3cd.firebaseapp.com",
  projectId: "socialweb-ce3cd",
  storageBucket: "socialweb-ce3cd.appspot.com",
  messagingSenderId: "91159041297",
  appId: "1:91159041297:web:edce230d3b68e2240d28b0"
});

export const firebaseAuth = getAuth(auth);

