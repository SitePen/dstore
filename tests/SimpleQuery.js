define([
	'../SimpleQuery',
	'dojo/_base/declare',
	'../Filter',
	'intern!object',
	'intern/chai!assert'
], function (SimpleQuery, declare, Filter, registerSuite, assert) {
	var testData = [
		{ id: 1, name: 'one', odd: true },
		{ id: 2, name: 'two', odd: false },
		{ id: 3, name: 'three', odd: true },
		{ id: 4, name: 'four', odd: false },
		{ id: 5, name: 'five', odd: true }
	];

	var simpleQuery = new SimpleQuery();

	registerSuite({
		name: 'SimpleQuery',

		'filter with predicate': function () {
			var filter = simpleQuery._createFilterQuerier({
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
			var filter = simpleQuery._createFilterQuerier(filterExpression.eq('odd', false));

			assert.deepEqual(filter(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 4, name: 'four', odd: false }
			]);
		},

		'sort with array of sort attributes': function () {
			var sort = simpleQuery._createSortQuerier([
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
			var sort = simpleQuery._createSortQuerier(function (a, b) {
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

		'nested queries': function () {
			var f = new Filter();
			var isEven = f.eq('odd', false);
			var isOdd = f.eq('odd', true);
			var isZero = f.eq('name', 'zero');
			var isOne = f.eq('name', 'one');
			var query = f.or(f.and(isEven, isZero), f.and(isOdd, isOne));
			var filter = simpleQuery._createFilterQuerier(query);

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true }
			]);
		}
	});
});
