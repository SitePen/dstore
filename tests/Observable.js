define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/array',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/Observable'
], function(registerSuite, assert, array, declare, lang, Memory, Observable){

	var MyStore = declare([Memory, Observable], {
		get: function(){
			// need to make sure that this.inherited still works with Observable
			return this.inherited(arguments);
		}
	});
	var store = new MyStore({
		data: [
			{id: 0, name: 'zero', even: true, prime: false},
			{id: 1, name: 'one', prime: false},
			{id: 2, name: 'two', even: true, prime: true},
			{id: 3, name: 'three', prime: true},
			{id: 4, name: 'four', even: true, prime: false},
			{id: 5, name: 'five', prime: true}
		]
	});
	var data = [];
	var i;
	for(i = 1; i <= 100; i++){
		data.push({id: i, name: 'item ' + i, order: i});
	}
	var bigStore = new MyStore({data: data});

	registerSuite({
		name: 'dstore Observable',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'query': function(){
			var results = store.filter({prime: true});
			assert.strictEqual(results.data.length, 3);
			var changes = [], secondChanges = [];
			var observer = results.observe(function(removeFrom, count, add){
				var change = {removeFrom:removeFrom, count:count};
				if(add){
					change.add = add;
				}
				changes.push(change);
			});
			var secondObserver = results.observe(function(removeFrom, count, add){
				var change = {removeFrom:removeFrom, count:count};
				if(add){
					change.add = add;
				}
				secondChanges.push(change);
			});
			var expectedChanges = [],
				expectedSecondChanges = [];
			var two = results.data[0];
			two.prime = false;
			store.put(two); // should remove it from the array
			assert.strictEqual(observer.data.length, 2);
			expectedChanges.push({
					removeFrom: 0,
					count: 1,
			});
			expectedSecondChanges.push(expectedChanges[expectedChanges.length - 1]);
			secondObserver.remove();
			var one = store.get(1);
			one.prime = true;
			store.put(one); // should add it
			expectedChanges.push({
					removeFrom: 2,
					count:0,
					add:{
						id: 1,
						name: "one",
						prime: true
					}
				});
			assert.strictEqual(observer.data.length, 3);
			store.add({// shouldn't be added
				id:6, name:"six"
			});
			assert.strictEqual(observer.data.length, 3);
			store.add({// should be added
				id:7, name:"seven", prime:true
			});
			assert.strictEqual(observer.data.length, 4);
			
			expectedChanges.push({
					removeFrom: 3,
					"count":0,
					"add":{
						id:7, name:"seven", prime:true
					}
				});
			store.remove(3);
			expectedChanges.push({
					"removeFrom":0,
					count: 1
				});
			assert.strictEqual(observer.data.length, 3);
			
			observer.remove(); // shouldn't get any more calls
			store.add({// should not be added
				id:11, name:"eleven", prime:true
			});

			assert.strictEqual(JSON.stringify(secondChanges), JSON.stringify(expectedSecondChanges));
			assert.strictEqual(JSON.stringify(changes), JSON.stringify(expectedChanges));
		},

		'query with zero id': function(){
			var results = store.filter({});
			assert.strictEqual(results.data.length, 8);
            var observer = results.observe(function(removeFrom, count, add){
                    // we only do puts so previous & new indices must always been the same
                    // unfortunately if id = 0, the removeFrom
                    console.log("called with: "+removeFrom+", "+count);
                    if(add){
                    	assert.strictEqual(removedIndex, removeFrom);
                    }else{
                    	removedIndex = removeFrom;	
                    }
            }, true);
			store.put({id: 5, name: '-FIVE-', prime: true});
			store.put({id: 0, name: '-ZERO-', prime: false});
		},

		'paging': function(){
			var results, opts = {count: 25, sort: [{attribute: "order"}]};
			bigFiltered = bigStore.filter({}).sort('order');
			/*results = window.results = [
			    bigFiltered.range(0,25).forEach(function(){}),
			    bigFiltered.range(25,50).forEach(function(){}),
			    bigFiltered.range(50,75).forEach(function(){}),
			    bigFiltered.range(75,100).forEach(function(){})
			];*/
			var results = bigFiltered.data;
			var observations = [];
			bigFiltered.observe(function(obj, from, to){
		    	observations.push({from: from, to: to});
		        console.log(i, " observed: ", obj, from, to);
			});
			bigStore.add({id: 101, name: 'one oh one', order: 2.5});
			assert.strictEqual(results[0].length, 26);
			assert.strictEqual(results[1].length, 25);
			assert.strictEqual(results[2].length, 25);
			assert.strictEqual(results[3].length, 25);
			assert.strictEqual(observations.length, 1);
			bigStore.remove(101);
			assert.strictEqual(observations.length, 2);
			assert.strictEqual(results[0].length, 25);
			bigStore.add({id: 102, name: 'one oh two', order: 26.5});
			assert.strictEqual(results[0].length, 25);
			assert.strictEqual(results[1].length, 26);
			assert.strictEqual(results[2].length, 25);
			assert.strictEqual(observations.length, 3);
		},

		'type': function(){
			assert.isFalse(store === store.observe(function(){}));
		}
	});
});
