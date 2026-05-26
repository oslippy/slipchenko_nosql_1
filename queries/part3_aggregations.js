// queries/part3_aggregations.js
// Запуск: mongosh "ВАШ_URI" --file queries/part3_aggregations.js

const spotifyDb = db.getSiblingDB("spotify");
const tracks = spotifyDb.tracks;

// ============================================================
// Завдання 1. Топ-10 виконавців за середньою популярністю
// Беремо лише тих, у кого щонайменше 5 треків.
// ============================================================
print("\n=== Завдання 1. Топ-10 виконавців за середньою популярністю ===");

const topArtists = tracks
  .aggregate([
    { $unwind: "$artists" },
    {
      $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        avg_popularity: { $avg: "$popularity" },
      },
    },
    { $match: { track_count: { $gte: 5 } } },
    {
      $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] },
      },
    },
    { $sort: { avg_popularity: -1, artist: 1 } },
    { $limit: 10 },
  ])
  .toArray();

printjson(topArtists);

// ============================================================
// Завдання 2. Розподіл треків за настроєм
// valence ≥ 0.5 — "високий", < 0.5 — "низький"; так само для energy
//   високий valence + висока energy  → happy
//   низький  valence + висока energy  → angry
//   високий  valence + низька energy  → calm
//   низький  valence + низька energy  → sad
// ============================================================
print("\n=== Завдання 2. Розподіл треків за настроєм ===");

const moodDistribution = tracks
  .aggregate([
    {
      $project: {
        mood: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    { $gte: ["$audio_features.valence", 0.5] },
                    { $gte: ["$audio_features.energy", 0.5] },
                  ],
                },
                then: "happy",
              },
              {
                case: {
                  $and: [
                    { $lt: ["$audio_features.valence", 0.5] },
                    { $gte: ["$audio_features.energy", 0.5] },
                  ],
                },
                then: "angry",
              },
              {
                case: {
                  $and: [
                    { $gte: ["$audio_features.valence", 0.5] },
                    { $lt: ["$audio_features.energy", 0.5] },
                  ],
                },
                then: "calm",
              },
            ],
            default: "sad",
          },
        },
      },
    },
    { $group: { _id: "$mood", count: { $sum: 1 } } },
    { $project: { _id: 0, mood: "$_id", count: 1 } },
    { $sort: { count: -1 } },
  ])
  .toArray();

printjson(moodDistribution);

// ============================================================
// Завдання 3. Найбільш "танцювальний" жанр
// Групуємо за жанром, рахуємо середні danceability/energy/valence.
// Беремо лише жанри, у яких ≥ 100 треків.
// ============================================================
print("\n=== Завдання 3. Найбільш танцювальні жанри ===");

const danceableGenres = tracks
  .aggregate([
    {
      $group: {
        _id: "$track_genre",
        track_count: { $sum: 1 },
        avg_danceability: { $avg: "$audio_features.danceability" },
        avg_energy: { $avg: "$audio_features.energy" },
        avg_valence: { $avg: "$audio_features.valence" },
      },
    },
    { $match: { track_count: { $gte: 100 } } },
    {
      $project: {
        _id: 0,
        genre: "$_id",
        track_count: 1,
        avg_danceability: { $round: ["$avg_danceability", 3] },
        avg_energy: { $round: ["$avg_energy", 3] },
        avg_valence: { $round: ["$avg_valence", 3] },
      },
    },
    { $sort: { avg_danceability: -1 } },
  ])
  .toArray();

print(`Жанрів, що пройшли поріг ≥100 треків: ${danceableGenres.length}`);
print("Топ-10 за середньою танцювальністю:");
printjson(danceableGenres.slice(0, 10));
