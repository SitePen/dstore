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

	suite.suite('Filter', function () {
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

		suite.test('contains', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.contains('nums', 5));
			var testData = [
				{ id: 1, nums: [1, 2, 3] },
				{ id: 2, nums: [4, 5, 6] },
				{ id: 3, nums: [3, 4, 5] },
				{ id: 4, nums: [7, 8, 9] },
				{ id: 5, nums: [6, 7, 8] }
			];

			assert.deepEqual(filter(testData), [
				{ id: 2, nums: [4, 5, 6] },
				{ id: 3, nums: [3, 4, 5] }
			]);
		});

		suite.test('in', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.in('name', ['two', 'five']));

			assert.deepEqual(filter(testData), [
				{ id: 2, name: 'two', odd: false },
				{ id: 5, name: 'five', odd: true }
			]);
		});

		suite.test('match', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.match('name', /f/));

			assert.deepEqual(filter(testData), [
				{ id: 4, name: 'four', odd: false },
				{ id: 5, name: 'five', odd: true }
			]);
		});

		suite.test('and', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.and(
				filterExpression.lt('id', 4),
				filterExpression.eq('odd', true)
			));

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 3, name: 'three', odd: true }
			]);
		});

		suite.test('or', function () {
			var filterExpression = new Filter();
			var filter = simpleQuery._createFilterQuerier(filterExpression.or(
				filterExpression.eq('name', 'one'),
				filterExpression.eq('id', 5)
			));

			assert.deepEqual(filter(testData), [
				{ id: 1, name: 'one', odd: true },
				{ id: 5, name: 'five', odd: true }
			]);
		});

		suite.suite('chains', function () {
			suite.test('eq', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.eq('odd', false).eq('name', 'two'));

				assert.deepEqual(filter(testData), [
					{ id: 2, name: 'two', odd: false }
				]);
			});

			suite.test('ne', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.ne('odd', false).lt('id', 4));

				assert.deepEqual(filter(testData), [
					{ id: 1, name: 'one', odd: true },
					{ id: 3, name: 'three', odd: true }
				]);
			});

			suite.test('lt', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.lt('id', 3).ne('name', 'one'));

				assert.deepEqual(filter(testData), [
					{ id: 2, name: 'two', odd: false }
				]);
			});

			suite.test('lte', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.lte('id', 3).eq('odd', true));

				assert.deepEqual(filter(testData), [
					{ id: 1, name: 'one', odd: true },
					{ id: 3, name: 'three', odd: true }
				]);
			});

			suite.test('gt', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.gt('id', 3).eq('name', 'four'));

				assert.deepEqual(filter(testData), [
					{ id: 4, name: 'four', odd: false }
				]);
			});

			suite.test('gte', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.gte('id', 3).eq('odd', false));

				assert.deepEqual(filter(testData), [
					{ id: 4, name: 'four', odd: false }
				]);
			});

			suite.test('contains', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.contains('nums', 5).gt('id', 2));
				var testData = [
					{ id: 1, nums: [1, 2, 3] },
					{ id: 2, nums: [4, 5, 6] },
					{ id: 3, nums: [3, 4, 5] },
					{ id: 4, nums: [7, 8, 9] },
					{ id: 5, nums: [6, 7, 8] }
				];

				assert.deepEqual(filter(testData), [
					{ id: 3, nums: [3, 4, 5] }
				]);
			});

			suite.test('in', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.in('name', ['two', 'five']).eq('odd', false));

				assert.deepEqual(filter(testData), [
					{ id: 2, name: 'two', odd: false }
				]);
			});

			suite.test('match', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.match('name', /f/).lt('id', 5));

				assert.deepEqual(filter(testData), [
					{ id: 4, name: 'four', odd: false }
				]);
			});

			suite.test('and1', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.and(
					filterExpression.lt('id', 4).ne('name', 'three'),
					filterExpression.eq('odd', true)
				));

				assert.deepEqual(filter(testData), [
					{ id: 1, name: 'one', odd: true }
				]);
			});

			suite.test('and2', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.and(
					filterExpression.eq('odd', true),
					filterExpression.lt('id', 4).ne('name', 'three')
				));

				assert.deepEqual(filter(testData), [
					{ id: 1, name: 'one', odd: true }
				]);
			});

			suite.test('and3', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.and(
					filterExpression.gt('id', 1).lt('id', 8),
					filterExpression.gt('id', 2).ne('odd', false)
				));
				var testData = [
					{ id: 1, odd: true },
					{ id: 2, odd: false },
					{ id: 3, odd: true },
					{ id: 4, odd: false },
					{ id: 5, odd: true },
					{ id: 6, odd: false },
					{ id: 7, odd: true },
					{ id: 8, odd: false }
				]

				assert.deepEqual(filter(testData), [
					{ id: 3, odd: true },
					{ id: 5, odd: true },
					{ id: 7, odd: true }
				]);
			});

			suite.test('and4', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.and(
					filterExpression.gt('id', 2).ne('odd', false),
					filterExpression.gt('id', 1).lt('id', 8)
				));
				var testData = [
					{ id: 1, odd: true },
					{ id: 2, odd: false },
					{ id: 3, odd: true },
					{ id: 4, odd: false },
					{ id: 5, odd: true },
					{ id: 6, odd: false },
					{ id: 7, odd: true },
					{ id: 8, odd: false }
				]

				assert.deepEqual(filter(testData), [
					{ id: 3, odd: true },
					{ id: 5, odd: true },
					{ id: 7, odd: true }
				]);
			});

			suite.test('or1', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.or(
					filterExpression.eq('name', 'one').eq('odd', false),
					filterExpression.eq('id', 5)
				));

				assert.deepEqual(filter(testData), [
					{ id: 5, name: 'five', odd: true }
				]);
			});

			suite.test('or2', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.or(
					filterExpression.eq('id', 5),
					filterExpression.eq('name', 'one').eq('odd', false)
				));

				assert.deepEqual(filter(testData), [
					{ id: 5, name: 'five', odd: true }
				]);
			});

			suite.test('or3', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.or(
					filterExpression.gt('id', 1).eq('odd', true),
					filterExpression.match('name', /f/).ne('name', 'four')
				));

				assert.deepEqual(filter(testData), [
					{ id: 3, name: 'three', odd: true },
					{ id: 5, name: 'five', odd: true }
				]);
			});

			suite.test('or4', function () {
				var filterExpression = new Filter();
				var filter = simpleQuery._createFilterQuerier(filterExpression.or(
					filterExpression.match('name', /f/).ne('name', 'four'),
					filterExpression.gt('id', 1).eq('odd', true)
				));

				assert.deepEqual(filter(testData), [
					{ id: 3, name: 'three', odd: true },
					{ id: 5, name: 'five', odd: true }
				]);
			});
		});
	});
});
