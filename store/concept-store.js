/**
 * Module that provides data access to the concepts within domains
 */
var winston = require('winston');
var util = require('util');
var uuid = require('uuid');

/**
 * Represents an InMemoryStore of concepts in various domainToConcepts
 * @constructor
 */
function InMemoryStore() {
  // { domain -> conceptId -> concept}
  this.domainToConcepts = {};
  // note that resourceIds are UUIDs.
  // { resourceId -> resource }
  this.resources = {};
}

/**
 * aka quora style for generating concepts ids
 * @private
 */
function generateConceptId(conceptName) {
  return conceptName.split(/\s+/).join("-");
}

InMemoryStore.PROTOTYPE_CONCEPT =  JSON.stringify({
    "id" : null,
    "name" : null,
    "domain": null,
    "description": "",
    "resources": [], // array of resource_ids
    // dummy values, will be replaced
    "created_at" : "2015-12-10T20:40:49.318Z",
    "created_by": "test@gmail.com"
});

/**
 * @param {string} domain
 * @param {string} concept
 * @param {string} user use who is adding the concept in the given domain
 * @param {Function} callback with the (conceptId, null) else with (null, error)
 * @public
 */
InMemoryStore.prototype.addConcept = function(domain, concept, user, callback) {
  if (!concept.name) {
    callback(null,
      util.format("key 'name' is missing in %s", JSON.stringify(concept)));
  } else {
    var storedConcept = JSON.parse(InMemoryStore.PROTOTYPE_CONCEPT);
    winston.debug("prototyped %s", JSON.stringify(storedConcept));
    storedConcept.id = generateConceptId(concept.name.toLowerCase());
    storedConcept.name = concept.name;
    storedConcept.domain = domain;
    storedConcept.description = concept.description || "";
    storedConcept.created_at = new Date().toISOString();
    storedConcept.created_by = user;
    winston.debug("adding concept %s", JSON.stringify(storedConcept));
    // populate the domain and concept hierarchy
    this.domainToConcepts[domain] = this.domainToConcepts[domain] || {};
    var concepts = this.domainToConcepts[domain];
    concepts[storedConcept.id] = storedConcept;
    callback(storedConcept.id, null); // success adding a concept!
  }
}

/**
 * @param {string} domain
 * @param {string} id the concept id
 * @param {Function} callback with the concept object if found else null
 * @public
 */

InMemoryStore.prototype.getConcept = function(domain, id, callback) {
  var concepts = this.domainToConcepts[domain];
  if(!concepts) { callback(null); }
  else {
    var concept = concepts[id];
    if(!concept) {
      callback(null);
    } else {
      callback(concept);
    }
  }
}

InMemoryStore.PROTOTYPE_RESOURCE =  JSON.stringify({
    "id" : null,
    "description": "null",
    "link" : null,
    "conceptId": null,
    "likedBy" : {}, // map of users who like this resource
    "numLikes" : 0, // pre-computed from likedBy
    // dummy values, will be replaced
    "created_at" : "2015-12-10T20:40:49.318Z",
    "created_by": "test@gmail.com"
});

/**
 * @param {string} concept
 * @param {string} link link to a resource for the concept
 * @param {string} user use who is adding the resource to the concept
 * @param {Function} callback with the (resourceId, null) else with (null, error)
 * @public
 */
InMemoryStore.prototype.addResource = function(domain, conceptId, resource, user, callback) {
  if (!resource.link) {
    callback(null,
      util.format("key 'link' is missing in %s", JSON.stringify(resource)));
  } else {
    var storedResource = JSON.parse(InMemoryStore.PROTOTYPE_RESOURCE);
    storedResource.id = uuid.v1();
    storedResource.link = resource.link;
    storedResource.description = resource.description;
    storedResource.conceptId = conceptId;
    storedResource.created_at = new Date().toISOString();
    storedResource.created_by = user;
    winston.debug("adding resource %s", JSON.stringify(storedResource));
    var concepts = this.domainToConcepts[domain];
    if(!concepts) {
      callback(null, util.format('domain %s missing!', domain));
    } else if(!concepts[conceptId]) {
      callback(null, util.format('conceptId %s missing in domain %s!', conceptId, domain));
    } else {
      concepts[conceptId].resources.push(storedResource.id);
      this.resources[storedResource.id] = storedResource;
      callback(storedResource.id, null); // success adding a concept!
    }
  }
}

/**
 * @param {string} domain
 * @param {string} conceptId
 * @param {string} resId the resource id
 * @param {Function} callback with the resource object if found else null
 * @public
 */

InMemoryStore.prototype.getResource = function(domain, conceptId, resId, callback) {
  var concepts = this.domainToConcepts[domain];
  if(!concepts || !concepts[conceptId]) {
    callback(null);
  } else {
    var resource = this.resources[resId];
    if(!resource) {
      callback(null);
    } else {
      callback(resource);
    }
  }
}

/**
 * @param {string} domain
 * @param {string} conceptId
 * @param {string} resId the resource id
 * @param {string} user the user liking or unliking the resource
 * @param {delta} +1 for like and -1 for unlike
 * @param {Function} callback with the like count if resource found else error
 * @private
 */
InMemoryStore.prototype.adjustResLikeCount = function(domain, conceptId, resId, user, delta, callback) {
  if(delta !== 1 && delta !== -1) {
    callback(util.format('delta %s is invalid. delta can only be +1 or -1.',
                                                                String(delta)));
  } else {
    this.getResource(domain, conceptId, resId, function(resource) {
      if(!resource) {
        var error = util.format("resource %s not found", resId);
        callback(null, error);
      } else {
        resource.likedBy[user] = (delta === 1) ? true : false;
        resource.numLikes = resource.numLikes + delta;
        callback(resource.numLikes, null);
      }
    });
  }
}

/**
 * @param {string} domain
 * @param {string} conceptId
 * @param {string} resId the resource id
 * @param {string} user the user liking the resource
 * @param {Function} callback with the like count if resource found else error
 * @public
 */

InMemoryStore.prototype.likeResource = function(domain, conceptId, resId, user, callback) {
  this.adjustResLikeCount(domain, conceptId, resId, user, 1, callback);
}

/**
 * @param {string} domain
 * @param {string} conceptId
 * @param {string} resId the resource id
 * @param {string} user the user unliking the resource
 * @param {Function} callback with the like count if resource found else error
 * @public
 */

InMemoryStore.prototype.unlikeResource = function(domain, conceptId, resId, user, callback) {
  this.adjustResLikeCount(domain, conceptId, resId, user, -1, callback);
}


var exports = module.exports = {};
exports.conceptStore = new InMemoryStore();
