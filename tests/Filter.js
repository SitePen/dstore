define([
	'../Filter',
	'../SimpleQuery',
	'dojo/_base/declare',
	'intern!tdd',
	'intern/chai!assert'
], function (Filter, SimpleQuery, declare, suite, assert) {
	var testData = [
		{ id: 1, name: 'one', odd: true },
		{ id: 2, name: 'two', odd: false },
		{ id: 3, name: 'three', odd: true },
		{ id: 4, name: 'four', odd: false },
		{ id: 5, name: 'five', odd: true }
	];

	suite.suite('Filter', function() {
		var simpleQuery = new SimpleQuery();

		suite.test('eq', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.eq('odd', false));

			assert.deepEqual(filter(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 4, name: 'four', odd: false }
			]);
		});

		suite.test('ne', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.ne('odd', false));

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 3, name: 'three', odd: true },
				{ id: 5, name: 'five', odd: true }
			]);
		});

		suite.test('lt', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.lt('id', 3));

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 2, name: 'two', odd: false }
			]);
		});

		suite.test('lte', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.lte('id', 3));

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 2, name: 'two', odd: false },
				{ id: 3, name: 'three', odd: true }
			]);
		});

		suite.test('gt', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.gt('id', 3));

			assert.deepEqual(filter(testData), [
				{ id: 4, name: 'four', odd: false },
				{ id: 5, name: 'five', odd: true }
			]);
		});

		suite.test('gte', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.gte('id', 3));

			assert.deepEqual(filter(testData), [
				{ id: 3, name: 'three', odd: true },
				{ id: 4, name: 'four', odd: false },
				{ id: 5, name: 'five', odd: true }
			]);
		});
	});
});
