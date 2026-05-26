// queries/part2_queries.js
// Запуск: mongosh "ВАШ_URI" --file queries/part2_queries.js

const spotifyDb = db.getSiblingDB("spotify");
const tracks = spotifyDb.tracks;

// ============================================================
// Завдання 1. Треки для вечірки
// danceability > 0.7, energy > 0.7, тривалість 3–5 хв
// ============================================================
print("\n=== Завдання 1. Треки для вечірки ===");

const partyFilter = {
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 },
};

const partyProjection = {
  _id: 0,
  track_name: 1,
  artists: 1,
  duration_ms: 1,
  popularity: 1,
  "audio_features.danceability": 1,
  "audio_features.energy": 1,
};

print(`Знайдено треків: ${tracks.countDocuments(partyFilter)}`);
print("Перші 5:");
printjson(tracks.find(partyFilter, partyProjection).limit(5).toArray());

// ============================================================
// Завдання 2. Виконавці, у яких усі треки популярні
// ≥ 3 треки, min(popularity) ≥ 60, топ-20 за середньою популярністю
// ============================================================
print("\n=== Завдання 2. Топ-20 артистів, у яких усі треки популярні ===");

const popularArtists = tracks
  .aggregate([
    { $unwind: "$artists" },
    {
      $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        min_popularity: { $min: "$popularity" },
        avg_popularity: { $avg: "$popularity" },
      },
    },
    {
      $match: {
        track_count: { $gte: 3 },
        min_popularity: { $gte: 60 },
      },
    },
    {
      $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        min_popularity: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] },
      },
    },
    { $sort: { avg_popularity: -1, artist: 1 } },
    { $limit: 20 },
  ])
  .toArray();

printjson(popularArtists);

// ============================================================
// Завдання 3. Нетипові треки за темпом у своєму жанрі
// tempo треку > avg(жанр) + 2 * stdDevPop(жанр)
// ============================================================
print("\n=== Завдання 3. Tempo-аутлаєри по жанрах ===");

const outliers = tracks
  .aggregate([
    {
      $group: {
        _id: "$track_genre",
        avg_tempo: { $avg: "$audio_features.tempo" },
        std_tempo: { $stdDevPop: "$audio_features.tempo" },
      },
    },
    {
      $addFields: {
        outlier_threshold: {
          $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }],
        },
      },
    },
    {
      $lookup: {
        from: "tracks",
        let: { genre: "$_id", threshold: "$outlier_threshold" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$track_genre", "$$genre"] },
                  { $gt: ["$audio_features.tempo", "$$threshold"] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              track_name: 1,
              popularity: 1,
              artists: 1,
              audio_features: { tempo: "$audio_features.tempo" },
            },
          },
        ],
        as: "outlier_tracks",
      },
    },
    { $match: { "outlier_tracks.0": { $exists: true } } },
    {
      $project: {
        _id: 0,
        genre: "$_id",
        avg_tempo: 1,
        outlier_threshold: 1,
        outlier_tracks: 1,
      },
    },
    { $sort: { genre: 1 } },
  ])
  .toArray();

print(`Жанрів з аутлаєрами: ${outliers.length}`);
print("Приклад (перші 2 жанри):");
printjson(outliers.slice(0, 2));

// ============================================================
// Завдання 4. Треки для фонової роботи
// loudness < -10, speechiness < 0.1, instrumentalness > 0.5, не explicit
// ============================================================
print("\n=== Завдання 4. Треки для фонової роботи ===");

const workFilter = {
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false,
};

const workProjection = {
  _id: 0,
  track_name: 1,
  artists: 1,
  track_genre: 1,
  "audio_features.loudness": 1,
  "audio_features.speechiness": 1,
  "audio_features.instrumentalness": 1,
};

print(`Знайдено треків: ${tracks.countDocuments(workFilter)}`);
print("Перші 5:");
printjson(tracks.find(workFilter, workProjection).limit(5).toArray());
