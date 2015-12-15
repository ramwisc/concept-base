/**
 * Module that provides data access to the concepts within domains
 */
var winston = require('winston');
var util = require('util');
var uuid = require('uuid');
var async = require('async');
var searchIndex = require('./search-helper.js');
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
  // inveted index from keywords to array of conceptIds.
  this.index = new searchIndex.SearchIndex();
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
    // index the terms in the concept name with the docId as "domain/conceptId"
    this.index.addTerms(concept.name, domain + "/" + storedConcept.id);
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
      var resourceCache = {};
      var other = this;
      winston.debug("resources %s", JSON.stringify(concept.resources));
      // https://www.npmjs.com/package/async#sortBy
      async.sortBy(concept.resources, function(resourceId, cb) {
        other.getResource(domain, id, resourceId, function(resource) {
          if (resource) {
            resourceCache[resourceId] = resource;
            cb(null, resource.numLikes * -1); // descending order
          } else {
            var err = util.format("resourceId %s not found in concept %s, domain %s",
                                                        resourceId, id, domain);
            cb(err, null);
          }
        });
      }, function(err, sortedResources) {
        var modifiedConcept = {};
        if (err) {
          winston.error(err);
          callback(null);
        } else {
          var keys = Object.keys(concept);
          for(var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if(k !== 'resources') {
              modifiedConcept[k] = concept[k];
            }
          }
          modifiedConcept.resources = [];
          for(var i = 0; i < sortedResources.length; i++) {
            var resId = sortedResources[i];
            modifiedConcept.resources.push(resourceCache[resId]);
          }
        }
        callback(modifiedConcept);
      });
    }
  }
}

/**
 * API to search for concepts by concept name
 *
 * @param {string} query String
 * @param {Function} callback with (matched concepts, null) or (null, error)
 * @public
 */
InMemoryStore.prototype.searchConcepts = function(query, callback) {
  var that = this;
  var matchedConcepts = [];
  this.index.search(query, function(conceptIdsWithDomain, error) {
      if (error) {
        callback(null, error);
      } else {
        var tasks = [];
        conceptIdsWithDomain.forEach(function(cId) {
            var handler = (function (_cId) {
              return function(cb) {
                var tokens =  _cId.split("/");
                var domain = tokens[0];
                var conceptId = tokens[1];
                that.getConcept(domain, conceptId, function(concept) {
                  if(!concept) {
                    cb('error retrieving ' + _cId, null);
                  } else {
                    winston.debug('adding conceptId %s %s', conceptId, _cId);
                    matchedConcepts.push(concept);
                    cb(null, conceptId);
                  }
                });
              };
            }) (cId);
            tasks.push(handler);
        });
        async.parallel(tasks, function(error, results) {
          if (error) {
            callback(null, error);
          } else {
            callback(matchedConcepts, null);
          }
        });
      }
  });
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
      callback(storedResource.id, null); // success adding a resource!
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
        if(resource.numLikes < 0) {
          winston.warn('like count became negative for domain: %s concept: %s resource: %s',
                                                    domain, conceptId, resId);
          resource.numLikes = 0;
        }
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
