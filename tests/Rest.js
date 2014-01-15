define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/request/registry',
	'dojo/when',
	'dojo/promise/all',
	'dstore/Rest',
	'dstore/SimpleQuery',
	'./mockRequest',
	'dojo/text!./data/node1.1',
	'dojo/text!./data/treeTestRoot'
], function(registerSuite, assert, declare, lang, request, when, whenAll, Rest, SimpleQuery, mockRequest, nodeData_1_1, treeTestRootData){
	function runHeaderTest(method, args){
		return store[method].apply(store, args).then(function(result){
			mockRequest.assertRequestHeaders(requestHeaders);
			mockRequest.assertRequestHeaders(globalHeaders);
		});
	}

	function runCollectionTest(collection, expected){
		var expectedResults = [
			{ id: 1, name: 'one' },
			{ id: 2, name: 'two' }
		];
		mockRequest.setResponseText(collection.stringify(expectedResults));
		return when(collection.fetch()).then(function(results){
			expected.headers && mockRequest.assertRequestHeaders(expected.headers);
			expected.queryParams && mockRequest.assertQueryParams(expected.queryParams);

			// We cannot just assert deepEqual with results and expectedResults
			// because the store converts results into model instances with additional members.
			assert.strictEqual(results.length, expectedResults.length);
			for(var i = 0; i < results.length; ++i){
				var result = results[i],
					expectedResult = expectedResults[i];
				for(var key in expectedResult){
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

	registerSuite({
		name: 'dstore Rest',

		before: function(){
			registryHandle = request.register(/.*mockRequest.*/, mockRequest);
		},

		after: function(){
			registryHandle.remove();
		},

		beforeEach: function(){
			mockRequest.setResponseText('{}');
			mockRequest.setResponseHeaders({});
			store = new Rest({
				target: '/mockRequest/',
				headers: globalHeaders
			});
			store.model.prototype.describe = function(){
				return 'name is ' + this.name;
			};
		},

		'get': function(){
			mockRequest.setResponseText(nodeData_1_1);

			return store.get('data/node1.1').then(function(object){
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
			});
		},

		'query': function(){
			mockRequest.setResponseText(treeTestRootData);

			var first = true;
			return when(store.filter('data/treeTestRoot').fetch()).then(function(results){
				var object = results[0];
				assert.strictEqual(object.name, 'node1');
				assert.strictEqual(object.describe(), 'name is node1');
				assert.strictEqual(object.someProperty, 'somePropertyA');
			});
		},

		'query iterative': function(){
			mockRequest.setResponseText(treeTestRootData);

			var i = 0;
			return store.filter('data/treeTestRoot').forEach(function(object){
				i++;
				assert.strictEqual(object.name, 'node' + i);
				// the intrinsic methods
				assert.equal(typeof object.save, 'function');
				assert.equal(typeof object.remove, 'function');
				// the method we added
				assert.equal(typeof object.describe, 'function');
			});
		},

		'headers get 1': function(){
			return runHeaderTest('get', [ 'mockRequest/1', requestHeaders ]);
		},

		'headers get 2': function(){
			return runHeaderTest('get', [ 'mockRequest/2', { headers: requestHeaders } ]);
		},

		'headers remove': function(){
			return runHeaderTest('remove', [ 'mockRequest/3', { headers: requestHeaders } ]);
		},

		'headers put': function(){
			return runHeaderTest('put', [
				{},
				{
					id: 'mockRequest/4',
					headers: requestHeaders }
			]);
		},

		'headers add': function(){
			return runHeaderTest('add', [
				{},
				{
					id: 'mockRequest/5',
					headers: requestHeaders
				}
			]);
		},

		'put object without ID': function(){
			var objectWithoutId = { name: 'one' };
			mockRequest.setResponseText(store.stringify(objectWithoutId));
			return store.put(objectWithoutId).then(function(){
				mockRequest.assertHttpMethod('POST');
			});
		},

		'put object with ID': function(){
			var objectWithId = { id: 1, name: 'one' };
			mockRequest.setResponseText(store.stringify(objectWithId));
			return store.put(objectWithId).then(function(){
				mockRequest.assertHttpMethod('PUT');
			});
		},

		'get and save': function(){
			var expectedObject = { id: 1, name: 'one' };
			mockRequest.setResponseText(store.stringify(expectedObject));
			return store.get('anything').then(function(object){
				expectedObject.saved = true;
				mockRequest.setResponseText(store.stringify(expectedObject));
				object.save().then(function(result){
					assert.deepEqual(store.stringify(result), store.stringify(expectedObject));
				});
			});
		},

		'filter': function(){
			var filter = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
			return runCollectionTest(store.filter(filter), { queryParams: filter });
		},

		'sort': function(){
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

		'sort with this.sortParam': function(){
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

		'sort with different prefixes': function(){
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

		'range': function(){
			var rangeCollection = store.range(15, 25);
			return runCollectionTest(rangeCollection, {
				headers: {
					Range: 'items=15-24'
				}
			});
		},

		'range without end': function(){
			var rangeCollection = store.range(15);
			return runCollectionTest(rangeCollection, {
				headers: {
					Range: 'items=15-'
				}
			});
		},

		'filter+sort+range': function(){
			var filter = { prop1: 'Prop1Value', prop2: 'Prop2Value' };
			var collection = store.filter(filter).sort('prop1').range(15, 25);
			return runCollectionTest(collection, {
				headers: {
					Range: 'items=15-24'
				},
				queryParams: lang.mixin({}, filter, { 'sort(+prop1)': '' })
			});
		},

		'composition with SimpleQuery': function(){
			var RestWithSimpleQuery = declare([ Rest, SimpleQuery ], {
				target: '/mockRequest/'
			});

			var store = new RestWithSimpleQuery(),
				expectedResults = [
					{ id: 1, name: 'one', odd: true },
					{ id: 2, name: 'two', odd: false },
					{ id: 3, name: 'three', odd: true }
				];
			mockRequest.setResponseText(store.stringify(expectedResults));
			var filter = { odd: true },
				filteredCollection = store.filter(filter),
				sortedCollection,
				rangeCollection;
			return when(filteredCollection.fetch()).then(function(results){
				mockRequest.assertQueryParams(filter);
				assert.strictEqual(results.length, expectedResults.length);

				assert.property(filteredCollection, 'queryer');

				var filteredResults = filteredCollection.queryer(expectedResults);
				assert.equal(filteredResults.length, 2);
				assert.deepEqual(filteredResults[0], expectedResults[0]);
				assert.deepEqual(filteredResults[1], expectedResults[2]);

				sortedCollection = filteredCollection.sort('id', true);
				return sortedCollection.fetch();
			}).then(function(results){
				mockRequest.assertQueryParams({ 'sort(-id)': '' });
				assert.strictEqual(results.length, expectedResults.length);

				var sortedFilteredResults = sortedCollection.queryer(expectedResults);
				assert.equal(sortedFilteredResults.length, 2);
				assert.deepEqual(sortedFilteredResults[0], expectedResults[2]);
				assert.deepEqual(sortedFilteredResults[1], expectedResults[0]);

				rangeCollection = sortedCollection.range(15, 25);
				return rangeCollection.fetch();
			}).then(function(results){
				mockRequest.assertRequestHeaders({ Range: 'items=15-24' });
				assert.strictEqual(results.length, expectedResults.length);
			});
		}
	});
});
