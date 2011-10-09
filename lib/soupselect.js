/**
Port of Simon Willison's Soup Select http://code.google.com/p/soupselect/
http://www.opensource.org/licenses/mit-license.php

MIT licensed http://www.opensource.org/licenses/mit-license.php
*/

var domUtils = require("htmlparser").DomUtils;
var sys = require('sys');

var tagRe = /^[a-z0-9]+$/;

/*
 /^(\w+)?\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/
   \---/  \---/\-------------/    \-------/
     |      |         |               |
     |      |         |           The value
     |      |    ~,|,^,$,* or =
     |   Attribute 
    Tag
*/
var attrSelectRe = /^(\w+)?\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/;

/**
Takes an operator and a value and returns a function which can be used to
test other values against test provided value using the given operation
Used to checking attribute values for attribute selectors
*/
function makeValueChecker(operator, value) {
    value = typeof(value) === 'string' ? value : '';
    
    return operator ? {
        '=': function ( test_value ) { return test_value === value; },
        // attribute includes value as one of a set of space separated tokens
        '~': function ( test_value ) { return test_value ? test_value.split(/\s+/).indexOf(value) !== -1 : false; },
        // attribute starts with value
        '^': function ( test_value ) { return test_value ? test_value.substr(0, value.length) === value : false; },
        // attribute ends with value
        '$': function ( test_value ) { return test_value ? test_value.substr(-value.length) === value : false; },
        // attribute contains value
        '*': function ( test_value ) { return test_value ? test_value.indexOf(value) !== -1 : false; },
        // attribute is either exactly value or starts with value-
        '|': function ( test_value ) { return test_value ? test_value === value ||
             test_value.substr(0, value.length + 1) === value + '-' : false; },
        // default to just check attribute existence...
        }[operator] : function ( test_value ) { return test_value ? true : false; };

}

function getNextSibling(element) {
    var siblings = element.parent.children;
    return siblings[element.index + 1];
}

function getNextSiblings(element) {
    var siblings = element.parent.children;
    return siblings.slice(element.index + 1);
}


/**
Takes a dom tree or part of one from htmlparser and applies
the provided selector against. The returned value is also
a valid dom tree, so can be passed by into 
htmlparser.DomUtil.* calls
*/
exports.select = function(dom, selector, noRecurse) {
    var currentContext = [dom], newContext;
    var found, tag, options, recurse;
    
    var tokens = selector.split(/\s+/);
    
    for ( var i = 0; i < tokens.length; i++ ) {

        if (tokens[i] === '>') {
            newContext = [];
            currentContext.forEach(function(e) {
                newContext = newContext.concat(e.children);
            })
            currentContext = newContext;
            recurse = false;
            i++;
        }
        else if (tokens[i] === '+') {
            currentContext = currentContext.map(getNextSibling);
            recurse = false;
            i++;
        }
        else if (tokens[i] === '~') {
            newContext = [];
            currentContext.forEach(function(e) {
                newContext = newContext.concat(getNextSiblings(e));
            })
            currentContext = newContext;
            recurse = false;
            i++;
        }
        else {
            newContext = [];
            currentContext.forEach(function(e) {
                newContext = newContext.concat(e.children ? e.children : [e]);
            })
            currentContext = newContext;
            recurse = !noRecurse;
        }

        // Attribute selectors
        var match = attrSelectRe.exec(tokens[i]);
        if ( match ) {
            var attribute = match[2], operator = match[3], value = match[4];
            tag = match[1];
            options = {};
            options[attribute] = makeValueChecker(operator, value);
            
            found = [];
            for (var j = 0; j < currentContext.length; j++ ) {
                found = found.concat(domUtils.getElements(options, currentContext[j], recurse));
            };
            
            if ( tag ) {
                // Filter to only those matching the tag name
                found = domUtils.getElements({ 'tag_name': tag }, found, false);
            }
        
            currentContext = found;
        
        } 
    
        // ID selector
        else if ( tokens[i].indexOf('#') !== -1 ) {
            found = [];
            
            var id_selector = tokens[i].split('#', 2)[1];
            
            // need to stop on the first id found (in bad HTML)...
            var el = null;
            for ( var k = 0; k < currentContext.length; k++ ) {
                
                el = domUtils.getElementById(id_selector, currentContext[k], recurse);

                if ( el ) {
                    found.push(el);
                    break;
                }
            }
            
            if (!found[0]) {
                currentContext = [];
                break;
            }
            
            currentContext = found;
        }
        
        // Class selector
        else if ( tokens[i].indexOf('.') !== -1 ) {
            var parts = tokens[i].split('.');
            tag = parts[0];
            options = {};
            options['class'] = function (value) {
                if (!value) return false;
                var classes = value.split(/\s+/);
                for (var i = 1, len = parts.length; i < len; i++) {
                    if (!~classes.indexOf(parts[i])) return false;
                }
                return true;
            };
            
            found = [];
            for ( var l = 0; l < currentContext.length; l++ ) {
                var context = currentContext[l];
                if ( tag.length > 0 ) {
                    context = domUtils.getElementsByTagName(tag, context, recurse);
                    // don't recurse in the case we have a tag or we get children we might not want
                    found = found.concat(domUtils.getElements(options, context, false));
                } else {
                    found = found.concat(domUtils.getElements(options, context, recurse));
                }
                
            };
            
            currentContext = found;
        }
        
        // Star selector
        else if ( tokens[i] === '*' ) {
            // nothing to do right?
        }
        
        // Tag selector
        else {
            if (!tagRe.test(tokens[i])) {
                currentContext = [];
                break;
            }
            
            found = [];
            for ( var m = 0; m < currentContext.length; m++ ) {
                found = found.concat(domUtils.getElementsByTagName(tokens[i], currentContext[m], recurse));
            };
            
            currentContext = found;
        }
    };
    
    return currentContext;
};
