// Connection to the AFRIFF Firebase project.
// These values are public identifiers, not secrets: security comes from
// the database rules in /firestore.rules.
// Only the admin console (app/pages/admin) imports this file, so attendees never download Firebase.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPxdNaQyK6r4OU97-zBZBKLqHsHunGzYo',
  authDomain: 'afriff-app.firebaseapp.com',
  projectId: 'afriff-app',
  storageBucket: 'afriff-app.firebasestorage.app',
  messagingSenderId: '396757035301',
  appId: '1:396757035301:web:abf6a05cf9014ad3b412cc',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: blank optional fields are skipped instead of causing an error
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
