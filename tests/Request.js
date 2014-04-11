define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/json',
	'dojo/request/registry',
	'dojo/when',
	'dojo/promise/all',
	'dstore/Request',
	'dstore/simpleQueryEngine',
	'./mockRequest',
	'dojo/text!./data/treeTestRoot'

], function (
	registerSuite,
	assert,
	declare,
	lang,
	JSON,
	request,
	when,
	whenAll,
	Request,
	simpleQueryEngine,
	mockRequest,
	treeTestRootData
) {

	function runHeaderTest(method, args) {
		return store[method].apply(store, args).then(function () {
			mockRequest.assertRequestHeaders(requestHeaders);
			mockRequest.assertRequestHeaders(globalHeaders);
		});
	}

	function runCollectionTest(collection, expected) {
		var expectedResults = [
			{ id: 1, name: 'one' },
			{ id: 2, name: 'two' }
		];
		mockRequest.setResponseText(JSON.stringify(expectedResults));
		return when(collection.fetch()).then(function (results) {
			expected.headers && mockRequest.assertRequestHeaders(expected.headers);
			expected.queryParams && mockRequest.assertQueryParams(expected.queryParams);

			// We cannot just assert deepEqual with results and expectedResults
			// because the store converts results into model instances with additional members.
			assert.strictEqual(results.length, expectedResults.length);
			for(var i = 0; i < results.length; ++i) {
				var result = results[i],
					expectedResult = expectedResults[i];
				for(var key in expectedResult) {
					assert.strictEqual(result[key], expectedResult[key]);
				}
			}
		});
	}

	var globalHeaders = {

		'test-global-header-a': 'true',
		'test-global-header-b': 'yes'
	};
	var requestHeaders = {
		'test-local-header-a': 'true',
		'test-local-header-b': 'yes',
		'test-override': 'overridden'
	};
	var store;

	var registryHandle;
	function createRequestTests (Store) {
		return {
			name: 'dstore Request',

			before: function () {
				registryHandle = request.register(/.*mockRequest.*/, mockRequest);
			},

			after: function () {
				registryHandle.remove();
			},

			beforeEach: function () {
				mockRequest.setResponseText('{}');
				mockRequest.setResponseHeaders({});
				store = new Store({
					target: '/mockRequest/',
					headers: globalHeaders
				});
				store.model.prototype.describe = function () {
					return 'name is ' + this.name;
				};
				createRequestTests.store = store;
			},

			'filter': function () {
				mockRequest.setResponseText(treeTestRootData);

				return when(store.filter('data/treeTestRoot').fetch()).then(function (results) {
					var object = results[0];
					assert.strictEqual(object.name, 'node1');
					assert.strictEqual(object.describe(), 'name is node1');
					assert.strictEqual(object.someProperty, 'somePropertyA');
				});
			},

			'filter iterative': function () {
				mockRequest.setResponseText(treeTestRootData);

				var i = 0;
				return store.filter('data/treeTestRoot').forEach(function (object) {
					i++;
					assert.strictEqual(object.name, 'node' + i);
					// the intrinsic methods
					assert.equal(typeof object.save, 'function');
					assert.equal(typeof object.remove, 'function');
					// the method we added
					assert.equal(typeof object.describe, 'function');
				});
			},

			'filter object': function () {
				var filter = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
				return runCollectionTest(store.filter(filter), { queryParams: filter });
			},

			'sort': function () {
				var sortedCollection = store.sort({
					property: 'prop1',
					descending: true
				}, {
					property: 'prop2'
				}, {
					property: 'prop3',
					descending: true
				});
				return runCollectionTest(sortedCollection, {
					queryParams: {
						'sort(-prop1,+prop2,-prop3)': ''
					}
				});
			},

			'sort with this.sortParam': function () {
				store.sortParam = 'sort-param';

				var sortedCollection = store.sort({
					property: 'prop1',
					descending: true
				}, {
					property: 'prop2'
				}, {
					property: 'prop3',
					descending: true
				});
				return runCollectionTest(sortedCollection, {
					queryParams: {
						'sort-param': '-prop1,+prop2,-prop3'
					}
				});
			},

			'sort with different prefixes': function () {
				store.descendingPrefix = '--';
				store.ascendingPrefix = '++';

				var sortedCollection = store.sort({
					property: 'prop1',
					descending: true
				}, {
					property: 'prop2'
				}, {
					property: 'prop3',
					descending: true
				});
				return runCollectionTest(sortedCollection, {
					queryParams: {
						'sort(--prop1,++prop2,--prop3)': ''
					}
				});
			},

			'range': function () {
				var rangeCollection = store.range(15, 25);
				return runCollectionTest(rangeCollection, {
					queryParams: {
						'limit(10,15)': ''
					}
				});
			},
			'range with rangeParam': function () {
				store.rangeStartParam = 'start';
				store.rangeCountParam = 'count';
				var rangeCollection = store.range(15, 25);
				return runCollectionTest(rangeCollection, {
					queryParams: {
						'start': '15',
						'count': '10'
					}
				});
			},
			'range with headers': function () {
				store.useRangeHeaders = true;
				var rangeCollection = store.range(15, 25);
				return runCollectionTest(rangeCollection, {
					headers: {
						'Range': 'items=15-24'
					}
				});
			},

			'range with headers without end': function () {
				store.useRangeHeaders = true;
				var rangeCollection = store.range(15);
				return runCollectionTest(rangeCollection, {
					headers: {
						'Range': 'items=15-Infinity'
					}
				});
			},

			'filter+sort+range': function () {
				var filter = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
				var collection = store.filter(filter).sort('prop1').range(15, 25);
				return runCollectionTest(collection, {
					queryParams: lang.mixin({}, filter, {
						'limit(10,15)': '',
						'sort(+prop1)': ''
					})
				});
			},

			'composition with client-side query engine': function () {
				var RestWithSimpleQueryEngine = declare(Store, {
					target: '/mockRequest/',
					queryEngine: simpleQueryEngine
				});

				var store = new RestWithSimpleQueryEngine(),
					expectedResults = [
						{ id: 1, name: 'one', odd: true },
						{ id: 2, name: 'two', odd: false },
						{ id: 3, name: 'three', odd: true }
					];
				mockRequest.setResponseText(JSON.stringify(expectedResults));
				var filter = { odd: true },
					filteredCollection = store.filter(filter),
					sortedCollection,
					rangeCollection,
					getTopQueryLogEntry = function (collection) {
						var queryLog = collection.queryLog;
						return queryLog[queryLog.length - 1];
					},
					queryer;

				assert.strictEqual(filteredCollection.queryLog.length, 1);
				return when(filteredCollection.fetch()).then(function (results) {
					mockRequest.assertQueryParams(filter);
					assert.strictEqual(results.length, expectedResults.length);

					var queryLogEntry = getTopQueryLogEntry(filteredCollection);
					assert.property(queryLogEntry, 'queryer');
					queryer = queryLogEntry.queryer;

					var filteredResults = queryer(expectedResults);
					assert.equal(filteredResults.length, 2);
					assert.deepEqual(filteredResults[0], expectedResults[0]);
					assert.deepEqual(filteredResults[1], expectedResults[2]);

					sortedCollection = filteredCollection.sort('id', true);
					assert.strictEqual(sortedCollection.queryLog.length, 2);

					return sortedCollection.fetch();
				}).then(function (results) {
					mockRequest.assertQueryParams({ 'sort(-id)': '' });
					assert.strictEqual(results.length, expectedResults.length);

					var queryLogEntry = getTopQueryLogEntry(sortedCollection);
					assert.property(queryLogEntry, 'queryer');
					queryer = (function () {
						var existingQueryer = queryer,
							newQueryer = queryLogEntry.queryer;
						return function (data) {
							return newQueryer(existingQueryer(data));
						};
					})();

					var sortedFilteredResults = queryer(expectedResults);
					assert.equal(sortedFilteredResults.length, 2);
					assert.deepEqual(sortedFilteredResults[0], expectedResults[2]);
					assert.deepEqual(sortedFilteredResults[1], expectedResults[0]);

					rangeCollection = sortedCollection.range(0, 25);
					assert.strictEqual(rangeCollection.queryLog.length, 3);

					return rangeCollection.fetch();
				}).then(function (results) {
					mockRequest.assertQueryParams({
						'sort(-id)': '',
						'limit(25)': ''
					});
					assert.strictEqual(results.length, expectedResults.length);
				});
			}
		};
	}
	registerSuite(createRequestTests(Request));
	return createRequestTests;
});
