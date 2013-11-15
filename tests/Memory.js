define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Memory'
], function(registerSuite, assert, declare, Memory){

	var store = new Memory({
		data: [
			{id: 1, name: 'one', prime: false, mappedTo: 'E'},
			{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'},
			{id: 3, name: 'three', prime: true, mappedTo: 'C'},
			{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
			{id: 5, name: 'five', prime: true, mappedTo: 'A'}
		]
	});
	// add a method to the model prototype
	store.model.prototype.describe = function(){
		return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
	};

	registerSuite({
		name: 'dstore Memory',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'model': function(){
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			assert.strictEqual(store.filter({even: true}).data[1].describe(), 'four is not a prime');
		},

		'query': function(){
			assert.strictEqual(store.filter({prime: true}).data.length, 3);
			assert.strictEqual(store.filter({even: true}).data[1].name, 'four');
		},

		'query with string': function(){
			assert.strictEqual(store.filter({name: 'two'}).data.length, 1);
			assert.strictEqual(store.filter({name: 'two'}).data[0].name, 'two');
		},

		'query with regexp': function(){
			assert.strictEqual(store.filter({name: /^t/}).data.length, 2);
			assert.strictEqual(store.filter({name: /^t/}).data[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).data.length, 1);
			assert.strictEqual(store.filter({name: /o/}).data.length, 3);
		},

		'query with test function': function(){
			assert.strictEqual(store.filter({id: {test: function(id){
				return id < 4;
			}}}).data.length, 3);
			assert.strictEqual(store.filter({even: {test: function(even, object){
				return even && object.id > 2;
			}}}).data.length, 1);
		},

		'query with sort': function(){
			assert.strictEqual(store.filter({prime: true}).sort('name').data.length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').data[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function(a, b){
				return a.name < b.name ? -1 : 1;
			}).data[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').data[4].name, 'four');
		},

		'query with paging': function(){
			assert.strictEqual(store.filter({prime: true}).range(1, 2).data.length, 1);
			assert.strictEqual(store.filter({even: true}).range(1, 2).data[0].name, 'four');
		},

		'put update': function(){
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},

		save: function(){
			var four = store.get(4);
			four.square = true;
			four.save();
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

		'add duplicate': function(){
			var threw;
			try{
				store.add({
					id: 6,
					perfect: true
				});
			}catch(e){
				threw = true;
			}
			assert.isTrue(threw);
		},

		'add new': function(){
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.get(7).prime);
		},

		'remove': function(){
			assert.isTrue(store.remove(7));
			assert.strictEqual(store.get(7), undefined);
		},

		'remove from object': function(){
			var newObject = store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(newObject.remove());
			assert.strictEqual(store.get(7), undefined);
		},

		'remove missing': function(){
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.get(1).id, 1);
		},

		'query after changes': function(){
			assert.strictEqual(store.filter({prime: true}).data.length, 3);
			assert.strictEqual(store.filter({perfect: true}).data.length, 1);
		},

		'ifrs style data': function(){
			var anotherStore = new Memory({
				data: {

					items: [
						{name: 'one', prime: false},
						{name: 'two', even: true, prime: true},
						{name: 'three', prime: true}
					],
					identifier: 'name'
				}
			});
			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.filter({name: 'one'}).data[0].name, 'one');
		},

		'add new id assignment': function(){
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		}
	});
});
