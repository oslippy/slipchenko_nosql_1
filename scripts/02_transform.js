// scripts/02_transform.js
// Запуск: mongosh "ВАШ_URI" --file scripts/02_transform.js

const spotifyDb = db.getSiblingDB("spotify");

spotifyDb.tracks.drop();

spotifyDb.tracks_raw.aggregate([
  {
    $project: {
      _id: 0,
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: "$artists",
      danceability: 1,
      energy: 1,
      loudness: 1,
      speechiness: 1,
      acousticness: 1,
      instrumentalness: 1,
      liveness: 1,
      valence: 1,
      tempo: 1,
      key: 1,
      mode: 1,
      time_signature: 1,
    },
  },
  {
    $addFields: {
      artists: {
        $map: {
          input: { $split: ["$artists_raw", ";"] },
          as: "name",
          in: { $trim: { input: "$$name" } },
        },
      },
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature",
      },
      duration_sec: {
        $round: [{ $divide: ["$duration_ms", 1000] }, 1],
      },
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" },
          ],
          default: "low",
        },
      },
    },
  },
  {
    $project: {
      artists_raw: 0,
      danceability: 0,
      energy: 0,
      loudness: 0,
      speechiness: 0,
      acousticness: 0,
      instrumentalness: 0,
      liveness: 0,
      valence: 0,
      tempo: 0,
      key: 0,
      mode: 0,
      time_signature: 0,
    },
  },
  { $out: "tracks" },
]);

print(`Кількість документів у tracks: ${spotifyDb.tracks.countDocuments()}`);
print("Приклад документа:");
printjson(spotifyDb.tracks.findOne());
