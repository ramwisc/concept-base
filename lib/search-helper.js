var winston = require('winston');

/**
 * @constructor
 */
function SearchIndex() {
    // inverted index from query terms to document ids.
    this.index = {};
}

SearchIndex.prototype.STOP_WORDS = {
  "is": true,
  "was": true,
  "of" : true,
  "in" : true,
  "on" : true,
  "the" : true,
  "a" : true,
  "an" : true,
  "between": true,
  "among" : true,
  "and" : true,
  "or" : true,
};

SearchIndex.prototype.isStopWord = function(term) {
  return this.STOP_WORDS[term];
}

SearchIndex.prototype.getSearchTokens = function(terms) {
  var splits = terms.trim().toLowerCase().split(/\s+/);
  var output = [];
  for(var i = 0; i < splits.length; i++) {
    var term = splits[i];
    var count = 1, chars = 2;
    // index prefixes
    while (count <= term.length - 1) {
      output.push(term.substring(0, chars));
      ++chars;
      ++count;
    }
  }
  return output;
}

/**
 * create a reverse mapping from each term to the docId
 */
SearchIndex.prototype.addTerms = function(terms, docId) {
  var tokens = this.getSearchTokens(terms);
  var that = this;
  tokens.forEach(function(term) {
    that.index[term] = that.index[term] || [];
    winston.debug('adding term %s to doc %s', term, docId);
    that.index[term].push(docId);
  });
  winston.debug("added %s tokens to index", tokens.length);
}

/**
 * search and callback with the docIds matching the search terms. ranking is
 * arbitrary. Return a docId even if at least 1 term matches it.
 */
SearchIndex.prototype.search = function(terms, callback) {
  var tokens = this.getSearchTokens(terms);
  var that = this;
  var matchedDocIds = {};
  tokens.forEach(function(term) {
    if(that.index[term]) {
      that.index[term].forEach(function(docId) {
        if(!matchedDocIds[docId]) {
          matchedDocIds[docId] = true;
        }
      });
    }
  });
  winston.info('matched doc ids %s for query %s', JSON.stringify(matchedDocIds), terms);
  callback(Object.keys(matchedDocIds));
}

exports.SearchIndex = SearchIndex;
