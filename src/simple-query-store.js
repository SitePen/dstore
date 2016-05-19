var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './store'], function (require, exports) {
    var store_1 = require('./store');
    function makeGetter(property, queryAccessors) {
        if (property.indexOf('.') > -1) {
            var propertyPath = property.split('.');
            var pathLength = propertyPath.length;
            return function (object) {
                for (var i = 0; i < pathLength; i++) {
                    object = object && (queryAccessors && object.get ? object.get(propertyPath[i]) : object[propertyPath[i]]);
                }
                return object;
            };
        }
        // else
        return function (object) {
            return object.get ? object.get(property) : object[property];
        };
    }
    var comparators = {
        eq: function (value, required) {
            return value === required;
        },
        'in': function (value, required) {
            // allow for a collection of data
            return (required.data || required).indexOf(value) > -1;
        },
        ne: function (value, required) {
            return value !== required;
        },
        lt: function (value, required) {
            return value < required;
        },
        lte: function (value, required) {
            return value <= required;
        },
        gt: function (value, required) {
            return value > required;
        },
        gte: function (value, required) {
            return value >= required;
        },
        match: function (value, required) {
            return required.test(value);
        },
        contains: function (value, required, object, key) {
            var collection = this;
            return (required.data || required).every(function (requiredValue) {
                if (typeof requiredValue === 'object' && requiredValue.type) {
                    var comparator = collection._getFilterComparator(requiredValue.type);
                    return value.some(function (item) {
                        return comparator.call(collection, item, requiredValue.args[1], object, key);
                    });
                }
                return value.indexOf(requiredValue) > -1;
            });
        }
    };
    var SimpleQueryStore = (function (_super) {
        __extends(SimpleQueryStore, _super);
        function SimpleQueryStore() {
            _super.apply(this, arguments);
        }
        SimpleQueryStore.prototype._createFilterQuerier = function (filter) {
            // create our matching filter function
            var queryAccessors = this.queryAccessors;
            var collection = this;
            var querier = getQuerier(filter);
            function getQuerier(filter) {
                var querier;
                var type = filter.type;
                var args = filter.args;
                var comparator = collection._getFilterComparator(type);
                if (comparator) {
                    // it is a comparator
                    var firstArg = args[0];
                    var getProperty = makeGetter(firstArg, queryAccessors);
                    var secondArg = args[1];
                    if (secondArg && secondArg.fetchSync) {
                        // if it is a collection, fetch the contents (for `in` and `contains` operators)
                        secondArg = secondArg.fetchSync();
                    }
                    return function (object) {
                        // get the value for the property and compare to expected value
                        return comparator.call(collection, getProperty(object), secondArg, object, firstArg);
                    };
                }
                switch (type) {
                    case 'and':
                    case 'or':
                        for (var i = 0, l = args.length; i < l; i++) {
                            // combine filters, using and or or
                            var nextQuerier = getQuerier(args[i]);
                            if (querier) {
                                // combine the last querier with a new one
                                querier = (function (a, b) {
                                    return type === 'and' ?
                                        function (object) {
                                            return a(object) && b(object);
                                        } :
                                        function (object) {
                                            return a(object) || b(object);
                                        };
                                })(querier, nextQuerier);
                            }
                            else {
                                querier = nextQuerier;
                            }
                        }
                        return querier;
                    case 'function':
                        return args[0];
                    case 'string':
                        // named filter
                        var filterFunction = collection[args[0]];
                        if (!filterFunction) {
                            throw new Error('No filter function ' + args[0] + ' was found in the collection');
                        }
                        return filterFunction;
                    case undefined:
                        return function () {
                            return true;
                        };
                    default:
                        throw new Error('Unknown filter operation "' + type + '"');
                }
            }
            return function (data) {
                return data.filter(querier);
            };
        };
        SimpleQueryStore.prototype._getFilterComparator = function (type) {
            // summary:
            //		Get the comparator for the specified type
            // returns: Function?
            return comparators[type];
        };
        SimpleQueryStore.prototype._createSelectQuerier = function (properties) {
            return function (data) {
                var l = properties.length;
                return data.map(properties instanceof Array ?
                    // array of properties
                    // array of properties
                    function (object) {
                        var selectedObject = {};
                        for (var i = 0; i < l; i++) {
                            var property = properties[i];
                            selectedObject[property] = object[property];
                        }
                        return selectedObject;
                    } :
                    // single property
                    // single property
                    function (object) {
                        return object[properties];
                    });
            };
        };
        SimpleQueryStore.prototype._createSortQuerier = function (sorted) {
            var queryAccessors = this.queryAccessors;
            return function (data) {
                data = data.slice();
                data.sort(typeof sorted == 'function' ? sorted : function (a, b) {
                    for (var i = 0; i < sorted.length; i++) {
                        var comparison = void 0;
                        var sorter = sorted[i];
                        if (typeof sorter == 'function') {
                            comparison = sorter(a, b);
                        }
                        else {
                            var getProperty = sorter.get || (sorter.get = makeGetter(sorter.property, queryAccessors));
                            var descending = sorter.descending;
                            var aValue = getProperty(a);
                            var bValue = getProperty(b);
                            aValue != null && (aValue = aValue.valueOf());
                            bValue != null && (bValue = bValue.valueOf());
                            if (aValue === bValue) {
                                comparison = 0;
                            }
                            else {
                                // Prioritize undefined > null > defined
                                var isALessThanB = typeof bValue === 'undefined' ||
                                    bValue === null && typeof aValue !== 'undefined' ||
                                    aValue != null && aValue < bValue;
                                comparison = Boolean(descending) === isALessThanB ? 1 : -1;
                            }
                        }
                        if (comparison !== 0) {
                            return comparison;
                        }
                    }
                    return 0;
                });
                return data;
            };
        };
        return SimpleQueryStore;
    })(store_1.default);
    exports.default = SimpleQueryStore;
});
