const KEY = "efs_speaking_v1";
export function load() {
  try {
    return (
      JSON.parse(localStorage.getItem(KEY)) || {
        topics: {},
        answers: {},
        progress: {},
      }
    );
  } catch {
    return { topics: {}, answers: {}, progress: {} };
  }
}
export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("efs-speaking-recordings", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("clips", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function clip(action, value) {
  const d = await db();
  try {
    return await new Promise((resolve, reject) => {
      const tx = d.transaction(
          "clips",
          action === "getAll" ? "readonly" : "readwrite",
        ),
        s = tx.objectStore("clips");
      const r = action === "getAll" ? s.getAll() : s[action](value);
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Không lưu được bản ghi."));
    });
  } finally {
    d.close();
  }
}
