import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB5gRS5PO-nUd98_lf1JPvIrNmKY6oVRW0",
  authDomain: "aplus-level-testing.firebaseapp.com",
  databaseURL: "https://aplus-level-testing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aplus-level-testing",
  storageBucket: "aplus-level-testing.firebasestorage.app",
  messagingSenderId: "52204282762",
  appId: "1:52204282762:web:9cc30cc5e95a3f7f981e73",
  measurementId: "G-2Q48MB7WN2"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
