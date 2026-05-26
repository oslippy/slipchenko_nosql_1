// queries/part4_indexes.js
// Запуск: mongosh "ВАШ_URI" --file queries/part4_indexes.js

const spotifyDb = db.getSiblingDB("spotify");
const tracks = spotifyDb.tracks;

// Прибираємо індекси з попередніх прогонів (крім _id), щоб результати
// були відтворюваними при повторному запуску скрипта.
print("Прибираємо старі індекси (крім _id)...");
tracks.dropIndexes();

// ============================================================
// Завдання 1. Аналіз і індексування важкого запиту
// db.tracks.find({
//   track_genre: "pop",
//   "audio_features.danceability": { $gte: 0.7 }
// }).sort({ popularity: -1 })
// ============================================================
const heavyFilter = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 },
};
const heavySort = { popularity: -1 };

print("\n========== Завдання 1.1. План БЕЗ індексу ==========");
const explainBefore = tracks
  .find(heavyFilter)
  .sort(heavySort)
  .explain("executionStats");

print("winningPlan:");
printjson(explainBefore.queryPlanner.winningPlan);
print("executionStats (ключове):");
printjson({
  nReturned: explainBefore.executionStats.nReturned,
  executionTimeMillis: explainBefore.executionStats.executionTimeMillis,
  totalKeysExamined: explainBefore.executionStats.totalKeysExamined,
  totalDocsExamined: explainBefore.executionStats.totalDocsExamined,
});

// Створюємо складений індекс за правилом ESR:
//   E — track_genre (рівність)
//   S — popularity (сортування, напрямок -1 збігається з sort)
//   R — audio_features.danceability (діапазон)
print("\n========== Завдання 1.2. Створюємо індекс ==========");
const idxName = tracks.createIndex(
  {
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1,
  },
  { name: "genre_popularity_danceability_idx" }
);
print(`Створено індекс: ${idxName}`);

print("\n========== Завдання 1.3. План З індексом ==========");
const explainAfter = tracks
  .find(heavyFilter)
  .sort(heavySort)
  .explain("executionStats");

print("winningPlan:");
printjson(explainAfter.queryPlanner.winningPlan);
print("executionStats (ключове):");
printjson({
  nReturned: explainAfter.executionStats.nReturned,
  executionTimeMillis: explainAfter.executionStats.executionTimeMillis,
  totalKeysExamined: explainAfter.executionStats.totalKeysExamined,
  totalDocsExamined: explainAfter.executionStats.totalDocsExamined,
});

// ============================================================
// Завдання 2. Складений індекс для пошуку фонової музики
// фільтр: explicit = false, instrumentalness > 0.5, speechiness < 0.1
// За правилом ESR — рівність (explicit) першою, далі дві діапазонні фічі.
// ============================================================
print("\n========== Завдання 2. Індекс для work-музики ==========");
const workIdxName = tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1,
  },
  { name: "work_music_idx" }
);
print(`Створено індекс: ${workIdxName}`);

const workFilter = {
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
};

const explainWork = tracks.find(workFilter).explain("executionStats");
print("winningPlan:");
printjson(explainWork.queryPlanner.winningPlan);
print("executionStats (ключове):");
printjson({
  nReturned: explainWork.executionStats.nReturned,
  executionTimeMillis: explainWork.executionStats.executionTimeMillis,
  totalKeysExamined: explainWork.executionStats.totalKeysExamined,
  totalDocsExamined: explainWork.executionStats.totalDocsExamined,
});

// ============================================================
// Завдання 3. Перевірка покривного запиту
// Індекс з Завдання 1: { track_genre: 1, popularity: -1, "audio_features.danceability": 1 }
// Запит: db.tracks.find({ track_genre: "pop", popularity: { $gte: 70 } })
// ============================================================
print("\n========== Завдання 3. Перевірка covered query ==========");
const coveredFilter = { track_genre: "pop", popularity: { $gte: 70 } };

// (а) Без проєкції — повертаємо весь документ.
print("\n--- (а) find() без проєкції ---");
const explainCoveredA = tracks.find(coveredFilter).explain("executionStats");
print("winningPlan:");
printjson(explainCoveredA.queryPlanner.winningPlan);
print("executionStats (ключове):");
printjson({
  nReturned: explainCoveredA.executionStats.nReturned,
  totalKeysExamined: explainCoveredA.executionStats.totalKeysExamined,
  totalDocsExamined: explainCoveredA.executionStats.totalDocsExamined,
});

// (б) З проєкцією виключно по індексованих полях і виключенням _id.
print("\n--- (б) find() з проєкцією {_id:0, track_genre:1, popularity:1} ---");
const explainCoveredB = tracks
  .find(coveredFilter, { _id: 0, track_genre: 1, popularity: 1 })
  .explain("executionStats");
print("winningPlan:");
printjson(explainCoveredB.queryPlanner.winningPlan);
print("executionStats (ключове):");
printjson({
  nReturned: explainCoveredB.executionStats.nReturned,
  totalKeysExamined: explainCoveredB.executionStats.totalKeysExamined,
  totalDocsExamined: explainCoveredB.executionStats.totalDocsExamined,
});
