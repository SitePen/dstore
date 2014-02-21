define([
	'../Store',
	'intern!object',
	'intern/chai!assert'
], function (Store, registerSuite, assert) {

	var store;
	registerSuite({
		name: 'dstore Store',

		beforeEach: function () {
			store = new Store();
		},

		'filter': function () {
			var expectedFilter1 = { prop1: 'one' },
				expectedFilter2 = function filterFunc() {},
				filteredCollection;

			filteredCollection = store.filter(expectedFilter1);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1 ]);

			filteredCollection = filteredCollection.filter(expectedFilter2);
			assert.deepEqual(filteredCollection.filtered, [ expectedFilter1, expectedFilter2 ]);
		},

		'sort': function () {
			var sortObject = { property: 'prop1', descending: true },
				sortObjectArray = [ sortObject, { property: 'prop2', descending: false } ],
				comparator = function comparator() {},
				sortedCollection;

			sortedCollection = store.sort(sortObject.property, sortObject.descending);
			assert.deepEqual(sortedCollection.sorted, [ sortObject ]);

			sortedCollection = store.sort(sortObject);
			assert.deepEqual(sortedCollection.sorted, [ sortObject ]);

			sortedCollection = sortedCollection.sort(sortObjectArray);
			assert.deepEqual(sortedCollection.sorted, sortObjectArray);

			sortedCollection = sortedCollection.sort(comparator);
			assert.deepEqual(sortedCollection.sorted, comparator);
		},

		'range': function () {
			var rangedCollection = store.range(100);
			assert.deepEqual(rangedCollection.ranged, { start: 100, end: undefined });
			rangedCollection = rangedCollection.range(25, 50);
			assert.deepEqual(rangedCollection.ranged, { start: 125, end: 150 });

			rangedCollection = store.range(100, 200);
			assert.deepEqual(rangedCollection.ranged, { start: 100, end: 200 });
			rangedCollection = rangedCollection.range(25);
			assert.deepEqual(rangedCollection.ranged, { start: 125, end: 200 });
		}

		// TODO: Add map test and tests for other Store features
		// TODO: Add tests for add, update, remove, and refresh events, including refresh being emitted on sort.
	});
});
