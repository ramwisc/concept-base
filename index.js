var express = require('express');
var winston = require('winston');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var conceptStore = require('./store/concept-store.js').conceptStore;
var util = require('util');

// random string to obfuscate
var webappContext = '992f0957e1dcafc773d94f8ea4c9ba32ae9f4afe';

function prefixRoute(path) {
    var fSlash = '/';
    if(path[0] === fSlash) {
        return fSlash + webappContext  + path;
    } else {
        return fSlash + webappContext  + fSlash + path;
    }
}

function isCookiePresent(cookies) {
  return cookies.email && cookies.email.trim() !== '';
}

function requireAuthentication(req, res, next) {
  var cookies = req.cookies;
  if (isCookiePresent(cookies)) {
    winston.debug("cookie already set to: %s", cookies.email);
    req.user = cookies.email;
  } else {
    var email = req.query.email;
    if (email && email !== '') {
      res.cookie('email', email, { maxAge: 900000, httpOnly: false });
      winston.debug("set cookie to %s", email);
    } else {
        res.render("pages/signin"); // ask to sign in
        return;
    }
  }
  next();
}

winston.level = 'debug';
// create application/json parser
var jsonParser = bodyParser.json()

var app = express();
// set up middleware
app.use(cookieParser());
//parse json for the appropriate requests
app.use(bodyParser.json({ type: 'json' }))
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// default routes
app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  winston.info('conceptbase app started on port', app.get('port'));
});

//----routes prefixed with <code>webappContext</code>-------------------------//

app.all(prefixRoute('/*'), requireAuthentication);

app.get(prefixRoute('/home.html'), function(request, response) {
  response.render('pages/home');
});

//--------REST data endpoints-------------------------------------------------//

//CRUD on concepts
app.post(prefixRoute("/domain/:domain/concept"), function(req, res) {
  var concept = req.body;
  if(!concept) {
    var error = { msg: 'concept object was not present in the request or marlformed!' };
    res.status(400).send(JSON.stringify(error));
  } else {
    winston.debug("received concept %s", JSON.stringify(concept));
    var domain = req.params.domain;
    conceptStore.addConcept(domain, concept, req.user, function(conceptId, error) {
      if(error) {
        var msg = { msg: error };
        res.status(500)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      } else {
        var msg = { id: conceptId };
        res.status(201)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      }
    });
  }
});

app.get(prefixRoute("/domain/:domain/concept/:id"), function(req, res) {
  winston.debug("retrieving concept %s in domain %s", req.params.id, req.params.domain);
  conceptStore.getConcept(req.params.domain, req.params.id, function(concept) {
    if(!concept) {
      var error = util.format("concept '%s' not found in domain %s!",
                                      req.params.id, req.params.domain);
      res.status(404)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({msg : error}));
    } else {
      res.status(200)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify(concept));
    }
  });
});

// CRUD on resources
app.post(prefixRoute("/domain/:domain/concept/:concept/resource"), function(req, res) {
  var resource = req.body;
  if(!resource) {
    var error = { msg: 'resource object was not present in the request or marlformed!' };
    res.status(400).send(JSON.stringify(error));
  } else {
    winston.debug("received resource %s", JSON.stringify(resource));
    var domain = req.params.domain;
    var concept = req.params.concept;
    conceptStore.addResource(domain, concept, resource, req.user, function(resourceId, error) {
      if(error) {
        var msg = { msg: error };
        res.status(500)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      } else {
        var msg = { id: resourceId };
        res.status(201)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      }
    });
  }
});

app.get(prefixRoute("/domain/:domain/concept/:concept/resource/:id"), function(req, res) {
  winston.debug("retrieving resource %s in concept %s and domain %s",
                            req.params.id, req.params.concept, req.params.domain);
  conceptStore.getResource(req.params.domain, req.params.concept, req.params.id,
    function(resource) {
      if(!resource) {
        var error = util.format("resource '%s' not found in concpet %s and domain %s!",
                                        req.params.id, req.params.concept, req.params.domain);
        res.status(404)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({msg : error}));
      } else {
        res.status(200)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(resource));
      }
  });
});

app.post(prefixRoute("/domain/:domain/concept/:concept/resource/:id/like"), function(req, res) {
  var domain = req.params.domain;
  var concept = req.params.concept;
  var resourceId = req.params.id;
  winston.debug("+1 for resource %s in concept %s, domain %s, user %s",
      resourceId, concept, domain, req.user);
  conceptStore.likeResource(domain, concept, resourceId, req.user,
    function(likeCount, error) {
      if(error) {
        res.status(500)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ msg : error }));
      } else {
        res.status(200)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ likes: likeCount }));
      }
  });
});

app.post(prefixRoute("/domain/:domain/concept/:concept/resource/:id/unlike"), function(req, res) {
  var domain = req.params.domain;
  var concept = req.params.concept;
  var resourceId = req.params.id;
  winston.debug("-1 for resource %s in concept %s, domain %s, user %s",
      resourceId, concept, domain, req.user);
  conceptStore.unlikeResource(domain, concept, resourceId, req.user,
    function(likeCount, error) {
      if(error) {
        res.status(500)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ msg : error }));
      } else {
        res.status(200)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ likes: likeCount }));
      }
  });
});
