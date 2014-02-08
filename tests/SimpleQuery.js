define([
	'../SimpleQuery',
	'dojo/_base/declare',
	'intern!object',
	'intern/chai!assert'
], function (SimpleQuery, declare, registerSuite, assert) {
	var Base = declare(null, {
			filter: function () { return {}; },
			sort: function () { return {}; },
			range: function () { return {}; }
		}),
		TestStore = declare([ Base, SimpleQuery ], {}),
		testData = [
			{ id: 1, name: 'one', odd: true },
			{ id: 2, name: 'two', odd: false },
			{ id: 3, name: 'three', odd: true }
		];

	var store;
	registerSuite({
		name: 'dstore SimpleQuery',

		beforeEach: function () {
			store = new TestStore();
		},

		'filter': function () {
			store.testFilter = function (o) { return !o.odd; };

			var filterObject = { odd: true },
				filterFunction = function filterFunc(o) { return o.id >= 2; },
				filterIdentifier = 'testFilter',
				filteredCollection;

			filteredCollection = store.filter(filterObject);
			assert.property(filteredCollection, 'queryer');
			assert.deepEqual(
				filteredCollection.queryer(testData),
				[ testData[0], testData[2] ]
			);

			filteredCollection = store.filter(filterFunction);
			assert.property(filteredCollection, 'queryer');
			assert.deepEqual(
				filteredCollection.queryer(testData),
				[ testData[1], testData[2] ]
			);

			filteredCollection = filteredCollection.filter(filterIdentifier);
			assert.property(filteredCollection, 'queryer');
			assert.deepEqual(
				filteredCollection.queryer(testData),
				[ testData[1] ]
			);
		},

		'sort': function () {
			var expectedSort1 = { attribute: 'id', descending: true },
				expectedSort2 = { attribute: 'odd', descending: false },
				expectedSort3 = { attribute: 'name' },
				sortedCollection;

			sortedCollection = store.sort(expectedSort1.attribute, expectedSort1.descending);
			assert.property(sortedCollection, 'queryer');
			assert.deepEqual(sortedCollection.queryer(testData), [ testData[2], testData[1], testData[0] ]);

			sortedCollection = sortedCollection.sort(expectedSort2.attribute, expectedSort2.descending);
			assert.deepEqual(sortedCollection.queryer(testData), [ testData[1], testData[2], testData[0] ]);

			sortedCollection = sortedCollection.sort(expectedSort3.attribute);
			assert.deepEqual(sortedCollection.queryer(testData), [ testData[0], testData[2], testData[1] ]);
		}
	});
});
