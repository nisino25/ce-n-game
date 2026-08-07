import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDaj52leB3TPH7Mp5KAwTyoBt9krQh84Fc",
  authDomain: "ce-n-game.firebaseapp.com",
  projectId: "ce-n-game",
  storageBucket: "ce-n-game.firebasestorage.app",
  messagingSenderId: "448721390153",
  appId: "1:448721390153:web:c9531b0afcb8350ad10d98",
  measurementId: "G-EXGZXMCC65"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

export { firebase };
export default db;