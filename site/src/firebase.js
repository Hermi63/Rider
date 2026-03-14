import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, remove, onValue } from "firebase/database";

const firebaseConfig = {
  projectId: "rider-11e62",
  databaseURL: "https://rider-11e62-default-rtdb.europe-west1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export async function loadData() {
  const [reviewsSnap, driversSnap, bannedSnap] = await Promise.all([
    get(ref(db, "reviews")),
    get(ref(db, "drivers")),
    get(ref(db, "banned")),
  ]);
  const reviewsObj = reviewsSnap.val() || {};
  const reviews = Object.entries(reviewsObj).map(([id, r]) => ({ id, ...r }));
  return {
    reviews,
    drivers: driversSnap.val() || {},
    banned: bannedSnap.val() || {},
  };
}

export function subscribeData(callback) {
  const unsubs = [];
  const state = { reviews: {}, drivers: {}, banned: {} };

  function emit() {
    const reviews = Object.entries(state.reviews).map(([id, r]) => ({ id, ...r }));
    callback({ reviews, drivers: { ...state.drivers }, banned: { ...state.banned } });
  }

  unsubs.push(onValue(ref(db, "reviews"), snap => { state.reviews = snap.val() || {}; emit(); }));
  unsubs.push(onValue(ref(db, "drivers"), snap => { state.drivers = snap.val() || {}; emit(); }));
  unsubs.push(onValue(ref(db, "banned"), snap => { state.banned = snap.val() || {}; emit(); }));

  return () => unsubs.forEach(fn => fn());
}

export async function addReview(review, driverKey, driverData) {
  const driversSnap = await get(ref(db, `drivers/${driverKey}`));
  if (!driversSnap.exists()) {
    await set(ref(db, `drivers/${driverKey}`), driverData);
  }
  await push(ref(db, "reviews"), review);
}

export async function deleteReview(reviewId) {
  await remove(ref(db, `reviews/${reviewId}`));
}

export async function banUser(name, banKey) {
  await set(ref(db, `banned/${banKey}`), name);
}

export async function unbanUser(banKey) {
  await remove(ref(db, `banned/${banKey}`));
}
