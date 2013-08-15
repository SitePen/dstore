define([
	'intern!object',
	'intern/chai!assert',
	'dstore/DataStore',
	'dojo/data/ItemFileReadStore',
	'dojo/data/ItemFileWriteStore'
], function(registerSuite, assert, DataStore, ItemFileReadStore, ItemFileWriteStore){

	var two = {id: 2, name: 'two', even: true, prime: true};
	var four = {id: 4, name: 'four', even: true, prime: false};

	var dataStore = new ItemFileWriteStore({data: {
		items: [
			{id: 1, name: 'one', prime: false},
			{id: 2, name: 'two', even: true, prime: true},
			{id: 3, name: 'three', prime: true},
			{id: 4, name: 'four', even: true, prime: false},
			{id: 5, name: 'five', prime: true,
				children: [
					{_reference: 1},
					{_reference: 2},
					{_reference: 3}
				]}
		],
		identifier: 'id'
	}});
	dataStore.fetchItemByIdentity({identity: null});

	var store = new DataStore({store: dataStore});
	registerSuite({
		name: 'dstore DataStore',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
			assert.strictEqual(store.get(5).children[1].name, 'two');
		},

		'query 1': function(){
			var d = this.async();
			store.query({prime: true}).then(d.callback(function(results){
				assert.strictEqual(results.length, 3);
				assert.strictEqual(results[2].children[2].name, 'three');
			}));
		},

		'query 2': function(){
			var d = this.async();
			var result = store.query({even: true});
			result.map(d.rejectOnError(function(object){
				for(var i in object){
					assert.strictEqual(object[i], (object.id === 2 ? two : four)[i], 'map of ' + i);
				}
			}));
			result.then(d.callback(function(results){
				assert.strictEqual('four', results[1].name, 'then');
			}));
		},

		'put update': function(){
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},

		'put new': function(){
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
		},

		'no write feature': function(){
			var readOnlyStore = new DataStore({store: new ItemFileReadStore({})});
			assert(!readOnlyStore.put);
		}
	});
});
