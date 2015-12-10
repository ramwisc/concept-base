/**
 * Module that provides data access to the concepts
 */

var winston = require('winston');
var util = require('util');

function InMemoryStore() {
  // map from concept id -> concept object
  this.concepts = {};
}

// aka quora style for id and we will this as the primary key
function _generateConceptId(conceptName) {
  return conceptName.split(/\s+/).join("-");
}

InMemoryStore.PROTOTYPE_CONCEPT = {
    "id" : null,
    "name" : null,
    "description": "",
    "resouces": [],
    "created_at" : "2015-12-10T20:40:49.318Z",
    "created_by": "test@gmail.com"
};

InMemoryStore.prototype.add = function(concept, user, callback) {
  if (!concept.name) {
    callback(null,
      util.format("key 'name' is missing in %s", JSON.stringify(concept)));
  } else {
    var storedConcept = Object.create(InMemoryStore.PROTOTYPE_CONCEPT);
    storedConcept.id = _generateConceptId(concept.name);
    storedConcept.name = concept.name;
    storedConcept.description = concept.description || "";
    storedConcept.created_at = new Date().toISOString();
    storedConcept.created_by = user;
    winston.debug("adding concept %s", JSON.stringify(storedConcept));
    this.concepts[storedConcept.id] = storedConcept;
    callback(storedConcept.id, null); // success adding a concept!
  }
}

InMemoryStore.prototype.get = function(id, callback) {
  var concept = this.concepts[id];
  if(!concept) {
    winston.warn("concept with id '%s' not found", id);
    callback(null); // signals we didn't find it.
  } else {
    callback(concept);
  }
}

var exports = module.exports = {};
exports.conceptStore = new InMemoryStore();
