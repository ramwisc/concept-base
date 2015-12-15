/**
 * Script to populate initial concepts in the database.
 */

var bootstrapData = require('./bootstrap-db.json');
var http = require('http');
var hostname = 'localhost';
var port = 5000;
var context = '/992f0957e1dcafc773d94f8ea4c9ba32ae9f4afe';
var users = ['hamsini@fb.com', 'thea@fb.com', 'ram@contextbase.com',
              'test@gmail.com', 'ramwisc@gmail.com'];
var contentType = "application/json";

function randomUser() {
  return users[Math.floor(Math.random() * (users.length - 1))];
}

function transformDescription(description) {
  return description.map(function(e) {
      return e.trim();
  }).join(' ');
}

function createResources(data, conceptId) {
  data.resources.forEach(function(resource) {
    var user = randomUser();
    var path = encodeURI(context + '/domain/' + data.domain + '/concept/' + conceptId + '/resource/');
    // create the concept first
    var options = {
      hostname: hostname,
      port: port,
      method: 'POST',
      path: path,
      headers: {
        // pick a random posting user
        "Cookie" : "email=" + user ,
        "Content-Type": contentType
      }
    };
    var req = http.request(options, function(res) {
      if (res.statusCode >= 300) {
        console.error('concept response code: %s', res.statusCode);
      }
      res.on('data', function (chunk) {
        console.log('received data on resource creation: ' + chunk.toString('utf-8'));
      });
       res.on('end', function () {
         console.log('created resource: ' + resource.link);
       });
    });
    var description =  transformDescription(resource.description);
    req.on('error', function(e) {
      console.error('problem creating resource: ' + resource.link + ' --> ' + e.message);
    });
    req.write(JSON.stringify(
        {'link' : resource.link, 'description' : description}
    ));
    req.end();
  });
}

// run thro' each concept and create them
bootstrapData.forEach(function(data) {
  var user = randomUser();
  var path = encodeURI(context + '/domain/' + data.domain + '/concept/');
  // create the concept first
  var options = {
    hostname: hostname,
    port: port,
    method: 'POST',
    path: path,
    headers: {
      // pick a random posting user
      "Cookie" : "email=" + user,
      "Content-Type": contentType
    }
  };

  var req = http.request(options, function(res) {
    if (res.statusCode >= 300) {
      console.error('concept response code: %s', res.statusCode);
    }
    var conceptId = null;
    res.on('data', function (chunk) {
      output = chunk.toString('utf-8');
      console.log('received data on concept creation: ' + output);
      conceptId = JSON.parse(output)['id'];
      createResources(data, conceptId);
    });
     res.on('end', function () {
       console.log('created concept %s' + conceptId);
     });
  });
  var description =  transformDescription(data.description);
  req.on('error', function(e) {
    console.error('problem creating concept: %s --> %s', data.concept, e.message);
  });
  req.write(JSON.stringify(
      {'name' : data.concept, 'description' : description}
  ));
  req.end();
});
