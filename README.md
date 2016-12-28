# connect-rest-api
It implements express session store using Restful API. Session information will be sent to rest api to store and retrieve.

```javascript
var session = require('express-session');
var RestApiStore = require('connect-rest-api')(session);

app.use(session({
    store: new RestApiStore({
      PREFIX: 'sess:',
      SECURE: false,
      PROTOCOL: 'http',
      HOSTNAME: 'localhost',
      PORT: 3000,
      PATH: '/v1/bucket/app',
      TTL: null,
    }),
    secret: 'keyboard cat',
}));
```
