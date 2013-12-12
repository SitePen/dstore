define([
	'../Store',
	'intern!object',
	'intern/chai!assert'
], function(Store, registerSuite, assert){

	var store;
	registerSuite({
		name: 'dstore Store',

		beforeEach: function(){
			store = new Store();
		},

		'filter': function(){
			var expectedFilter1 = { prop1: "one" },
				expectedFilter2 = function filterFunc(){},
				filteredCollection;

			filteredCollection = store.filter(expectedFilter1);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1 ]);

			filteredCollection = filteredCollection.filter(expectedFilter2);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1, expectedFilter2 ]);
		},

		'sort': function(){
			var expectedSort1 = { attribute: "prop1", descending: true },
				expectedSort2 = { attribute: "prop2", descending: false },
				expectedSort3 = { attribute: "prop2" },
				sortedCollection;

			sortedCollection = store.sort(expectedSort1.attribute, expectedSort1.descending);
			assert.deepEqual(sortedCollection.sorted, [ expectedSort1 ]);

			sortedCollection = sortedCollection.sort(expectedSort2.attribute, expectedSort2.descending);
			assert.deepEqual(sortedCollection.sorted, [ expectedSort1, expectedSort2 ]);

			sortedCollection = sortedCollection.sort(expectedSort3.attribute);
			assert.deepEqual(
				sortedCollection.sorted,
				[ expectedSort1, expectedSort2, { attribute: expectedSort3.attribute, descending: false } ]
			);
		},

		'range': function(){
			var expectedRange1 = { start: 10, end: 20 },
				expectedRange2 = { start: 25 },
				rangedCollection;

			rangedCollection = store.range(expectedRange1.start, expectedRange1.end);
			assert.deepEqual(rangedCollection.ranged, expectedRange1);

			rangedCollection = rangedCollection.range(expectedRange2.start);
			assert.deepEqual(rangedCollection.ranged, { start: expectedRange2.start, end: undefined });
		}

		// TODO: Add map test and tests for other Store features
	});
});
