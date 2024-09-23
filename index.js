const cacheManager = require('cache-manager');

const cache = cacheManager.caching({
  store: 'memory', max: process.env.CACHE_MAXSIZE || 100, ttl: process.env.CACHE_TTL || 60
});

module.exports = {
  init: function() {},

  requestReceived: function(req, res, next) {
    if (req._parsedUrl.pathname == "/purge") {
      const url = req.query.url;
      const urlWithSlash = url.endsWith('/') ? url : url + '/';
      cache.del(urlWithSlash, function(err) {
        if (err) {
          res.send(200, "Failed to delete: " + err.message);
          console.log(new Date().toISOString() + " failed to purge cache for " + url)
          req.prerender.ignoreCacheSet = true
          return;
        }
        res.send(200, "OK\n");
        console.log(new Date().toISOString() + " purged cache for " + url)
        req.prerender.ignoreCacheSet = true
      });
      return;
    }

    cache.get(req.prerender.url, function (err, result) {
      if (!err && result) {
        req.prerender.cacheHit = true;
        res.send(200, result);
        console.log(new Date().toISOString() +  " responded from cache " + req.query.url);
      } else {
        next();
      }
    });
  },

  beforeSend: function(req, res, next) {
    if (!req.prerender.cacheHit && req.prerender.statusCode == 200 && !req.prerender.ignoreCacheSet) {
      cache.set(req.prerender.url, req.prerender.content);
      console.log(new Date().toISOString() +  " cached " + req.query.url);
    }
    next();
  }
};