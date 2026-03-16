var BASE_URL = "https://faselhd.cloud";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "ar,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function searchFaselHD(query) {
  var url = BASE_URL + "/?s=" + encodeURIComponent(query);
  return fetch(url, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var match = html.match(/href="(https?:\/\/[^"]*faselhd[^"]*(?:watch|movie|\d{4})[^"]*)"/i);
      return match ? match[1] : null;
    });
}

function guessQuality(text) {
  if (/4k|2160/i.test(text)) return "4K";
  if (/1080/i.test(text))    return "1080p";
  if (/720/i.test(text))     return "720p";
  if (/480/i.test(text))     return "480p";
  return "HD";
}

function extractStreamsFromPage(pageUrl) {
  return fetch(pageUrl, { headers: HEADERS })
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var streams = [];
      var iframePattern = /iframe[^>]+src=["']([^"']+)["']/gi;
      var m;
      while ((m = iframePattern.exec(html)) !== null) {
        var src = m[1];
        if (src.indexOf("faselhd") === -1 && src.indexOf("google") === -1 && src.length > 20) {
          streams.push({
            title: "فاصل · " + guessQuality(src),
            url: src.startsWith("//") ? "https:" + src : src,
            quality: guessQuality(src),
            headers: { Referer: BASE_URL }
          });
        }
      }
      var m3u8Pattern = /(https?:\/\/[^"'\s,]+\.m3u8[^"'\s,]*)/gi;
      while ((m = m3u8Pattern.exec(html)) !== null) {
        if (!streams.some(function(s){ return s.url === m[1]; })) {
          streams.push({
            title: "فاصل · HLS",
            url: m[1],
            quality: guessQuality(m[1]),
            headers: { Referer: BASE_URL }
          });
        }
      }
      var mp4Pattern = /(https?:\/\/[^"'\s,]+\.mp4[^"'\s,]*)/gi;
      while ((m = mp4Pattern.exec(html)) !== null) {
        if (!streams.some(function(s){ return s.url === m[1]; })) {
          streams.push({
            title: "فاصل · MP4",
            url: m[1],
            quality: guessQuality(m[1]),
            headers: { Referer: BASE_URL }
          });
        }
      }
      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  var tmdbUrl = mediaType === "movie"
    ? "https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=8265bd1679663a7ea12ac168da84d2e8&language=ar"
    : "https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=8265bd1679663a7ea12ac168da84d2e8&language=ar";

  return fetch(tmdbUrl)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var title = data.title || data.name || data.original_title || data.original_name;
      if (!title) return [];
      var query = title;
      if (mediaType === "tv" && season) query = title + " الموسم " + season;
      return searchFaselHD(query);
    })
    .then(function(pageUrl) {
      if (!pageUrl) return [];
      return extractStreamsFromPage(pageUrl);
    })
    .catch(function(err) {
      console.error("[FaselHD] " + err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
