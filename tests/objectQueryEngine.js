define([
	'../objectQueryEngine',
	'dojo/_base/declare',
	'../Filter',
	'intern!object',
	'intern/chai!assert'
], function (objectQueryEngine, declare, Filter, registerSuite, assert) {
	var testData = [
		{ id: 1, name: 'one', odd: true },
		{ id: 2, name: 'two', odd: false },
		{ id: 3, name: 'three', odd: true },
		{ id: 4, name: 'four', odd: false },
		{ id: 5, name: 'five', odd: true }
	];

	registerSuite({
		name: 'objectQueryEngine',

		'filter with predicate': function () {
			var filter = objectQueryEngine.filter({
				type: 'function',
				args: [function (o) { return o.odd; }]
			});

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 3, name: 'three', odd: true },
				{ id: 5, name: 'five', odd: true }
			]);
		},

		'filter with object': function () {
			var filterExpression = new Filter();
			var filter = objectQueryEngine.filter(filterExpression.eq('odd', false));

			assert.deepEqual(filter(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 4, name: 'four', odd: false }
			]);
		},

		'sort with array of sort attributes': function () {
			var sort = objectQueryEngine.sort([
				{ property: 'odd' },
				{ property: 'name', descending: true }
			]);

			assert.deepEqual(sort(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 4, name: 'four', odd: false },
				{ id: 3, name: 'three', odd: true },
				{ id: 1, name: 'one', odd: true },
				{ id: 5, name: 'five', odd: true }
			]);
		},

		'sort with comparator': function () {
			var sort = objectQueryEngine.sort(function (a, b) {
				a = a.name;
				b = b.name;
				return (a < b) ? -1 : (a === b ? 0 : 1);
			});

			assert.deepEqual(sort(testData), [
				{ id: 5, name: 'five', odd: true },
				{ id: 4, name: 'four', odd: false },
				{ id: 1, name: 'one', odd: true },
				{ id: 3, name: 'three', odd: true },
				{ id: 2, name: 'two', odd: false }
			]);
		},

		'range': function () {
			var range = objectQueryEngine.range({ start: 1, end: 4 });

			assert.deepEqual(range(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 3, name: 'three', odd: true },
				{ id: 4, name: 'four', odd: false }
			]);
		}
	});
});
