export { initializeApp } from 'firebase/app';
export { getAuth, getIdTokenResult, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
export {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, getFirestore,
  onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore';
